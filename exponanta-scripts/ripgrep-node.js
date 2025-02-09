const { rgPath } = require('vscode-ripgrep');
const { spawn } = require('child_process');

// Example: Search for the term "example" in the current directory
const searchTerm = "dataTables";
const rg = spawn(rgPath, ['-e', searchTerm, '.']);

rg.stdout.on('data', (data) => {
    console.log(`Output: ${data}`);
});

rg.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
});

rg.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
});