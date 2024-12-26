// Make sure to include the Compromise library in your HTML file
// You can include it via CDN as follows:
// <script src="https://unpkg.com/compromise"></script>

// Extract text from the body of the document
let text = document.body.innerText;

// Use the compromise library to analyze the text
let doc = nlp(text);

// Extract entities recognized as people
let people = doc.people().out('array');

// Log the extracted people to the console
console.log(people);