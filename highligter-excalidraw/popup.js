// Popup script for Excalidraw Web Annotator
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggle-btn');
  
  // Get current tab and check status
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'status' }, function(response) {
      updateButtonState(response?.isVisible || false);
    });
  });
  
  // Toggle button click handler
  toggleBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, function(response) {
        if (chrome.runtime.lastError) {
          // Content script might not be loaded yet
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, function() {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, function(response) {
              updateButtonState(response?.isVisible || false);
              window.close();
            });
          });
        } else {
          updateButtonState(response?.isVisible || false);
          window.close();
        }
      });
    });
  });
  
  function updateButtonState(isVisible) {
    if (isVisible) {
      toggleBtn.textContent = 'Hide Overlay';
      toggleBtn.className = 'w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors';
    } else {
      toggleBtn.textContent = 'Show Overlay';
      toggleBtn.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors';
    }
  }
});