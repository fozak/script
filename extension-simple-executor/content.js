document.getElementById('execute').addEventListener('click', function() {
    const code = document.getElementById('code').value;

    try {
        // Create a new script element
        const script = document.createElement('script');

        // Set the script's content to the user's code
        script.type = 'text/javascript';
        script.textContent = code;

        // Append the script to the document body to execute it
        document.body.appendChild(script);

        // Optionally, remove the script after execution
        document.body.removeChild(script);
    } catch (error) {
        console.error('Error executing script:', error);
    }
});