// Create the overlay
const overlayHTML = `
<div id="overlay" style="position: fixed; right: 0; top: 0; width: 300px; height: 100%; background: rgba(255, 255, 255, 0.9); border-left: 1px solid #ccc; z-index: 1000; padding: 10px;">
    <h2>JS Executor</h2>
    <textarea id="jsInput" rows="10" style="width: 100%;"></textarea>
    <button id="executeButton" style="margin-top: 10px;">Execute</button>
    <pre id="consoleOutput" style="white-space: pre-wrap; background: #f4f4f4; padding: 10px; margin-top: 10px; border: 1px solid #ccc;"></pre>
</div>
`;

// Append the overlay to the body
document.body.insertAdjacentHTML('beforeend', overlayHTML);

// Get references to the elements
const jsInput = document.getElementById('jsInput');
const executeButton = document.getElementById('executeButton');
const consoleOutput = document.getElementById('consoleOutput');

// Indirect eval through an alias
const indirectEval = eval;

// Function to execute the JS code
executeButton.onclick = function() {
    try {
        // Capture the console output
        const originalConsoleLog = console.log;
        const output = [];
        console.log = function(message) {
            output.push(message);
            originalConsoleLog(message); // Also log to the original console
        };

        // Execute the code using indirect eval
        const result = indirectEval(jsInput.value);

        // Display the result
        consoleOutput.textContent = `Result: ${result}\nConsole Output:\n${output.join('\n')}`;

        // Restore original console.log
        console.log = originalConsoleLog;
    } catch (error) {
        consoleOutput.textContent = `Error: ${error.message}`;
    }
};