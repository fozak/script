async function saveCurrentPage() {
    // Get the full HTML content of the current document
    const content = document.documentElement.outerHTML;

    // Create a Blob from the content
    const blob = new Blob([content], { type: 'text/html' });

    // Create a link element to download the blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'currentPage.html'; // Default filename

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up the URL object
    URL.revokeObjectURL(link.href);
    console.log('Page saved successfully!');
}

// Save the page every 10 seconds
setInterval(saveCurrentPage, 10000);