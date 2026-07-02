{
  "_allowed": "",
  "_allowed_read": "",
  "adapter_name": "memory",
  "config": "{\"base_url\":\"https://jsonplaceholder.typicode.com\",\"timeout\":5000}",
  "doctype": "Adapter",
  "functions": "{\"get_post\":\"async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts/' + run_doc.input.id, { method: 'GET' }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }\",\"create_post\":\"async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: run_doc.input.title, body: run_doc.input.body, userId: run_doc.input.user_id || 1 }) }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }\"}",
  "id": "adapterypzff9x5",
  "is_default": 1,
  "name": "adapterypzff9x5"
}