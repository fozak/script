export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === '/api/items' && method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, type, content, position, author, created_at FROM items ORDER BY position ASC'
      ).all();
      return Response.json(results);
    }

    if (path === '/api/items' && method === 'POST') {
      const { type, content, position, author } = await request.json();
      if (!['index','html','note'].includes(type) || !content) {
        return new Response('Bad Request', { status: 400 });
      }
      await env.DB.prepare(
        'INSERT INTO items (type, content, position, author) VALUES (?, ?, ?, ?)'
      ).bind(type, content, position, author || null).run();
      return new Response('OK', { status: 201 });
    }

    const patchMatch = path.match(/^\/api\/items\/(\d+)$/);
    if (patchMatch && method === 'PATCH') {
      const { content } = await request.json();
      await env.DB.prepare(
        'UPDATE items SET content = ? WHERE id = ?'
      ).bind(content, Number(patchMatch[1])).run();
      return new Response('OK');
    }

    if (patchMatch && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(Number(patchMatch[1])).run();
      return new Response('OK');
    }

    return env.ASSETS.fetch(request);
  }
};
