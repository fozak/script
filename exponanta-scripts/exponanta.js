//


//this block is to be replaced if CHROME extention loads it

// Create a script element
var script = document.createElement('script');
// Set the source to the compromise library CDN
script.src = 'https://unpkg.com/compromise';
// Append the script element to the document head
document.head.appendChild(script);

// Wait for the script to load
script.onload = function() {
    console.log('Compromise library loaded successfully');
};

script.onerror = function() {
    console.error('Failed to load the compromise library');
};

//this is compromize seaching the html elements with like Omar Hayam
const doc = nlp(document.body.innerText);
const personNames = doc.people().out('array');

// Get all two-word names from Compromise
const twoWordNames = personNames.filter(name => name.split(' ').length === 2);

// Find first two-word name
const firstPersonName = twoWordNames[0];

const nameElements = [...document.body.getElementsByTagName('*')].filter(el => {
    const text = el.innerText || el.textContent;
    return text && text.trim() === firstPersonName;
});

// Declare allNames outside the if block
let allNames = [];

if (nameElements.length > 0) {
    const element = nameElements[0];
    const className = element.className;
    
    const similarElements = document.getElementsByClassName(className);
    const extractedNames = [...similarElements].map(el => {
        const text = el.innerText || el.textContent;
        return text ? text.trim() : '';
    }).filter(Boolean);
    
    // Combine and deduplicate names
    const allNames = [...new Set([...extractedNames, ...twoWordNames])];
    console.log('Combined unique names:', allNames);
}



//that has some duplicates 

function cleanNames(names) {
    //To process the list of names you provided, we can follow these steps:

//Filter for Two-Word Names: Select names that consist of exactly two words.
//Remove Unwanted Characters: Strip out any commas (,) and periods (.) from the names.
//Deduplicate the Names: Ensure that the resulting names are unique.
}

const cleanedNames = cleanNames(allNames);
console.log(cleanedNames);
