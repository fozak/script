// background.js
let savedWebpages = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveWebpage') {
    const { key, html } = request.data;
    savedWebpages[key] = html;
    console.log(`Saved webpage from ${key}`);
    sendResponse({ status: 'success', key: key });
  }
});