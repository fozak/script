document.getElementById('inject-button').addEventListener('click', async () => {
    const script = document.getElementById('script-input').value;
    const USER_SCRIPT_ID = 'custom-script'; // Unique identifier for the user script

    if (script) {
        try {
            // Unregister the existing script if needed
            try {
                await chrome.userScripts.unregister(USER_SCRIPT_ID);
                alert('Previous script unregistered successfully.');
            } catch (e) {
                // Ignore errors if the script was not previously registered
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
            chrome.userScripts.onBeforeScriptExecute.addListener((details) => {
                if (details.scriptId === USER_SCRIPT_ID) {
                    alert('Script executed in the active tab!');
                }
            });

        } catch (error) {
            console.error('Failed to register or execute script:', error);
            alert('Error: ' + error.message);
        }
    } else {
        alert('Please enter a script to inject.');
    }
});