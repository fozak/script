//check if user data is empty, if empty build data
//openurl()
//get user name 
const userNameElement = document.querySelector('.global-nav__me img.global-nav__me-photo');
const userName = userNameElement ? userNameElement.getAttribute('alt') : 'User not found';
console.log(userName);
//update data 
// <user>John Doe</user>

async function hashName(name) {
    // Encode the name to a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(name);

    // Hash the data using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');

    // Return the first 8 characters of the hash
    return hashHex.slice(0, 8);
}

// Example usage
hashName('John Doe').then(userid => {
    console.log(userid); // Outputs a stable 8-character ID for 'john_doe'
});

//then add the parced data to
//openai(prompt)
<>
<userdata>
    <userprofile>
        <user>John Doe</user>
        <userid>6cea57c2</userid>
    </userprofile>

    //added data
    <crawler>
        <webpage>
            <sourceurl>https://www.linkedin.com/mynetwork/invite-connect/connections/</sourceurl>
            <crawledurls>
                <url>https://www.linkedin.com/company/fluenceenergy/</url>
                <url>https://www.linkedin.com/company/fluenceenergy/jobs/</url>
                <url>https://www.linkedin.com/company/fluenceenergy/connections/</url>
            </crawledurls>
            <type>connections</type>
            <status>processed</status>
            <lastupdated>2024-10-05T14:30:00Z</lastupdated>
            <copyurl></copyurl>
        </webpage>
    </crawler>
</userdata>
</>

//save the copy <sourceurl>https://www.linkedin.com/mynetwork/invite-connect/connections/</sourceurl> 

//now we have data to crawl and 
