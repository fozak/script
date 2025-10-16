Perfect! Here’s a mini-Mongoose-style hook system for any JS object or method, fully async, with pre/post hooks and conditional execution based on arguments:

1. Hook engine
function createHooks(obj) {
  const hooks = new Map();

  return {
    // Register hooks for a method
    hook(method, { pre, post, condition } = {}) {
      if (!hooks.has(method)) hooks.set(method, []);
      hooks.get(method).push({ pre, post, condition });

      // Wrap the original method once
      if (!obj[`__wrapped_${method}`]) {
        const original = obj[method].bind(obj);
        obj[`__wrapped_${method}`] = true;

        obj[method] = async function(...args) {
          const methodHooks = hooks.get(method) || [];

          // Run pre-hooks sequentially
          for (const { pre, condition } of methodHooks) {
            if (pre && (!condition || condition(...args))) await pre(...args);
          }

          // Call original method
          const result = await original(...args);

          // Run post-hooks sequentially
          for (const { post, condition } of methodHooks) {
            if (post && (!condition || condition(...args))) await post(result, ...args);
          }

          return result;
        };
      }
    }
  };
}

2. Usage example
const pbHooks = createHooks(pb);

// Add a pre-hook that only runs if arg2 === 'myarg'
pbHooks.hook('query', {
  condition: (arg1, arg2) => arg2 === 'myarg',
  pre: async (arg1, arg2) => {
    console.log('Pre-hook for myarg:', arg1, arg2);
    await new Promise(r => setTimeout(r, 500)); // simulate async
  },
  post: async (res, arg1, arg2) => {
    console.log('Post-hook:', res);
  }
});

// Normal calls stay the same
await pb.query('x', 'myarg'); // pre + post run
await pb.query('x', 'other'); // hooks skipped

3. Features

Pre-hooks: run before the main method; await ensures main waits.

Post-hooks: run after the main method; await ensures caller waits if needed.

Conditional: only run if arguments satisfy condition.

Async-compatible: works with Promises or async/await.

No code changes to original calls: all pb.query(...) calls automatically go through hooks.

Supports multiple hooks per method.

This is essentially how Mongoose middleware works, but generalized to any object and any method, and fully async/argument-aware.

If you want, I can extend this to support “pre-hook chaining” like Mongoose, where one hook can modify arguments for the next hook or the original function — it would mimic Mongoose almost perfectly.

Do you want me to do that?