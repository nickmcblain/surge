import type { PaneFooterSegment } from "../../../../../components";
import { usePaneStatusLinkFooter } from "../../../shared/pane-footer";

interface NewsFooterArticle {
  title?: string | null;
  summary?: string | null;
  source?: string | null;
  url?: string | null;
  items?: Array<{ title?: string | null; summary?: string | null }>;
}

interface UseNewsArticleFooterOptions {
  registrationId: string;
  focused: boolean;
  article: NewsFooterArticle | null | undefined;
  info?: PaneFooterSegment[];
  loading?: boolean;
  error?: string | null;
}

export function useNewsArticleFooter({
  registrationId,
  focused,
  article,
  info,
  loading = false,
  error,
}: UseNewsArticleFooterOptions) {
  usePaneStatusLinkFooter({
    registrationId,
    focused,
    url: article?.url,
    source: article?.source,
    info: info ?? [],
    showOpenHint: true,
    loading,
    error,
  });
}
