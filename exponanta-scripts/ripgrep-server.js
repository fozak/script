const express = require('express');
const cors = require('cors'); // Add this line to include the cors module
const { rgPath } = require('vscode-ripgrep');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

// Enable CORS for all origins (for development; restrict in production!)
app.use(cors());
app.use(express.json()); // middleware to parse JSON request bodies

app.post('/search', (req, res) => {
    const searchTerm = req.body.searchTerm;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }

    // ** IMPORTANT:  VALIDATE AND SANITIZE searchTerm HERE BEFORE USING IT. Example below.
    const sanitizedSearchTerm = searchTerm.replace(/[^a-zA-Z0-9\s._-]/g, ''); // Simple example, enhance as needed.

    // ** IMPORTANT:  Restrict the search directory to prevent unintended access.  For example, if you want to allow searching a 'project' directory:
    const searchDirectory = './'; // Current directory.  CHANGE THIS FOR SECURITY.   e.g.,  './project'  or a more specific path.

    const rg = spawn(rgPath, ['-e', sanitizedSearchTerm, searchDirectory]);

    let output = '';
    let error = '';

    rg.stdout.on('data', (data) => {
        output += data.toString();
    });

    rg.stderr.on('data', (data) => {
        error += data.toString();
    });

    rg.on('close', (code) => {
        if (code === 0) {
            res.json({ output: output });
        } else {
            console.error(`Ripgrep process exited with code ${code}`);
            res.status(500).json({ error: error || `Ripgrep process exited with code ${code}` });
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
