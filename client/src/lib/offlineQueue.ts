import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/firebase";
import type {
  OfflineQueueSummary,
  QueuedOfflineOperation,
  QueuedOfflineOperationKind,
} from "@shared/offline-queue/types";

const DB_NAME = "dims-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "operations";
const SUMMARY_KEY = "hydrosafe:offline-queue-summary";
const LEGACY_QUEUE_KEY = "hydrosafe:offline-queue";

function createId(prefix = "queue"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available; offline queue cannot persist records."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const database = await openQueueDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);

    transaction.oncomplete = () => {
      database.close();
      resolve(request ? request.result : undefined);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function pathSegments(path: string): [string, ...string[]] {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Firestore collection path is required for queued operation.");
  }
  return [parts[0], ...parts.slice(1)];
}

function readPreviousSummary(): Partial<OfflineQueueSummary> {
  if (typeof localStorage === "undefined") return {};
  try {
    const previousRaw = localStorage.getItem(SUMMARY_KEY);
    return previousRaw ? JSON.parse(previousRaw) as Partial<OfflineQueueSummary> : {};
  } catch {
    return {};
  }
}

function publishQueueChange(summary: OfflineQueueSummary) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hydrosafe:field-mode-change"));
  window.dispatchEvent(new CustomEvent("hydrosafe:offline-queue-change", { detail: summary }));
}

export async function listQueuedOperations(): Promise<QueuedOfflineOperation[]> {
  const operations = await withStore<QueuedOfflineOperation[]>("readonly", (store) => store.getAll());
  return operations ?? [];
}

export async function updateOfflineQueueSummary(
  patch: Partial<OfflineQueueSummary> = {}
): Promise<OfflineQueueSummary> {
  const operations = await listQueuedOperations();
  const previous = readPreviousSummary();
  const summary: OfflineQueueSummary = {
    queuedRecords: operations.length,
    replaying: false,
    ...previous,
    ...patch,
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
    localStorage.setItem(LEGACY_QUEUE_KEY, JSON.stringify(operations.map((operation) => operation.id)));
  }
  publishQueueChange(summary);
  return summary;
}

export async function enqueueQueuedOperation(
  operation: Omit<QueuedOfflineOperation, "id" | "createdAt" | "updatedAt" | "attempts">
): Promise<QueuedOfflineOperation> {
  const now = new Date().toISOString();
  const queued: QueuedOfflineOperation = {
    ...operation,
    id: createId(operation.kind),
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
  await withStore("readwrite", (store) => store.put(queued));
  await updateOfflineQueueSummary();
  return queued;
}

export async function removeQueuedOperation(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
  await updateOfflineQueueSummary();
}

async function markQueuedOperationFailed(
  operation: QueuedOfflineOperation,
  error: unknown
): Promise<void> {
  const updated: QueuedOfflineOperation = {
    ...operation,
    attempts: operation.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: error instanceof Error ? error.message : String(error),
  };
  await withStore("readwrite", (store) => store.put(updated));
}

type OperationWriter = (operation: QueuedOfflineOperation) => Promise<void>;

async function writeOperation(operation: QueuedOfflineOperation): Promise<void> {
  const segments = pathSegments(operation.collectionPath);
  if (operation.docId) {
    await setDoc(doc(db, ...segments, operation.docId), operation.data, { merge: true });
    return;
  }
  await addDoc(collection(db, ...segments), operation.data);
}

let operationWriter: OperationWriter = writeOperation;

export function setOfflineQueueWriterForTests(writer?: OperationWriter): void {
  operationWriter = writer ?? writeOperation;
}

export async function replayQueuedOperations(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await updateOfflineQueueSummary({ replaying: false });
    return;
  }

  await updateOfflineQueueSummary({ replaying: true, lastError: undefined });
  const operations = await listQueuedOperations();
  for (const operation of operations) {
    try {
      await operationWriter(operation);
      await removeQueuedOperation(operation.id);
    } catch (error) {
      await markQueuedOperationFailed(operation, error);
      await updateOfflineQueueSummary({
        replaying: false,
        lastReplayAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }
  await updateOfflineQueueSummary({
    replaying: false,
    lastReplayAt: new Date().toISOString(),
    lastError: undefined,
  });
}

export async function writeOrQueueFirestoreDoc(options: {
  kind: QueuedOfflineOperationKind;
  collectionPath: string;
  data: Record<string, unknown>;
  docId?: string;
}): Promise<{ queued: boolean; queuedOperation?: QueuedOfflineOperation }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queuedOperation = await enqueueQueuedOperation(options);
    return { queued: true, queuedOperation };
  }

  try {
    await operationWriter({
      ...options,
      id: createId("direct-write"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    });
    return { queued: false };
  } catch (error) {
    const queuedOperation = await enqueueQueuedOperation({
      ...options,
      lastError: error instanceof Error ? error.message : String(error),
    });
    return { queued: true, queuedOperation };
  }
}

export function useOfflineQueueReplay() {
  useEffect(() => {
    updateOfflineQueueSummary().catch((error) => {
      console.warn("Offline queue summary unavailable:", error);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hydrosafe:offline-fail", {
          detail: error instanceof Error ? error.message : String(error),
        }));
      }
    });
    replayQueuedOperations().catch(console.warn);

    const handleOnline = () => {
      replayQueuedOperations().catch(console.warn);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
