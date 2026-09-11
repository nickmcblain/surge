import {
  ConnectionHealthRegistry,
  SURGE_CLOUD_HTTP_CONNECTION_ID,
  SURGE_CLOUD_SOCKET_CONNECTION_ID,
  registerSurgeCloudConnectionSources,
} from "../../../core/connection-health";

export function createCliPaneShotConnectionHealth(now = Date.now()): ConnectionHealthRegistry {
  const health = new ConnectionHealthRegistry({ now: () => now });
  registerSurgeCloudConnectionSources(health);
  health.reportRequest(SURGE_CLOUD_HTTP_CONNECTION_ID, {
    operation: "GET /market/quotes",
    success: true,
    latencyMs: 84,
  });
  health.reportSocketState(SURGE_CLOUD_SOCKET_CONNECTION_ID, "open", "api.gloom.sh/cloud/ws");
  health.registerSource({
    id: "asset-data.yahoo",
    name: "Yahoo Finance",
    kind: "asset-data",
    ownerId: "market-data",
    priority: 20,
  });
  health.reportRequest("asset-data.yahoo", {
    operation: "getPriceHistory",
    success: false,
    latencyMs: 240,
    error: "Rate limited",
  });
  return health;
}
