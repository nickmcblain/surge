import { useCallback, useRef, useState } from "react";
import { saveConfigImmediately } from "../../state/config-save-scheduler";
import { type AppConfig, findPaneInstance, type OnboardingProgress } from "../../types/config";
import { useShortcut } from "../../react/input";
import { useAppDispatch, useAppSelector, useAppStateRef } from "../../state/app/context";
import { Text, useUiHost } from "../../ui";
import { useThemeColors } from "../../theme/theme-context";
import { t } from "../../i18n";
import { useAppLanguage } from "../../i18n/react";
import {
  OnboardingActions,
  OnboardingButton,
  OnboardingHeader,
  OnboardingModal,
  OnboardingTitle,
} from "./onboarding-frame";
import { getOnboardingProgress, withOnboardingProgress } from "./wizard-model";

interface OnboardingWizardProps {
  onComplete: (config: AppConfig) => void | Promise<void>;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  useAppLanguage();
  const colors = useThemeColors();
  const desktop = useUiHost().kind === "desktop-web";
  const dispatch = useAppDispatch();
  const stateRef = useAppStateRef();
  const config = useAppSelector((state) => state.config);
  const commandBarOpen = useAppSelector((state) => state.commandBarOpen);
  const focusedPaneId = useAppSelector((state) => state.focusedPaneId);
  const progress = getOnboardingProgress(config);
  // Stages that belonged to the retired portfolio/account flow collapse to "ready".
  const stage = progress.stage === "welcome" ? "welcome" : "ready";
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const progressSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const finishingRef = useRef(false);

  const persistProgress = useCallback(async (
    patch: Partial<OnboardingProgress> & Pick<OnboardingProgress, "stage">,
  ): Promise<AppConfig> => {
    if (finishingRef.current) return stateRef.current.config;
    setPersistenceError(null);
    const operation = progressSaveQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (finishingRef.current) return stateRef.current.config;
        const nextConfig = withOnboardingProgress(stateRef.current.config, patch);
        try {
          await saveConfigImmediately(nextConfig);
          dispatch({
            type: "SET_ONBOARDING_STATE",
            complete: false,
            progress: nextConfig.onboardingProgress,
          });
          return nextConfig;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setPersistenceError(message || t("Unable to save onboarding progress."));
          throw error;
        }
      });
    progressSaveQueueRef.current = operation.then(() => {}, () => {});
    return operation;
  }, [dispatch, stateRef]);

  const advanceToReady = useCallback(() => {
    void persistProgress({ stage: "ready" }).catch(() => {});
  }, [persistProgress]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinishing(true);
    setPersistenceError(null);
    try {
      await progressSaveQueueRef.current.catch(() => {});
      const nextConfig: AppConfig = {
        ...stateRef.current.config,
        onboardingComplete: true,
        onboardingProgress: undefined,
      };
      await saveConfigImmediately(nextConfig);
      dispatch({
        type: "SET_ONBOARDING_STATE",
        complete: true,
        progress: undefined,
      });
      await Promise.resolve(onComplete(nextConfig));
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : String(error));
      finishingRef.current = false;
      setIsFinishing(false);
    }
  }, [dispatch, onComplete, stateRef]);

  const focusedInstance = focusedPaneId ? findPaneInstance(config.layout, focusedPaneId) : null;
  const helpFocused = focusedInstance?.paneId === "help";

  useShortcut((event) => {
    if (helpFocused || commandBarOpen) return;
    const name = event.name ?? event.key ?? "";
    const enter = name === "enter" || name === "return";
    const consume = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    if (name === "f10" || name === "escape") {
      consume();
      void finish();
      return;
    }
    if (!enter) return;
    consume();
    if (stage === "welcome") advanceToReady();
    else void finish();
  }, { phase: "before", allowEditable: true });

  if (helpFocused) return null;

  const errorText = persistenceError ? (
    <Text fg={colors.negative} wrapText style={desktop ? { marginTop: 10 } : undefined}>
      {persistenceError}
    </Text>
  ) : null;

  if (stage === "welcome") {
    return (
      <OnboardingModal width={64} height={12}>
        <OnboardingHeader onDismiss={() => { void finish(); }} dismissing={isFinishing} />
        <OnboardingTitle
          step={t("WELCOME")}
          title={t("Make Gloomberb yours")}
          description={t("Open panes from the command bar, arrange them into a layout, and save it for next time.")}
        />
        {errorText}
        <OnboardingActions>
          <OnboardingButton label="Continue" variant="primary" onPress={advanceToReady} />
        </OnboardingActions>
      </OnboardingModal>
    );
  }

  return (
    <OnboardingModal width={66} height={12}>
      <OnboardingHeader onDismiss={() => { void finish(); }} dismissing={isFinishing} />
      <OnboardingTitle
        step={t("READY")}
        title={t("Your workspace is ready")}
        description={t("Your local workspace is ready. Press Ctrl+K to open the command bar.")}
      />
      {errorText}
      <OnboardingActions>
        <OnboardingButton
          label="Back"
          variant="ghost"
          onPress={() => { void persistProgress({ stage: "welcome" }).catch(() => {}); }}
        />
        <OnboardingButton
          label={isFinishing ? "Opening workspace..." : "Start exploring"}
          variant="primary"
          disabled={isFinishing}
          onPress={() => { void finish(); }}
        />
      </OnboardingActions>
    </OnboardingModal>
  );
}
