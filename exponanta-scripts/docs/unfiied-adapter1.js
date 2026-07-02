const adapter = {
  doctype: "Adapter",
  name: "http-json",

  config: {
    base_url: "https://jsonplaceholder.typicode.com",
    timeout: 5000
  },

  functions: {
    pipeline: `
      async function (run_doc) {
        await this.start(run_doc);

        // 🔥 Operation name == function name
        const op = run_doc.operation;
        if (!this[op]) {
          throw new Error(\`Operation "\${op}" not supported by adapter \${this.name}\`);
        }

        await this[op](run_doc);

        await this.end(run_doc);
        return run_doc;
      }
    `,

    start: `
      async function (run_doc) {
        run_doc._pipeline.state = \`\${this.config.name}:start\`;
      }
    `,

    get_post: `
      async function (run_doc) {
        run_doc._pipeline.state = \`\${this.config.name}:get_post\`;

        const res = await fetch(
          this.config.base_url + '/posts/' + run_doc.input.id
        );
        const data = await res.json();

        run_doc.target = {
          doctype: "BlogPost",
          data: [{
            doctype: "BlogPost",
            name: "POST-" + data.id,
            post_id: data.id,
            user_id: data.userId,
            title: data.title,
            body: data.body
          }]
        };
      }
    `,

    create_post: `
      async function (run_doc) {
        run_doc._pipeline.state = \`\${this.config.name}:create_post\`;

        const res = await fetch(
          this.config.base_url + '/posts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: run_doc.input.title,
              body: run_doc.input.body,
              userId: run_doc.input.user_id || 1
            })
          }
        );

        const data = await res.json();

        run_doc.target = {
          doctype: "BlogPost",
          data: [{
            doctype: "BlogPost",
            name: "POST-" + data.id,
            post_id: data.id,
            user_id: data.userId,
            title: data.title,
            body: data.body
          }]
        };
      }
    `,

    end: `
      async function (run_doc) {
        run_doc._pipeline.state = \`\${this.config.name}:end\`;
      }
    `
  }
};

