// background.js
let savedWebpages = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWebpageChunk') {
    const { key, chunk } = request.data;

    // Use chrome.storage to append or concatenate chunks of text
    if (!savedWebpages[key]) {
      savedWebpages[key] = '';
    }
    savedWebpages[key] += chunk + '\n'; // Append chunk with a newline
    
    console.log(`Saved chunk from ${key}:`, chunk);
    sendResponse({ status: 'success', key: key });
  }
});