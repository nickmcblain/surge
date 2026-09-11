import type { AppConfig, OnboardingProgress } from "../../types/config";

export function getOnboardingProgress(config: AppConfig): OnboardingProgress {
  return config.onboardingProgress ?? { version: 1, stage: "welcome" };
}

export function withOnboardingProgress(
  config: AppConfig,
  patch: Partial<OnboardingProgress> & Pick<OnboardingProgress, "stage">,
): AppConfig {
  return {
    ...config,
    onboardingComplete: false,
    onboardingProgress: {
      ...getOnboardingProgress(config),
      ...patch,
      version: 1,
    },
  };
}
