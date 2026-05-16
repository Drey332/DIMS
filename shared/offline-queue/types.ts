export type QueuedOfflineOperationKind =
  | "emergency_ack"
  | "emergency_submit"
  | "near_miss_submit"
  | "observation_submit";

export interface QueuedOfflineOperation {
  id: string;
  kind: QueuedOfflineOperationKind;
  collectionPath: string;
  docId?: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
}

export interface OfflineQueueSummary {
  queuedRecords: number;
  replaying: boolean;
  lastReplayAt?: string;
  lastError?: string;
}
