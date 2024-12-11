//added url
let previousInnerText = document.body.innerText;
let timeoutId; // Variable to store the timeout ID

// Function to log differences in innerText
const logDifferences = () => {
    // Clear the previous timeout
    clearTimeout(timeoutId);

    // Set a new timeout to call the logging function after 3 seconds
    timeoutId = setTimeout(() => {
        const currentInnerText = document.body.innerText;

        // Check if the current innerText is different from the previous one
        if (currentInnerText !== previousInnerText) {
            console.log('Text changed!');

            // Find the first index where the strings differ
            let minLength = Math.min(previousInnerText.length, currentInnerText.length);
            let index = 0;

            // Find the index of the first difference
            while (index < minLength && previousInnerText[index] === currentInnerText[index]) {
                index++;
            }

            // Log the new characters added beyond the previous text
            if (index < currentInnerText.length) {
                const addedText = currentInnerText.slice(index);
                console.log(`New characters added: "${addedText}"`);
            }

            // Update the previous innerText to the current one
            previousInnerText = currentInnerText;
        }
    }, 3000); // 3000 milliseconds = 3 seconds
};

// Add event listeners for relevant events
window.addEventListener('scroll', logDifferences);

document.addEventListener('input', logDifferences);  // Captures changes from keyboard actions
document.addEventListener('click', logDifferences);   // Captures clicks that might change text
document.addEventListener('blur', logDifferences);    // Captures loss of focus to log the final text