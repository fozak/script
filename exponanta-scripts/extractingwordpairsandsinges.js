// Extract text from the body of the document
let text = document.body.innerText;

// 1. Extract unique word pairs with a single space (like "John Smith")
let wordPairs = [...new Set(text.match(/\b[A-Z][a-zA-Z]* [A-Z][a-zA-Z]*\b/g) || [])];

// Log the unique word pairs to the console
console.log('Unique Word Pairs:', wordPairs);

// 2. Remove the identified word pairs from the text
wordPairs.forEach(pair => {
    text = text.replace(new RegExp('\\b' + pair + '\\b', 'g'), '');
});

// 3. Extract unique single words starting with a capital letter from the modified text
let capitalWords = [...new Set(text.match(/\b[A-Z][a-zA-Z]*\b/g) || [])];

// Log the results to the console
console.log('Unique Single Words Starting with Capital Letters:', capitalWords);