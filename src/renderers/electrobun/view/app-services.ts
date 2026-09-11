import type { AppServicesFactoryOptions } from "../../../core/app-service-ports";
import { createAppRuntime } from "../../../core/app-runtime";
import { newsProvider } from "../../../capabilities";
import { createRemoteAssetDataClient } from "./remote/asset-data-client";
import { RemotePersistence } from "./remote/persistence";
import { RemoteTickerRepository } from "./remote/ticker-repository";
import { connectBackendConnectionHealth } from "./remote/connection-health-backend";
import { backendRequest, getElectrobunBackendInitSnapshot } from "./backend-rpc";
import { createCapabilityInvoker } from "./remote/capability-invoker";

export function createElectrobunAppServices({ config, plugins }: AppServicesFactoryOptions) {
  const dataProvider = createRemoteAssetDataClient();
  const invokeCapability = createCapabilityInvoker({
    request: backendRequest,
    shouldApplyDeadline: () => false,
    timeoutMs: 0,
  });
  return createAppRuntime({
    config, plugins, dataProvider,
    persistence: new RemotePersistence(),
    tickerRepository: new RemoteTickerRepository(),
    registryOptions: {
      enableCapabilityHandlers: false,
      remoteCapabilityManifests: () => getElectrobunBackendInitSnapshot()?.capabilityManifests ?? [],
      remoteCapabilityInvoke: invokeCapability,
    },
    newsOptions: { pollIntervalMs: undefined },
    configure({ newsService }) {
      newsService.register(newsProvider({
        id: dataProvider.id,
        name: dataProvider.name,
        priority: 0,
        provider: {
          fetchNews: (query) => dataProvider.getNews(query),
          fetchNewsPage: async (query) => ({ articles: await dataProvider.getNews(query), nextCursor: null }),
        },
      }));
    },
    onReady: ({ pluginRegistry }) => connectBackendConnectionHealth(pluginRegistry.connectionHealth),
  });
}
