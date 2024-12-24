(function() {
  function saveWebpage() {
    try {
      const documentClone = document.cloneNode(true);
      const textStarting = document.body.innerText.trim().substring(0, 900);
      const key = `${window.location.href} ${document.title} ${textStarting}`;
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