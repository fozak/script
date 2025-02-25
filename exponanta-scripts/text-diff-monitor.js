// Keep track of previous state
let previousText = document.body.innerText;

// Function to find differences between two strings
function findTextDifferences(oldText, newText) {
    // Split both texts into arrays of words
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    
    // Find new words that weren't in the old text
    const addedWords = newWords.filter(word => !oldWords.includes(word));
    
    // Find words that were removed
    const removedWords = oldWords.filter(word => !newWords.includes(word));
    
    return {
        added: addedWords,
        removed: removedWords
    };
}

// Set up the interval
setInterval(() => {
    // Get current text
    const currentText = document.body.innerText;
    
    // If text has changed
    if (currentText !== previousText) {
        // Get the differences
        const differences = findTextDifferences(previousText, currentText);
        
        // Log the changes
        if (differences.added.length > 0) {
            console.log('New text added:', differences.added.join(' '));
        }
        if (differences.removed.length > 0) {
            console.log('Text removed:', differences.removed.join(' '));
        }
        
        // Update previous text for next comparison
        previousText = currentText;
    }
}, 3000);
