// content.js
(function() {
    function saveWebpage() {
      try {
        const key = `${window.location.href}`;
        const html = document.documentElement.outerHTML;
  
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
  
    window.addEventListener('load', () => {
      setTimeout(saveWebpage, 5000);
    });
  })();