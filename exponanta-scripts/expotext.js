let fullText = '';
try {
    // Step 1: Get the current page URL
    const currentPageUrl = window.location.href;
    console.log('Current page URL:', currentPageUrl);

    // Step 2: Clone the body
    let clonedBody = document.body.cloneNode(true); // Clone the body with all its children

    // Step 3: Define the tags you want to remove
    const tagsToRemove = ['head', 'header', 'code', 'footer', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link', 'button'];

    // Step 4: Remove the specified tags from the cloned body
    tagsToRemove.forEach(tag => {
        const elements = clonedBody.getElementsByTagName(tag);
        while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]); // Remove each element found
        }
    });

    // Step 5: Iterate through <a> elements in clone and append new spans
    const links = clonedBody.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');

        // Create a new <span> element
        const newSpan = document.createElement('span'); 
        newSpan.textContent = ` ${href || '(no link available)'}`;  // Set the content

        // Append the new span to the current link
        link.appendChild(newSpan);
    });

    // Step 6: Extract the full text from the temporary container and clean it up
    fullText = clonedBody.innerText.trim();
    fullText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' '); // Replace multiple newlines and spaces with a single space

    // Step 7: Remove strings that start with ? up to the first space
    fullText = fullText.replace(/\?[^ ]*/g, '');

    // Step 8: Final cleanup to remove extra spaces
    fullText = fullText.replace(/\s+/g, ' ').trim();

    // Step 9: Define cut words
    const cutWords = ['InterestsInterests', 'Are these results helpful?','How your profile and resume fit this job','Set alert for similar jobs'];

    // Step 10: Find the first occurrence of any cut word
    let cutIndex = -1;
    cutWords.forEach(word => {
        const index = fullText.indexOf(word);
        if (index !== -1 && (cutIndex === -1 || index < cutIndex)) {
            cutIndex = index; // Update cutIndex to the first occurring cut word
        }
    });

    // Step 11: Cut fullText after the first occurring cut word
    if (cutIndex !== -1) {
        fullText = fullText.slice(0, cutIndex + cutWords.find(word => fullText.startsWith(word, cutIndex)).length);
    }

    console.log('Resulting text:', fullText);

} catch (error) {
    console.error('Error processing the document:', error);
}