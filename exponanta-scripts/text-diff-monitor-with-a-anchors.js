// Function to get concatenated anchor text
function getAnchorResult() {
    const anchors = document.querySelectorAll('a');
    const extractedTexts = [];
    
    anchors.forEach(anchor => {
        if (anchor.innerText.trim() !== '') {
            extractedTexts.push(`<a href="${anchor.href}">${anchor.innerText.trim()}</a>`);
        }
    });
    
    return extractedTexts.join(' ');
}

// Keep track of previous state
let previousResult = getAnchorResult();

// Set up the interval
setInterval(() => {
    // Get current result
    const currentResult = getAnchorResult();
    
    // If the result has changed
    if (currentResult !== previousResult) {
        console.log('Previous result:', previousResult);
        console.log('New result:', currentResult);
        
        // Update previous state for next comparison
        previousResult = currentResult;
    }
}, 3000);
