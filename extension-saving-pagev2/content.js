// content.js
(function() {
    // Function to get text starting content from a cloned document
    function getTextStarting(documentClone) {
      const buttons = documentClone.querySelectorAll('button');
      buttons.forEach(button => button.remove());
      
      const headers = documentClone.querySelectorAll('header');
      headers.forEach(header => header.remove());
  
      return documentClone.body.innerText.substring(0, 900);
    }
  
    async function saveWebpage() {
      try {
        // Create a clone of the document
        const documentClone = document.cloneNode(true);
        
        // Get text starting from the clone
        //const textStarting = getTextStarting(documentClone); this added trim()
        const textStarting = document.body.innerText.trim().substring(0, 900);
        // Create the key
        const key = `${window.location.href} ${document.title} ${textStarting}`;
        
        // Get the original HTML
        const html = document.documentElement.outerHTML;
  
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'saveWebpage',
          data: {
            key: key,
            html: html
          }
        }, response => {
          console.log('Save response:', response);
        });
  
      } catch (error) {
        console.error('Error processing webpage:', error);
      }
    }
  
    // Wait 5 seconds after page load, then save
    window.addEventListener('load', () => {
      setTimeout(saveWebpage, 5000);
    });
  })();