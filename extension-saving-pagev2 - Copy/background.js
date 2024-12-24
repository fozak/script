
// Database setup
const dbName = "webpageDB";
const dbVersion = 1;
const storeName = "webpages";

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveWebpage') {
    handleSaveWebpage(message.data)
      .then(() => sendResponse({ status: 'success' }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true; // Will respond asynchronously
  }
  
  if (message.action === 'getAllKeys') {
    getAllKeys()
      .then(keys => sendResponse({ status: 'success', keys }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true; // Will respond asynchronously
  }

  if (message.action === 'deleteKey') {
    deleteKey(message.key)
      .then(() => sendResponse({ status: 'success' }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Save webpage data
async function handleSaveWebpage(data) {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.put(data.html, data.key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all keys
async function getAllKeys() {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete a key
async function deleteKey(key) {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}