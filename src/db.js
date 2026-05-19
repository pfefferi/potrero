// Simple IndexedDB wrapper for potrero field entries + photos
const DB_NAME = 'potrero-db';
const DB_VERSION = 2;
const STORE_ENTRIES = 'entries';
const STORE_PHOTOS = 'photos';
const STORE_CHECKLIST = 'checklist';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
        store.createIndex('formId', 'formId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const store = db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        store.createIndex('entryId', 'entryId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CHECKLIST)) {
        db.createObjectStore(STORE_CHECKLIST);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    tx.objectStore(STORE_ENTRIES).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getEntries(formId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const index = tx.objectStore(STORE_ENTRIES).index('formId');
    const req = index.getAll(formId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEntry(id) {
  const db = await openDB();
  // Also delete associated photos
  const photos = await getPhotosForEntry(id);
  for (const photo of photos) {
    await deletePhoto(photo.id);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    tx.objectStore(STORE_ENTRIES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearEntries(formId) {
  const db = await openDB();
  const entries = await getEntries(formId);
  for (const entry of entries) {
    await deleteEntry(entry.id);
  }
}

export async function savePhoto(entryId, blob, name) {
  const db = await openDB();
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const photo = { id, entryId, blob, name: name || 'foto', timestamp: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).put(photo);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhotosForEntry(entryId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const index = tx.objectStore(STORE_PHOTOS).index('entryId');
    const req = index.getAll(entryId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function photoToUrl(photo) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(photo.blob);
    resolve(url);
  });
}

// ── Checklist ──
// Key: "{grupo}:{index}" → { visto: true, timestamp: "..." }
export async function getChecklist() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readonly');
    const req = tx.objectStore(STORE_CHECKLIST).getAll();
    req.onsuccess = () => {
      const result = {};
      req.result.forEach(item => { result[item.key] = item.value; });
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function toggleChecklistItem(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readwrite');
    if (value) {
      tx.objectStore(STORE_CHECKLIST).put(value, key);
    } else {
      tx.objectStore(STORE_CHECKLIST).delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearChecklist() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readwrite');
    tx.objectStore(STORE_CHECKLIST).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
