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

//this is compromize module selecting  

// Create a script element
// Get the text content from the body of the document
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

// Function to get common nouns from the word pairs
function getCommonNounsFromPairs(pairs) {
    // Array to hold common nouns found
    let commonNouns = [];

    // Iterate through each pair in wordPairs
    for (let pair of pairs) {
        // Convert the entire pair to a single string and lowercase
        let lowerCaseText = pair.toLowerCase(); // Note: No need to join since pair is already a string
        
        // Create the document with the lowercase text
        let doc = nlp(lowerCaseText); 

        // Find common nouns (not proper nouns)
        let foundNouns = doc.match('#Noun').not('#ProperNoun').out('array');

        // Add found common nouns to the commonNouns array
        commonNouns.push(...foundNouns);
    }

    return commonNouns;
}

// Function to get remaining pairs
function getRemainingPairs(pairs) {
    let remainingPairs = [];
    let commonNouns = getCommonNounsFromPairs(pairs);

    // Iterate through each pair again to check against common nouns
    for (let pair of pairs) {
        let lowerPair = pair.toLowerCase().split(' '); // Split the string into words

        // Check if either word in the pair is a common noun
        if (!commonNouns.includes(lowerPair[0]) && !commonNouns.includes(lowerPair[1])) {
            remainingPairs.push(pair); // Include the original pair if neither word is a common noun
        }
    }

    return remainingPairs;
}

// Get remaining pairs
let remainingPairs = getRemainingPairs(wordPairs);

// Log the common nouns found
let commonNounsFound = getCommonNounsFromPairs(wordPairs);
console.log(`Common Nouns found: ${commonNounsFound.length > 0 ? commonNounsFound.join(', ') : 'No common nouns found.'}`);

// Log the remaining pairs to the console
console.log('Remaining Pairs:', remainingPairs);

//not all filtered out
[
    "Trending Winter",
    "Azerbaijan Airlines",
    "Former Assad",
    "The Sports",
    "Cornell University",
    "Elon Musk",
    "Disney CEO",
    "FOR SUBSCRIBERS",
    "West Coast",
    "NOW PLAYING",
    "CNN Headlines",
    "GO LIVE",
    "For Subscribers",
    "Cowboy Carter",
    "Blue Ivy",
    "Analysis Your",
    "Whole Foods",
    "MORE TOP",
    "Hudson Meek",
    "Baby Driver",
    "New York",
    "The Motley",
    "MIDDLE EAST",
    "CNN PODCASTS",
    "Tyler Perry",
    "YEAR IN",
    "Taylor Swift",
    "Travis Kelce",
    "CHECK THESE",
    "Lamar Jackson",
    "Christmas Day",
    "The Delta",
    "CNN Underscored",
    "Winter Sale",
    "Most FSA",
    "Apple AirTags",
    "BACKED GUIDES",
    "King Charles",
    "Tallulah Willis",
    "Christopher Nolan",
    "The Odyssey",
    "Blake Lively",
    "Justin Baldoni",
    "Adam Sandler",
    "Chanukah Song",
    "Celine Dion",
    "PAID PARTNER",
    "Worth Its",
    "Weight In",
    "Best Credit",
    "Card For",
    "Northern California",
    "Mammoth Lakes",
    "SPACE AND",
    "Monica Lewinsky",
    "Ariana Grande",
    "The Brutalist",
    "HEALTH AND",
    "Former President",
    "Bill Clinton",
    "Matt Gaetz",
    "Christmas Eve",
    "Three Palestinian",
    "Remembering Eddie",
    "Van Halen",
    "Hurricane Helene",
    "Happy Gilmore",
    "Caitlin Clark",
    "Female Athlete",
    "College Football",
    "Artisan Setaro",
    "Paid Content",
    "Notre Dame",
    "Paid Partner",
    "The Santa",
    "Father Christmases",
    "Live TV",
    "Russia War",
    "Hamas War",
    "About CNN",
    "FOLLOW CNN",
    "Privacy Policy",
    "Cookie Settings",
    "Ad Choices",
    "Help Center",
    "Cable News",
    "A Warner",
    "Discovery Company",
    "All Rights",
    "CNN Sans"
]

//outcome 

[
    "NOW PLAYING",
    "GO LIVE",
    "Hudson Meek",
    "New York",
    "Tyler Perry",
    "Taylor Swift",
    "Travis Kelce",
    "CHECK THESE",
    "Lamar Jackson",
    "CNN Underscored",
    "BACKED GUIDES",
    "King Charles",
    "Christopher Nolan",
    "Blake Lively",
    "Justin Baldoni",
    "Adam Sandler",
    "Celine Dion",
    "Card For",
    "Northern California",
    "Mammoth Lakes",
    "Monica Lewinsky",
    "Ariana Grande",
    "Bill Clinton",
    "Matt Gaetz",
    "Three Palestinian",
    "Remembering Eddie",
    "Van Halen",
    "Caitlin Clark",
    "Notre Dame",
    "About CNN",
    "FOLLOW CNN",
    "All Rights",
    "CNN Sans"
]

// CORRECT - 1) do not include words with more then 1 capital letter like CNn
// 2) excude verbs "Remembering Eddie"
// 3) other cases like 'Card For

[
    "Patricia Geli",
    "Igor Shraybman",
    "Kirill Esipenko",
    "Nikolay Sklyarov",
    "Andrey Yasenovsky",
    "Steven Kirch",
    "Rafael Amaya",
    "Ammar Tahir",
    "Lisa Manning",
    "David Sterling",
    "Leena Singh",
    "Steven Palange",
    "Not Chasing",
    "Myra Singh",
    "Eduardo Crespo",
    "Valery Satsura",
    "Nikolai Didkovski",
    "Dental Connect",
    "Ron Simmons",
    "Jeff Yard",
    "Corey Sandler",
    "Stromilov Aleksei",
    "Ekaterina Berezneva",
    "Alena Reva",
    "Anna Hayete",
    "Oksana Goncharova",
    "Emil Jacob",
    "Igor Tkachenko",
    "Richard Draper",
    "Kate Zashalovska",
    "Olga Pushkina",
    "Natalia Kartashova",
    "Laura Zhunussova",
    "Central Asia",
    "Michael Tsapenko",
    "Anna Kopylkova",
    "Portugal Association",
    "Stanislav Semenenko",
    "Gabrielle Mon",
    "Daniel Zinko",
    "Sergey Isaev",
    "Through Organic",
    "Paul Grablevski",
    "Charles Peter",
    "Anna Galaburda",
    "Sergey Pavlov",
    "Sabine Koke",
    "Andrew Rodriguez",
    "Vasily Kosmynin",
    "Passionate About",
    "Alexander Afanaciev",
    "Stephen Webster",
    "Zoe Kelly",
    "Polina Rzhukowskaya",
    "Irina Mirolubova",
    "Ilya Pomirchiy",
    "Andrey Lysyuk",
    "Mark Kaplan",
    "Rahul Vadlakond",
    "George Komarov",
    "Kevin Rodriguez",
    "Irina Vospennikova",
    "Kirill Riabtsev",
    "Recent Cambridge",
    "Alexander Pivovar",
    "Alexander Minin",
    "Olga Lukina",
    "Pvt Ltd"
]

