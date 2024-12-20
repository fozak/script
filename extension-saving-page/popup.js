// popup.js
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

async function deleteKey(key) {
  try {
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    await new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    displayKeys(); // Refresh the list after deletion
  } catch (error) {
    console.error('Error deleting key:', error);
  }
}

async function displayKeys() {
  try {
    const db = await initDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const keysList = document.getElementById('keysList');
      keysList.innerHTML = '';
      
      const keys = request.result;
      if (keys.length === 0) {
        keysList.innerHTML = '<p>No saved webpages yet.</p>';
        return;
      }

      keys.forEach(key => {
        const div = document.createElement('div');
        div.className = 'saved-item';
        
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteKey(key);
        
        div.appendChild(deleteBtn);
        div.appendChild(document.createTextNode(key));
        keysList.appendChild(div);
      });
    };

    request.onerror = () => {
      console.error("Error getting keys:", request.error);
      document.getElementById('keysList').innerHTML = '<p>Error loading saved webpages.</p>';
    };
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('keysList').innerHTML = '<p>Error accessing database.</p>';
  }
}

// Load keys when popup opens
document.addEventListener('DOMContentLoaded', displayKeys);