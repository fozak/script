// Function to initialize AWS SDK with credentials from local storage or prompt
function initializeAWS() {
    const accessKey = localStorage.getItem('aws_access_key');
    const secretKey = localStorage.getItem('aws_secret_key');
    const region = 'us-east-1'; // Replace with your region

    if (accessKey && secretKey) {
        AWS.config.update({
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
            region: region
        });
        console.log('AWS SDK initialized with stored credentials.');
    } else {
        promptForCredentials();
    }
}

// Function to prompt user for credentials
function promptForCredentials() {
    const accessKey = prompt("Enter your AWS Access Key:");
    const secretKey = prompt("Enter your AWS Secret Key:");

    if (accessKey && secretKey) {
        localStorage.setItem('aws_access_key', accessKey);
        localStorage.setItem('aws_secret_key', secretKey);
        initializeAWS();
    } else {
        alert("Credentials are required to proceed.");
        // Optionally, handle error state or disable functionalities
    }
}

// Initialize AWS SDK js
initializeAWS();

const s3 = new AWS.S3();
const bucketName = 'exponanta-public';
const objectKey = 'index_exponanta.html'; // Example object

// Load existing notes on page load
window.onload = () => {
    loadNotes();
};

// Load notes from S3 metadata
function loadNotes() {
    const params = {
        Bucket: bucketName,
        Key: objectKey
    };

    s3.headObject(params, (err, data) => {
        if (err) {
            console.error('Error retrieving metadata:', err);
            document.getElementById('status').innerText = 'Error loading notes.';
        } else {
            // Check for user-defined metadata
            const notes = data.Metadata.notes || '';
            document.getElementById('notes').value = notes;
        }
    });
}

// Save notes to S3 metadata
document.getElementById('save-notes').addEventListener('click', () => {
    const notes = document.getElementById('notes').value;

    // Prepare the metadata to be updated
    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Metadata: {
            notes: notes
        },
        CopySource: `${bucketName}/${objectKey}`, // Required to update metadata
        MetadataDirective: 'REPLACE' // Replace existing metadata
    };

    s3.copyObject(params, (err, data) => {
        if (err) {
            console.error('Error saving notes:', err);
            document.getElementById('status').innerText = 'Error saving notes.';
        } else {
            console.log('Notes saved successfully!', data);
            document.getElementById('status').innerText = 'Notes saved successfully!';
        }
    });
});