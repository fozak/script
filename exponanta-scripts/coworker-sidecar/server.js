const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = 3000;
const RG_PATH = process.env.RG_PATH || 'rg'; // override with RG_PATH=/path/to/rg

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // serve index.html
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    return;
  }

  // SSE search endpoint: GET /search?pattern=foo&dir=/some/path
  if (url.pathname === '/search') {
    const pattern = url.searchParams.get('pattern') || '';
    const dir = url.searchParams.get('dir') || '.';

    if (!pattern) {
      res.writeHead(400);
      res.end('pattern required');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('start', { pattern, dir, ts: Date.now() });

    const proc = spawn(RG_PATH, ['--json', pattern, dir], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let buffer = '';

    proc.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          // only forward match and summary — skip begin/end/context
          if (msg.type === 'match' || msg.type === 'summary') {
            send(msg.type, msg.data);
          }
        } catch {}
      }
    });

    proc.stderr.on('data', chunk => {
      send('error', { message: chunk.toString() });
    });

    proc.on('close', code => {
      // flush remaining buffer
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer);
          if (msg.type === 'match' || msg.type === 'summary') {
            send(msg.type, msg.data);
          }
        } catch {}
      }
      send('done', { code });
      res.end();
    });

    // cancel if client disconnects
    req.on('close', () => proc.kill());
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`rg search server → http://localhost:${PORT}`);
  console.log(`rg binary: ${RG_PATH}`);
});
