//removes all after footer 
let fullText = ''; 
try {
    // Step 1: Get the current page URL
    const currentPageUrl = window.location.href;
    console.log('Current page URL:', currentPageUrl);
    
    // Step 2: Clone the body
    let clonedBody = document.body.cloneNode(true); // Clone the body with all its children
    
    // Step 3: Remove all elements after <footer>
    const footer = clonedBody.querySelector('footer');
    if (footer) {
        let nextSibling = footer.nextSibling;
        while (nextSibling) {
            const elementToRemove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            elementToRemove.parentNode.removeChild(elementToRemove);
        }
        
        // Also remove elements after footer's parent (if it has a parent)
        let currentParent = footer.parentElement;
        while (currentParent && currentParent !== clonedBody) {
            nextSibling = currentParent.nextSibling;
            while (nextSibling) {
                const elementToRemove = nextSibling;
                nextSibling = nextSibling.nextSibling;
                elementToRemove.parentNode.removeChild(elementToRemove);
            }
            currentParent = currentParent.parentElement;
        }
    }
    
    // Step 4: Define the tags you want to remove
    const tagsToRemove = ['head', 'header', 'code', 'footer', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link', 'button'];
    
    // Step 5: Remove the specified tags from the cloned body
    tagsToRemove.forEach(tag => {
        const elements = clonedBody.getElementsByTagName(tag);
        while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]); // Remove each element found
        }
    });
    
    // Step 6: Iterate through <a> elements in clone and append new spans
    const links = clonedBody.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        // Create a new <span> element
        const newSpan = document.createElement('span');
        
        newSpan.textContent = ` ${href || '(no link available)'}`;  // Set the content
        
        // Append the new span to the current link
        link.appendChild(newSpan);
    });
    
    // Step 7: Extract the full text from the temporary container and clean it up
    fullText = clonedBody.innerText.trim();
    fullText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' '); // Replace multiple newlines and spaces with a single space
    
    // Step 8: Remove strings that start with ? up to the first space
    fullText = fullText.replace(/\?[^ ]*/g, '');
    
    // Step 9: Final cleanup to remove extra spaces
    fullText = fullText.replace(/\s+/g, ' ').trim();
    
    console.log('Resulting text:', fullText);
} catch (error) {
    console.error('Error processing the document:', error);
}