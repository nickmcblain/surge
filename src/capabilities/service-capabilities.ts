import type { BrokerConnectionStatus } from "../types/broker";
import type { QuoteSubscriptionTarget } from "../types/data-provider";
import type { Quote } from "../types/financials";

export const BROKER_CAPABILITY_ID = "broker.core";
export const NOTES_FILES_CAPABILITY_ID = "notes.files";

export type BrokerStatusEvent = {
  kind: "status";
  instanceId: string;
  status: BrokerConnectionStatus;
};

export type BrokerQuoteEvent = {
  kind: "quote";
  target: QuoteSubscriptionTarget;
  quote: Quote;
};

export type BrokerRemoteEvent = BrokerStatusEvent | BrokerQuoteEvent;
