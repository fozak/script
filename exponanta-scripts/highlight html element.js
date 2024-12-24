// Function to handle mouse movement
function handleMouseMove(event) {
    // Get the element under the mouse cursor
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element) {
        // Remove highlight from previously highlighted elements
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        
        // Add highlight to the currently hovered element
        element.classList.add('highlight');
        
        // Optional: Add a style for the highlight class
        element.style.outline = '2px solid red'; // Change this to any style you prefer
    }
}

// Add the highlight class to all elements
const style = document.createElement('style');
style.innerHTML = `
    .highlight {
        outline: 2px solid red; /* Change this to any desired highlight style */
    }
`;
document.head.appendChild(style);

// Add event listener to track mouse movement
document.addEventListener('mousemove', handleMouseMove);