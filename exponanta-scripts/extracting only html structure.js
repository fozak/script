try {
    // Step 1: Create a new temporary container
    const tempContainer = document.createElement('div');

    // Step 2: Clone the current document's body into the temporary container
    tempContainer.innerHTML = document.body.innerHTML;

    // Step 3: Remove specified tags
    const tagsToRemove = ['head', 'header', 'footer', 'code', 'script', 'style', 'img', 'svg', 'meta', 'title', 'link', 'button', 'label'];
    tagsToRemove.forEach(tag => {
        let elements = tempContainer.getElementsByTagName(tag);
        while (elements.length > 0) {
            elements[0].parentNode.removeChild(elements[0]);
        }
    });

    // Step 4: Remove comments
    const removeComments = (node) => {
        const nodes = Array.from(node.childNodes);
        nodes.forEach(child => {
            if (child.nodeType === Node.COMMENT_NODE) {
                node.removeChild(child);
            } else {
                removeComments(child);
            }
        });
    };
    removeComments(tempContainer);

    // Step 5: Remove <span> tags but keep their text content
    const spans = tempContainer.getElementsByTagName('span');
    while (spans.length > 0) {
        const span = spans[0];
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
    }

    // Step 6: Remove elements with no inner text
    const allElements = tempContainer.querySelectorAll('*');
    allElements.forEach(element => {
        if (!element.innerText.trim() && element.nodeName !== 'SCRIPT') {
            element.parentNode.removeChild(element);
        }
    });

    // Step 7: Remove attributes from all remaining elements, except 'href'
    const remainingElements = tempContainer.querySelectorAll('*');
    remainingElements.forEach(element => {
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.toLowerCase() !== 'href') {
                element.removeAttribute(attr.name);
            }
        });
    });

    // Step 8: Remove empty parent elements
    const parents = tempContainer.querySelectorAll('*');
    parents.forEach(parent => {
        if (!parent.innerText.trim() && parent.children.length === 0) {
            parent.parentNode.removeChild(parent);
        }
    });

    // Step 9: Log the result
    console.log(tempContainer.innerHTML);
} catch (error) {
    console.error('An error occurred:', error);
}