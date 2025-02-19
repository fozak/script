const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/') {
            // Serve editor interface
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>HTML Editor</title>
                    <style>
                        #controls { position: fixed; top: 10px; right: 10px; background: rgba(240,240,240,0.8); padding: 8px; }
                        #fileList { position: fixed; top: 10px; left: 10px; background: rgba(240,240,240,0.8); padding: 8px; }
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

                        async function loadFileList() {
                            const response = await fetch('/files');
                            const files = await response.json();
                            document.getElementById('fileList').innerHTML = 
                                '<h3>Files:</h3>' + files.map(file => 
                                    \`<div><a href="#" onclick="loadFile('\${file}')">\${file}</a></div>\`
                                ).join('');
                        }

                        async function loadFile(filename) {
                            currentFile = filename;
                            const response = await fetch(\`/file/\${filename}\`);
                            const content = await response.text();
                            document.open();
                            document.write(content);
                            document.close();

                            // Restore controls
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

                        function setupAutoSave() {
                            const observer = new MutationObserver(() => {
                                if (saveTimeout) clearTimeout(saveTimeout);
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

                        async function saveContent() {
                            if (!currentFile) return;

                            try {
                                const tmpDiv = document.createElement('div');
                                tmpDiv.appendChild(document.documentElement.cloneNode(true));
                                
                                const controlsToRemove = tmpDiv.querySelector('#controls');
                                const fileListToRemove = tmpDiv.querySelector('#fileList');
                                if (controlsToRemove) controlsToRemove.remove();
                                if (fileListToRemove) fileListToRemove.remove();

                                const content = '<!DOCTYPE html>\\n' + tmpDiv.innerHTML;

                                await fetch(\`/file/\${currentFile}\`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
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

                        loadFileList();
                    </script>
                </body>
                </html>
            `);
        }
        else if (req.url === '/files') {
            // List HTML files
            const files = await fs.readdir('html-files');
            const htmlFiles = files.filter(file => file.endsWith('.html'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(htmlFiles));
        }
        else if (req.url.startsWith('/file/')) {
            const filename = path.basename(req.url.slice(6));
            const filePath = path.join('html-files', filename);

            if (req.method === 'GET') {
                // Read file
                const content = await fs.readFile(filePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
            else if (req.method === 'POST') {
                // Save file
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const { content } = JSON.parse(body);
                        await fs.writeFile(filePath, content);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'saved' }));
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Error saving file' }));
                    }
                });
            }
        }
        else {
            res.writeHead(404);
            res.end('Not found');
        }
    } catch (err) {
        res.writeHead(500);
        res.end('Server error');
    }
});

const port = 3001;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
