// Initialize a Set to store unique text content
let textSet = new Set();
let previousText = document.body.innerText;

// Function to check for text changes
const checkForTextChange = () => {
    const currentText = document.body.innerText.trim();
    if (currentText !== previousText) {
        const lines = currentText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let newContent = false;
        lines.forEach(line => {
            if (!textSet.has(line)) {
                textSet.add(line);
                newContent = true;
            }
        });

        if (newContent) {
            console.log('New content detected!');
            console.log('Total unique lines:', textSet.size);
            console.log('Latest content:', Array.from(textSet).slice(-5));
            localStorage.setItem('savedPageText', JSON.stringify(Array.from(textSet)));
        }

        previousText = currentText; // Update previousText
    }
};

// Add event listeners for relevant user actions
document.addEventListener('click', checkForTextChange);
document.addEventListener('keypress', checkForTextChange);
window.addEventListener('scroll', checkForTextChange);

// Initial check
checkForTextChange();
console.log('Text monitor initialized! Use getAllSavedText() to get content or exportToFile() to download.');