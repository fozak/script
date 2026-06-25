const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = 3000;
const RG_PATH = process.env.RG_PATH || 'rg';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    return;
  }

  if (url.pathname === '/search') {
    const pattern = url.searchParams.get('pattern') || '';
    const dir = url.searchParams.get('dir') || '.';
    const rawArgs = url.searchParams.get('args') || '';
    const extraArgs = rawArgs ? rawArgs.trim().split(/\s+/) : [];

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

    send('start', { pattern, dir, args: extraArgs, ts: Date.now() });

    const proc = spawn(RG_PATH, ['--json', ...extraArgs, pattern, dir], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let buffer = '';

    proc.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'match' || msg.type === 'context' || msg.type === 'summary') {
            send(msg.type, msg.data);
          }
        } catch {}
      }
    });

    proc.stderr.on('data', chunk => {
      send('error', { message: chunk.toString() });
    });

    proc.on('close', code => {
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer);
          if (msg.type === 'match' || msg.type === 'context' || msg.type === 'summary') {
            send(msg.type, msg.data);
          }
        } catch {}
      }
      send('done', { code });
      res.end();
    });

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
