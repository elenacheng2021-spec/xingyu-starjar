export type StoredInspiration = {
  id: string;
  content: string;
  kind: string;
  starColor: string;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentBlob?: Blob | null;
  sourceIds: string[];
  createdAt: number;
};

const DATABASE_NAME = 'xingyu-inspiration-vault';
const STORE_NAME = 'inspirations';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStoredInspirations() {
  const database = await openDatabase();
  return new Promise<StoredInspiration[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const rows = (request.result as StoredInspiration[]).sort(
        (left, right) => right.createdAt - left.createdAt,
      );
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function storeInspiration(inspiration: StoredInspiration) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(inspiration);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
