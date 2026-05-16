import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const DB_NAME = "dims-offline-queue";

type FakeOperation = {
  id: string;
  [key: string]: unknown;
};

function createStorage() {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
    get length() {
      return values.size;
    },
  } as Storage;
}

function createRequest<T>(result: T): IDBRequest<T> {
  return { result } as IDBRequest<T>;
}

function createFakeIndexedDb() {
  const records = new Map<string, FakeOperation>();

  function complete(transaction: IDBTransaction) {
    setTimeout(() => transaction.oncomplete?.(new Event("complete")), 0);
  }

  const database = {
    objectStoreNames: {
      contains: () => true,
    },
    createObjectStore: () => undefined,
    close: () => undefined,
    transaction: () => {
      let store: IDBObjectStore;
      const transaction = {
        onabort: null,
        oncomplete: null,
        onerror: null,
        error: null,
        objectStore: () => store,
      } as unknown as IDBTransaction;
      store = {
        getAll: () => {
          const request = createRequest(Array.from(records.values()));
          complete(transaction);
          return request;
        },
        put: (value: FakeOperation) => {
          records.set(value.id, value);
          const request = createRequest(value);
          complete(transaction);
          return request;
        },
        delete: (id: string) => {
          records.delete(id);
          const request = createRequest(undefined);
          complete(transaction);
          return request;
        },
      } as unknown as IDBObjectStore;

      return transaction;
    },
  } as IDBDatabase;

  return {
    open: () => {
      const request = {
        result: database,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        error: null,
      } as IDBOpenDBRequest;
      setTimeout(() => {
        request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        request.onsuccess?.(new Event("success"));
      }, 0);
      return request;
    },
    deleteDatabase: () => {
      records.clear();
      const request = {
        onblocked: null,
        onerror: null,
        onsuccess: null,
        error: null,
      } as IDBOpenDBRequest;
      setTimeout(() => request.onsuccess?.(new Event("success")), 0);
      return request;
    },
    records,
  };
}

function setOnline(online: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: online },
  });
}

async function setupBrowserGlobals() {
  const storage = createStorage();
  const fakeIndexedDb = createFakeIndexedDb();

  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: fakeIndexedDb,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: class TestCustomEvent extends Event {
      detail: unknown;

      constructor(type: string, init?: CustomEventInit) {
        super(type);
        this.detail = init?.detail;
      }
    },
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    },
  });
  setOnline(true);

  const queue = await import("./offlineQueue");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => undefined,
      dispatchEvent: () => true,
      localStorage: storage,
      removeEventListener: () => undefined,
    },
  });
  queue.setOfflineQueueWriterForTests(undefined);
  return queue;
}

beforeEach(async () => {
  const databaseFactory = (globalThis as typeof globalThis & { indexedDB?: IDBFactory }).indexedDB;
  const request = databaseFactory?.deleteDatabase?.(DB_NAME);
  if (request) {
    await new Promise<void>((resolve) => {
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }
});

describe("offline queue", () => {
  it("enqueues, lists, summarizes, and removes operations", async () => {
    const queue = await setupBrowserGlobals();

    const queued = await queue.enqueueQueuedOperation({
      kind: "emergency_ack",
      collectionPath: "emergencies/emergency-1/acks",
      docId: "user-1",
      data: { acknowledged: true },
    });

    assert.equal(queued.kind, "emergency_ack");
    assert.equal((await queue.listQueuedOperations()).length, 1);
    assert.deepEqual(JSON.parse(localStorage.getItem("hydrosafe:offline-queue-summary") ?? "{}"), {
      queuedRecords: 1,
      replaying: false,
    });

    await queue.removeQueuedOperation(queued.id);

    assert.equal((await queue.listQueuedOperations()).length, 0);
    assert.equal(JSON.parse(localStorage.getItem("hydrosafe:offline-queue-summary") ?? "{}").queuedRecords, 0);
  });

  it("queues Firestore writes while offline", async () => {
    const queue = await setupBrowserGlobals();
    let writes = 0;
    queue.setOfflineQueueWriterForTests(async () => {
      writes += 1;
    });
    setOnline(false);

    const result = await queue.writeOrQueueFirestoreDoc({
      kind: "observation_submit",
      collectionPath: "observations",
      docId: "observation-1",
      data: { observation: "offline report" },
    });

    assert.equal(result.queued, true);
    assert.equal(writes, 0);
    assert.equal((await queue.listQueuedOperations()).length, 1);
  });

  it("replays queued document writes and removes successful operations", async () => {
    const queue = await setupBrowserGlobals();
    const writtenPaths: string[] = [];
    queue.setOfflineQueueWriterForTests(async (operation) => {
      writtenPaths.push(`${operation.collectionPath}/${operation.docId ?? ""}`);
    });

    await queue.enqueueQueuedOperation({
      kind: "emergency_submit",
      collectionPath: "emergencies",
      docId: "emergency-1",
      data: { status: "ACTIVE" },
    });

    await queue.replayQueuedOperations();

    assert.deepEqual(writtenPaths, ["emergencies/emergency-1"]);
    assert.equal((await queue.listQueuedOperations()).length, 0);
  });

  it("queues once when an online Firestore write fails", async () => {
    const queue = await setupBrowserGlobals();
    queue.setOfflineQueueWriterForTests(async () => {
      throw new Error("network unavailable");
    });

    const result = await queue.writeOrQueueFirestoreDoc({
      kind: "emergency_ack",
      collectionPath: "emergencies/emergency-1/acks",
      docId: "user-1",
      data: { acknowledgedAt: "2026-05-15T10:00:00.000Z" },
    });

    const operations = await queue.listQueuedOperations();
    assert.equal(result.queued, true);
    assert.equal(operations.length, 1);
    assert.match(operations[0].lastError ?? "", /network unavailable/);
  });
});
