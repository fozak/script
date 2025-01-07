document.getElementById('inject-button').addEventListener('click', async () => {
    const script = document.getElementById('script-input').value;
    const USER_SCRIPT_ID = 'custom-script'; // Unique identifier for the user script

    if (script) {
        try {
            // Retrieve existing scripts
            const existingScripts = await chrome.userScripts.getAll();

            // Check if the script with the same ID is already registered
            const existingScript = existingScripts.find(s => s.id === USER_SCRIPT_ID);

            // If it exists, unregister it to avoid the duplicate ID error
            if (existingScript) {
                await chrome.userScripts.unregister(USER_SCRIPT_ID);
                alert('Previous script unregistered successfully.');
            }

            // Register the new user script to run on all domains
            await chrome.userScripts.register([
                {
                    id: USER_SCRIPT_ID,
                    matches: ['<all_urls>'], // This allows the script to run on any domain
                    js: [{ code: script }]
                }
            ]);

            // Inform the user that the script has been registered
            alert('Script registered successfully! It will run on all domains.');

            // Optionally execute the script immediately on the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: new Function(script) // Execute the script as a function
            });

            alert('Script executed in the active tab!');
        } catch (error) {
            console.error('Failed to register or execute script:', error);
            alert('Error: ' + error.message);
        }
    } else {
        alert('Please enter a script to inject.');
    }
});