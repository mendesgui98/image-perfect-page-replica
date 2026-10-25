import type { QueueStore, QueuedItem } from "./offline-queue";

// Armazenamento da fila no IndexedDB do aparelho (aceita Blob/File, ao contrário do localStorage).
const DB_NAME = "jmg-offline";
const VERSION = 1;

function open(storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName))
        db.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<R>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<R>,
): Promise<R> {
  return open(storeName).then(
    (db) =>
      new Promise<R>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = action(tx.objectStore(storeName));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export function indexedDbStore<T>(storeName: string): QueueStore<T> {
  return {
    all: () => run(storeName, "readonly", (s) => s.getAll() as IDBRequest<QueuedItem<T>[]>),
    put: async (item) => void (await run(storeName, "readwrite", (s) => s.put(item))),
    remove: async (id) => void (await run(storeName, "readwrite", (s) => s.delete(id))),
  };
}
