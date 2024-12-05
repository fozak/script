try {
    // Step 1: Create a new temporary container
    const tempContainer = document.createElement('div');

    // Step 2: Clone the current document's body into the temporary container
    tempContainer.innerHTML = document.body.innerHTML;

    // Step 3: Remove specified tags from the temporary container
    const tagsToRemove = ['head', 'header', 'footer', 'code', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link'];
    tagsToRemove.forEach(tag => {
        const elements = tempContainer.getElementsByTagName(tag);
        while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]);
        }
    });

    // Step 4: Iterate through <a> elements in the temporary container and append new spans
    const links = tempContainer.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        const newSpan = document.createElement('span');
        newSpan.textContent = `${link.textContent.trim()} link: ${href || '(no link available)'}`;
        link.appendChild(newSpan);
    });

    // Step 5: Extract the full text from the temporary container and clean it up
    let fullText = tempContainer.innerText.trim();
    fullText = fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' '); // Replace multiple newlines and spaces with a single space

    // Step 6: Remove strings that start with ? up to the first space
    fullText = fullText.replace(/\?[^ ]*/g, '');

    // Step 7: Final cleanup to remove extra spaces
    fullText = fullText.replace(/\s+/g, ' ').trim();

    console.log(fullText);

    // Step 8: Clean up - remove the temporary container
    tempContainer.remove();

} catch (error) {
    console.error('Error processing the document:', error);
}