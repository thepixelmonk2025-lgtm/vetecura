// IndexedDB Offline Sync Queue for Vetecura PWA Scanner

export interface OfflineScanRecord {
  id?: number;
  barcode_value: string;
  session_type: 'grn' | 'dispatch' | 'cycle_count';
  reference_id: string;
  rack_id?: string;
  batch_id?: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'failed';
}

const DB_NAME = 'vetecura_pwa_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineScan(scan: Omit<OfflineScanRecord, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(scan);

    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineScans(): Promise<OfflineScanRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result as OfflineScanRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineScan(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllOfflineScans(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncOfflineQueue(
  apiBaseUrl: string,
  token?: string
): Promise<{ synced: number; failed: number }> {
  const scans = await getOfflineScans();
  if (scans.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const scan of scans) {
    if (!scan.id) continue;
    try {
      let endpoint = '';
      let payload: any = { barcode_value: scan.barcode_value };

      if (scan.session_type === 'grn') {
        endpoint = `${apiBaseUrl}/grn/${scan.reference_id}/scan-item`;
        payload.rack_id = scan.rack_id;
      } else if (scan.session_type === 'dispatch') {
        endpoint = `${apiBaseUrl}/dispatch/${scan.reference_id}/scan-item`;
        payload.rack_id = scan.rack_id;
        payload.batch_id = scan.batch_id;
      } else if (scan.session_type === 'cycle_count') {
        endpoint = `${apiBaseUrl}/cycle-counts/${scan.reference_id}/scan-item`;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 409 || res.status === 422) {
        // Discard from queue once recorded or rejected by business rules
        await removeOfflineScan(scan.id);
        if (res.ok || res.status === 409) {
          synced++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  return { synced, failed };
}
