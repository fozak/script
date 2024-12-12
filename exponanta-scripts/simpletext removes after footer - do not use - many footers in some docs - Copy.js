//selecting titles
// Select all h1, h2, h3, and h4 elements within the document body
const headings = document.body.querySelectorAll('h1, h2, h3, h4');

// Iterate over the NodeList and log the text content of each heading
headings.forEach(heading => {
    console.log(heading.textContent);
});