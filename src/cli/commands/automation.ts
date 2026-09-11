import { createRssNewsCapability } from "../../plugins/builtin/news/wire/rss/source";
import type { CliCommandDef } from "../../types/plugin";
import { requireArg, takeOption } from "./command-utils";

export const rssCliCommand: CliCommandDef = {
  name: "rss",
  description: "Fetch an RSS feed as news rows",
  help: { usage: ["rss fetch <url> [--name label]"] },
  execute: async (args, ctx) => {
    const action = args[0] ?? "fetch";
    if (action !== "fetch") ctx.fail("Usage: surge rss fetch <url> [--name label]");
    const rawArgs = args.slice(1);
    const name = takeOption(rawArgs, "--name") ?? "RSS";
    const url = requireArg(rawArgs[0], "Usage: surge rss fetch <url> [--name label]", ctx);
    const capability = createRssNewsCapability([{
      id: "cli-feed",
      url,
      name,
      category: "cli",
      authority: 50,
      enabled: true,
    }]);
    const articles = await capability.provider.fetchNews({ feed: "latest", limit: ctx.cliOptions.limit ?? 20 });
    ctx.printResult({ data: articles.map((article) => ({
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt.toISOString(),
      url: article.url,
      summary: article.summary ?? "",
    })) });
  },
};
