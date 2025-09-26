// Background script for Excalidraw Web Annotator
chrome.runtime.onInstalled.addListener(() => {
  console.log('Excalidraw Web Annotator installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateIcon') {
    // Update extension icon based on state
    const iconPath = request.isVisible ? {
      "16": "icons/icon16-active.png",
      "48": "icons/icon48-active.png",
      "128": "icons/icon128-active.png"
    } : {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png", 
      "128": "icons/icon128.png"
    };
    
    chrome.action.setIcon({ 
      tabId: sender.tab.id,
      path: iconPath
    }).catch(() => {
      // Fallback if custom icons aren't available
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: request.isVisible ? '●' : ''
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: sender.tab.id,
        color: '#4285f4'
      });
    });
  }
  
  sendResponse({ success: true });
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`annotations_${tabId}`]);
});