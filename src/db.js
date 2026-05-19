// Simple IndexedDB wrapper for potrero field entries + photos
const DB_NAME = 'potrero-db';
const DB_VERSION = 3;
const STORE_ENTRIES = 'entries';
const STORE_PHOTOS = 'photos';
const STORE_CHECKLIST = 'checklist';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
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
      // v2→v3: migrate simple toggle to multi-sighting array
      if (oldVersion < 3) {
        const tx = req.transaction;
        const store = tx.objectStore(STORE_CHECKLIST);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          getAll.result.forEach(item => {
            if (item.value && item.value.visto && !Array.isArray(item.value)) {
              // Migrate: {visto, timestamp} → [{timestamp, gps, nota}]
              store.put([{ timestamp: item.value.timestamp, gps: null, nota: '' }], item.key);
            }
          });
        };
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

// ── Checklist (multi-sighting) ──
// Key: "{grupo}:{index}" → Array of sightings
// Each sighting: { timestamp, gps: { lat, lng } | null, nota: '' }
export async function getSightings() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readonly');
    const req = tx.objectStore(STORE_CHECKLIST).getAll();
    req.onsuccess = () => {
      const result = {};
      req.result.forEach(item => { result[item.key] = Array.isArray(item.value) ? item.value : (item.value ? [item.value] : []); });
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addSighting(key, gps = null, nota = '') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readwrite');
    const store = tx.objectStore(STORE_CHECKLIST);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = Array.isArray(getReq.result) ? getReq.result : [];
      const sighting = { timestamp: new Date().toISOString(), gps, nota };
      store.put([...existing, sighting], key);
      tx.oncomplete = () => resolve(sighting);
      tx.onerror = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeLastSighting(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readwrite');
    const store = tx.objectStore(STORE_CHECKLIST);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = Array.isArray(getReq.result) ? getReq.result : [];
      if (existing.length <= 1) {
        store.delete(key);
      } else {
        store.put(existing.slice(0, -1), key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function updateSightingNote(key, sightingIndex, nota) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHECKLIST, 'readwrite');
    const store = tx.objectStore(STORE_CHECKLIST);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing = Array.isArray(getReq.result) ? [...getReq.result] : [];
      if (existing[sightingIndex]) {
        existing[sightingIndex].nota = nota;
        store.put(existing, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getAllSightingsForExport() {
  const sightings = await getSightings();
  const rows = [];
  for (const [key, arr] of Object.entries(sightings)) {
    const [grupoStr, indexStr] = key.split(':');
    const index = parseInt(indexStr);
    for (const s of arr) {
      rows.push({ grupo: grupoStr, index, ...s });
    }
  }
  return rows;
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
