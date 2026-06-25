const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = 3000;
const RG_PATH = process.env.RG_PATH || 'rg';
const COMMENTS_FILE = path.join(__dirname, 'comments.json');

function loadComments() {
  try { return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveComments(data) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    return;
  }

  if (url.pathname === '/comments' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadComments()));
    return;
  }

  if (url.pathname === '/comments' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { key, text } = JSON.parse(body);
        const data = loadComments();
        if (text) data[key] = text; else delete data[key];
        saveComments(data);
        res.writeHead(200);
        res.end('ok');
      } catch {
        res.writeHead(400);
        res.end('bad request');
      }
    });
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
