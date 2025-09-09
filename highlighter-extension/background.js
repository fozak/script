// Background Script for Text Annotator Extension

// Create context menu on extension install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "annotateText",
        title: "Add Annotation",
        contexts: ["selection"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "annotateText") {
        try {
            // Send message to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: "createAnnotation",
                selectedText: info.selectionText
            });
        } catch (error) {
            console.error('Failed to send message to content script:', error);
        }
    }
});