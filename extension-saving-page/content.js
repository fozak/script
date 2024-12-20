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