const AWS = require('aws-sdk');

// Configure AWS without credentials for public access
AWS.config.update({
    region: 'us-east-1' // Specify your region
});

const s3 = new AWS.S3();
const bucketName = 'your-public-bucket-name'; // Replace with your public bucket name

async function fetchS3KeysAndMetadata() {
    const params = {
        Bucket: bucketName,
        MaxKeys: 1000 // Adjust as necessary
    };

    try {
        // Use makeUnauthenticatedRequest to list objects in a public bucket
        const data = await s3.makeUnauthenticatedRequest('listObjectsV2', params).promise();
        
        // Create an array to hold promises for fetching metadata
        const metadataPromises = data.Contents.map(async (item) => {
            const metadataParams = {
                Bucket: bucketName,
                Key: item.Key
            };

            try {
                const metadata = await s3.makeUnauthenticatedRequest('headObject', metadataParams).promise();
                return {
                    Key: item.Key,
                    LastModified: metadata.LastModified,
                    ContentLength: metadata.ContentLength,
                    ContentType: metadata.ContentType,
                    ETag: metadata.ETag
                };
            } catch (error) {
                console.error(`Error fetching metadata for key ${item.Key}:`, error);
                return null; // Return null if metadata fetch fails
            }
        });

        // Wait for all metadata promises to resolve
        const metadataResults = await Promise.all(metadataPromises);
        
        // Filter out any null results
        return metadataResults.filter(item => item !== null);
    } catch (error) {
        console.error('Error fetching S3 keys:', error);
        return [];
    }
}

// Call the function and log the keys and their metadata
fetchS3KeysAndMetadata().then(results => {
    console.log('Fetched S3 Keys and Metadata:', results);
}).catch(err => {
    console.error('Error:', err);
});