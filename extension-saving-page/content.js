// content.js
// Wrap everything in an immediately invoked function expression (IIFE)
(function() {
    // Database constants
    const dbName = "webpageDB";
    const dbVersion = 1;
    const storeName = "webpages";
  
    // Initialize IndexedDB
    function initDB() {
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
  
    // Function to get text starting content from a cloned document
    function getTextStarting(documentClone) {
      // Remove buttons and headers from the clone
      const buttons = documentClone.querySelectorAll('button');
      buttons.forEach(button => button.remove());
      
      const headers = documentClone.querySelectorAll('header');
      headers.forEach(header => header.remove());
  
      // Get first 900 characters of text
      return documentClone.body.innerText.substring(0, 900);
    }
  
    // Function to save webpage to IndexedDB
    async function saveWebpage() {
      try {
        // Create a clone of the document
        const documentClone = document.cloneNode(true);
        
        // Get text starting from the clone
        const textStarting = getTextStarting(documentClone);
        
        // Create the key
        const key = `${window.location.href} ${document.title} ${textStarting}`;
        
        // Get the original HTML
        const html = document.documentElement.outerHTML;
  
        // Save to IndexedDB
        const db = await initDB();
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        await new Promise((resolve, reject) => {
          const request = store.put(html, key);
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
        });
  
        console.log('Webpage saved successfully');
      } catch (error) {
        console.error('Error saving webpage:', error);
      }
    }
  
    // Wait 5 seconds after page load, then save
    window.addEventListener('load', () => {
      setTimeout(saveWebpage, 5000);
    });
  })();