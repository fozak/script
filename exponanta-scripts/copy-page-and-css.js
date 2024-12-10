async function fetchCSS(url) {
    const response = await fetch(url);
    return response.text();
}

async function copyCurrentPageWithCSS() {
    // Get the entire HTML of the current document
    let htmlContent = document.documentElement.outerHTML;

    // Create a temporary element to hold the CSS
    const tempDiv = document.createElement('div');
    const styles = [];

    // Iterate over all <link> elements to fetch external CSS
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let link of links) {
        const href = link.href;
        if (href) {
            try {
                const css = await fetchCSS(href);
                styles.push(css);
            } catch (error) {
                console.warn(`Could not fetch CSS from ${href}:`, error);
            }
        }
    }

    // Combine all styles into a <style> tag
    if (styles.length > 0) {
        const styleTag = `<style>${styles.join('\n')}</style>`;
        htmlContent = htmlContent.replace('</head>', `${styleTag}</head>`);
    }

    // Create a new Blob object with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // Create a link element to download the Blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'copied_page.html'; // Name of the downloaded file

    // Append the link to the body
    document.body.appendChild(link);
    
    // Programmatically click the link to trigger the download
    link.click();
    
    // Clean up by removing the link
    document.body.removeChild(link);
}

// Set a timeout of 5 seconds before copying the current page
setTimeout(() => {
    copyCurrentPageWithCSS();
}, 5000); // 5000 milliseconds = 5 seconds