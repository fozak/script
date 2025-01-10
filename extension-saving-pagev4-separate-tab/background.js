// Database setup
const dbName = "webpageDB";
const dbVersion = 1;
const storeName = "webpages";

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveWebpage') {
    handleSaveWebpage(message.data)
      .then(() => sendResponse({ status: 'success' }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true;
  }
  
  if (message.action === 'getAllKeys') {
    getAllKeys()
      .then(keys => sendResponse({ status: 'success', keys }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true;
  }

  if (message.action === 'deleteKey') {
    deleteKey(message.key)
      .then(() => sendResponse({ status: 'success' }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true;
  }

  if (message.action === 'getHTML') {
    getHTML(message.key)
      .then(html => sendResponse({ status: 'success', html }))
      .catch(error => sendResponse({ status: 'error', error: error.message }));
    return true;
  }
});

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

async function getHTML(key) {
  const db = await initDB();
  const transaction = db.transaction([storeName], 'readonly');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
//added to create new tab
//chrome.action.onClicked.addListener((tab) => {
// chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
//});

// another tab listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fromSeparate") {
      console.log("Received message from separate.htm:", message.data);
      sendResponse({ response: "Message received!" });
  }
});