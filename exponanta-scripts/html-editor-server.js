const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve the editor interface
app.get('/', async (req, res) => {
    const editorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>HTML Editor</title>
        <style>
            #controls {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(240, 240, 240, 0.8);
                padding: 8px;
                border-radius: 4px;
                z-index: 1000;
            }
            #fileList {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(240, 240, 240, 0.8);
                padding: 8px;
                border-radius: 4px;
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div id="fileList"></div>
        <div id="controls">
            <span id="status">Select a file</span>
        </div>
        <script>
            let currentFile = null;
            let saveTimeout = null;

            // Load file list
            async function loadFileList() {
                const response = await fetch('/files');
                const files = await response.json();
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '<h3>Files:</h3>' + files.map(file => 
                    \`<div><a href="#" onclick="loadFile('\${file}')">\${file}</a></div>\`
                ).join('');
            }

            // Load file content
            async function loadFile(filename) {
                currentFile = filename;
                const response = await fetch(\`/file/\${filename}\`);
                const content = await response.text();
                document.open();
                document.write(content);
                document.close();

                // Restore controls and make editable
                const controls = document.createElement('div');
                controls.id = 'controls';
                controls.innerHTML = '<span id="status">Ready to edit</span>';
                document.body.appendChild(controls);

                const fileList = document.createElement('div');
                fileList.id = 'fileList';
                document.body.appendChild(fileList);
                loadFileList();

                document.body.contentEditable = 'true';
                setupAutoSave();
            }

            // Setup auto-save functionality
            function setupAutoSave() {
                const observer = new MutationObserver(() => {
                    if (saveTimeout) {
                        clearTimeout(saveTimeout);
                    }
                    document.getElementById('status').textContent = 'Editing...';
                    saveTimeout = setTimeout(saveContent, 1000);
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true
                });
            }

            // Save content back to server
            async function saveContent() {
                if (!currentFile) return;

                try {
                    // Clone the document and remove our UI elements
                    const tmpDiv = document.createElement('div');
                    tmpDiv.appendChild(document.documentElement.cloneNode(true));
                    
                    const controlsToRemove = tmpDiv.querySelector('#controls');
                    const fileListToRemove = tmpDiv.querySelector('#fileList');
                    if (controlsToRemove) controlsToRemove.remove();
                    if (fileListToRemove) fileListToRemove.remove();

                    const content = '<!DOCTYPE html>\\n' + tmpDiv.innerHTML;

                    await fetch(\`/file/\${currentFile}\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ content })
                    });

                    document.getElementById('status').textContent = 'Saved';
                    setTimeout(() => {
                        if (document.getElementById('status').textContent === 'Saved') {
                            document.getElementById('status').textContent = 'Ready to edit';
                        }
                    }, 2000);
                } catch (err) {
                    console.error('Error saving:', err);
                    document.getElementById('status').textContent = 'Save error!';
                }
            }

            // Initial load of file list
            loadFileList();
        </script>
    </body>
    </html>`;
    
    res.send(editorHtml);
});

// Get list of HTML files
app.get('/files', async (req, res) => {
    try {
        const files = await fs.readdir('html-files');
        const htmlFiles = files.filter(file => file.endsWith('.html'));
        res.json(htmlFiles);
    } catch (err) {
        res.status(500).json({ error: 'Error reading directory' });
    }
});

// Get file content
app.get('/file/:filename', async (req, res) => {
    try {
        const filePath = path.join('html-files', req.params.filename);
        const content = await fs.readFile(filePath, 'utf8');
        res.send(content);
    } catch (err) {
        res.status(500).json({ error: 'Error reading file' });
    }
});

// Save file content
app.post('/file/:filename', async (req, res) => {
    try {
        const filePath = path.join('html-files', req.params.filename);
        await fs.writeFile(filePath, req.body.content);
        res.json({ status: 'saved' });
    } catch (err) {
        res.status(500).json({ error: 'Error saving file' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
