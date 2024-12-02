// Function to highlight names in the document
function highlightNames(names) {
    // Capture the current HTML content of the body
    let bodyText = document.body.innerHTML;

    // Clear previous highlights
    bodyText = bodyText.replace(/<span style="background-color: yellow; color: black;">(.*?)<\/span>/g, '$1');

    if (names && names.length > 0) {
        names.forEach(name => {
            // Define the regex to match the name
            const regex = new RegExp(`(${name})`, "gi");
            // Replace occurrences of the name with highlighted version
            bodyText = bodyText.replace(regex, `<span style="background-color: yellow; color: black;">$1</span>`);
        });
    }

    // Update the body with the new HTML content
    document.body.innerHTML = bodyText;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightNames") {
        chrome.storage.sync.get("names", ({ names }) => {
            highlightNames(names);
        });
    }
});