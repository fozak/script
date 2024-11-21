// Function to highlight names in the document
function highlightNames(names) {
    // Clear previous highlights

    
    document.body.innerHTML = document.body.innerHTML.replace(/<span class="highlight">(.*?)<\/span>/g, '$1');

    if (names && names.length > 0) {
        const bodyText = document.body.innerHTML;
        names.forEach(name => {
            const regex = new RegExp(`(${name})`, "gi");
            document.body.innerHTML = bodyText.replace(regex, '<span class="highlight">$1</span>');
        });
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightNames") {
        chrome.storage.sync.get("names", ({ names }) => {
            highlightNames(names);
        });
    }
});