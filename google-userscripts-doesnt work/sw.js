// Initialize the extension
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
        console.log('Extension installed for the first time');
        // Initialize with default settings if needed
        const defaultSettings = {
            lastScript: '// Enter your script here\n' +
                       '// Example: document.body.style.backgroundColor = "red";'
        };
        
        // Only set default if no existing data
        const existing = await chrome.storage.local.get('lastScript');
        if (!existing.lastScript) {
            await chrome.storage.local.set(defaultSettings);
        }
    }
});

// Listen for unhandled errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ERROR') {
        console.error('Extension error:', message.error);
    }
    return true;
});
