const initialNames = ["John Smith", "Jane Doe", "Alice Johnson", "Bob Brown"];

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ names: initialNames }, () => {
        console.log("Initial names saved to storage.");
    });
});