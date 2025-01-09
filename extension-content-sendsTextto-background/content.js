// content.js
(function() {
  function sendChunk(key, chunk) {
    chrome.runtime.sendMessage({
      action: 'saveWebpageChunk',
      data: {
        key: key,
        chunk: chunk
      }
    }, response => {
      console.log('Chunk save response:', response);
    });
  }

  function observeDOM() {
    const key = `${window.location.href}`;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if nodes were added
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Send the innerText of the added node
              const innerText = node.innerText.trim();
              if (innerText) {
                sendChunk(key, innerText);
              }
            }
          });
        }
      });
    });

    // Start observing the body for child additions
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener('load', () => {
    observeDOM();
  });
})();