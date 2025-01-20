// worker.js
self.onmessage = function(event) {
    const files = event.data;
    const fileInfoOutput = {};

    files.forEach(file => {
        const key = file.webkitRelativePath;//file.name; // Get the file name
        const relativePath = file.webkitRelativePath; // Get the relative path

        // Store only metadata
        fileInfoOutput[key] = {
            size: file.size,
            name: file.name,
            path: relativePath,
            last_modified: file.lastModifiedDate ? file.lastModifiedDate.toISOString() : null,
            created: new Date().toISOString(), // Note: Created date is not available in the browser
            format: file.type,
            mimetype: file.type,
            writable: true,
            type: "file" // Just marking as a file
        };
    });

    postMessage(fileInfoOutput); // Send the results back to the main thread
};