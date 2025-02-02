const fs = require('fs').promises; // Use fs.promises to work with promises
const path = require('path');

// Use the current directory
const directory = process.cwd();
const outputFilePath = path.join(directory, 'links.txt');

// Function to check file availability
const checkFileAvailability = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

// Function to read HTML files and check for resources
const checkResourcesInHtml = async (filePath, output) => {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Regular expressions for finding links to CSS and JS
    const linkPattern = /href="([^"]+)"/g;
    const scriptPattern = /src="([^"]+)"/g;

    let match;

    // Check CSS links
    while ((match = linkPattern.exec(content)) !== null) {
        const linkPath = path.join(directory, match[1]);
        if (!await checkFileAvailability(linkPath)) {
            output.push(`Missing resource: ${linkPath}`);
        }
    }

    // Check JS scripts
    while ((match = scriptPattern.exec(content)) !== null) {
        const scriptPath = path.join(directory, match[1]);
        if (!await checkFileAvailability(scriptPath)) {
            output.push(`Missing resource: ${scriptPath}`);
        }
    }
};

// Function to walk through the directory and check HTML files
const checkResources = async (dir, output) => {
    const files = await fs.readdir(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            // Recurse into subdirectories
            await checkResources(filePath, output);
        } else if (file.endsWith('.html')) {
            await checkResourcesInHtml(filePath, output);
        }
    }
};

// Main function to start checking resources and save output
const main = async () => {
    const output = [];
    await checkResources(directory, output);
    
    // Write the output to links.txt
    await fs.writeFile(outputFilePath, output.join('\n'), 'utf-8');

    // Log a message indicating completion
    console.log(`Resource check complete. Missing resources saved to ${outputFilePath}`);
};

// Execute the main function
main().catch(err => console.error(`Error: ${err}`));