//use this
try {
// Step 1: Clone the body
let clonedBody = document.body.cloneNode(true); // Clone the body with all its children

// Step 2: Define the tags you want to remove
const tagsToRemove = ['head', 'header', 'code', 'footer', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link', 'button'];

// Step 3: Remove the specified tags from the cloned body
tagsToRemove.forEach(tag => {
    const elements = clonedBody.getElementsByTagName(tag);
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]); // Remove each element found
    }
});

// Step 4: Iterate through <a> elements in clone and append new spans
const links = clonedBody.querySelectorAll('a');
links.forEach(link => {
    const href = link.getAttribute('href');

    // Create a new <span> element
    const newSpan = document.createElement('span'); 
    newSpan.textContent = ` ${href || '(no link available)'}`;  // Set the content

    // Append the new span to the current link
    link.appendChild(newSpan);
});

// Step 5: Extract the full text from the temporary container and clean it up
let fullText = clonedBody.innerText.trim();
fullText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' '); // Replace multiple newlines and spaces with a single space

// Step 6: Remove strings that start with ? up to the first space
fullText = fullText.replace(/\?[^ ]*/g, '');

// Step 7: Final cleanup to remove extra spaces
fullText = fullText.replace(/\s+/g, ' ').trim();

console.log('Resulting text:', fullText);

} catch (error) {
    console.error('Error processing the document:', error);
}
