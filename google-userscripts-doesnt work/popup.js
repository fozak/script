document.addEventListener('DOMContentLoaded', async () => {
    const scriptInput = document.getElementById('script-input');
    const executeBtn = document.getElementById('execute-btn');
    const status = document.getElementById('status');

    // Load last used script from storage
    try {
        const { lastScript = '' } = await chrome.storage.local.get('lastScript');
        scriptInput.value = lastScript;
    } catch (error) {
        console.error('Failed to load last script:', error);
    }

    executeBtn.addEventListener('click', async () => {
        const script = scriptInput.value.trim();
        
        if (!script) {
            status.textContent = 'Please enter a script';
            status.style.color = '#f44336';
            return;
        }

        try {
            // Save script to storage
            await chrome.storage.local.set({ lastScript: script });

            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Execute the script using chrome.scripting API
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (scriptToExecute) => {
                    try {
                        return new Function(scriptToExecute)();
                    } catch (error) {
                        return { error: error.message };
                    }
                },
                args: [script]
            });

            status.textContent = 'Script executed successfully!';
            status.style.color = '#4CAF50';
        } catch (error) {
            status.textContent = 'Error: ' + error.message;
            status.style.color = '#f44336';
            console.error('Execution error:', error);
        }
    });
});
