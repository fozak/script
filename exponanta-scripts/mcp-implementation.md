

a full MCP-compliant example using Chrome content script as the Agent and background script as the MCP Host. The background script will expose a read_collection tool, allow only "public" IndexedDB collection, deny "private", and follow JSON-RPC / MCP conventions.

I’ll include:

Capability declaration (contract)

Tool invocation

Structured success and error

Async RPC handling

1️⃣ Background Script (MCP Host)
// background.js

const tools = {
  read_collection: {
    description: "Read from IndexedDB collection",
    input_schema: {
      type: "object",
      properties: { collection: { type: "string" } },
      required: ["collection"]
    },
    output_schema: {
      type: "object",
      properties: { items: { type: "array" } },
      required: ["items"]
    },
    allowed_collections: ["public"], // only allow public
    fn: async ({ collection }) => {
      if (!tools.read_collection.allowed_collections.includes(collection)) {
        throw {
          code: -32001,
          message: `permission_denied: collection '${collection}' is not allowed`,
          data: { allowed_collections: tools.read_collection.allowed_collections }
        };
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.open("myDB");
        request.onerror = () => reject({ code: -32002, message: "IndexedDB open failed" });
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(collection, "readonly");
          const store = tx.objectStore(collection);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => resolve({ items: getAllReq.result });
          getAllReq.onerror = () => reject({ code: -32003, message: "Read failed" });
        };
      });
    }
  }
};

// Send capability declaration to content scripts when requested
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.method === "mcp.get_capabilities") {
        // Return JSON-RPC compliant capabilities (contract)
        sendResponse({
          jsonrpc: "2.0",
          result: {
            tools: Object.fromEntries(
              Object.entries(tools).map(([name, t]) => [
                name,
                {
                  description: t.description,
                  input_schema: t.input_schema,
                  output_schema: t.output_schema,
                  allowed_collections: t.allowed_collections
                }
              ])
            )
          }
        });
      } else if (msg.method === "tool.invoke") {
        const tool = tools[msg.params.tool];
        if (!tool) throw { code: -32004, message: "unknown_tool" };
        const result = await tool.fn(msg.params.args);
        sendResponse({ jsonrpc: "2.0", id: msg.id, result });
      } else {
        sendResponse({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
      }
    } catch (error) {
      sendResponse({ jsonrpc: "2.0", id: msg.id, error });
    }
  })();
  return true; // keep channel open for async
});

2️⃣ Content Script (Agent)
// content.js

function callMCP(method, params) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ jsonrpc: "2.0", id: Date.now(), method, params }, resolve);
  });
}

async function initAgent() {
  // 1️⃣ Get capabilities (contract)
  const capRes = await callMCP("mcp.get_capabilities", {});
  console.log("MCP Capabilities / Contract:", capRes.result);

  // 2️⃣ Try reading the public collection (allowed)
  const publicRes = await callMCP("tool.invoke", {
    tool: "read_collection",
    args: { collection: "public" }
  });
  if (publicRes.result) console.log("Public Collection Items:", publicRes.result.items);
  else console.error("Error:", publicRes.error);

  // 3️⃣ Try reading the private collection (denied)
  const privateRes = await callMCP("tool.invoke", {
    tool: "read_collection",
    args: { collection: "private" }
  });
  if (privateRes.result) console.log("Private Collection Items:", privateRes.result.items);
  else console.error("Error:", privateRes.error);
}

// Start agent
initAgent();

3️⃣ Example JSON-RPC Message Exchange
3.1 Capability Declaration
{
  "jsonrpc": "2.0",
  "result": {
    "tools": {
      "read_collection": {
        "description": "Read from IndexedDB collection",
        "input_schema": { "type": "object", "properties": { "collection": { "type": "string" } }, "required": ["collection"] },
        "output_schema": { "type": "object", "properties": { "items": { "type": "array" } }, "required": ["items"] },
        "allowed_collections": ["public"]
      }
    }
  }
}

3.2 Tool Invocation (Allowed)

Client → Host:

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tool.invoke",
  "params": { "tool": "read_collection", "args": { "collection": "public" } }
}

Host → Client:

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "items": [ /* array of public items */ ] }
}

3.3 Tool Invocation (Denied)

Client → Host:

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tool.invoke",
  "params": { "tool": "read_collection", "args": { "collection": "private" } }
}


Host → Client:

{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32001,
    "message": "permission_denied: collection 'private' is not allowed",
    "data": { "allowed_collections": ["public"] }
  }
}


✅ Why this is MCP-compliant

Uses JSON-RPC 2.0 for all messages (jsonrpc, id, method, params, result / error)

Host exposes tool capabilities including description, input/output schema, allowed scope

Policy enforced dynamically by host — content script cannot bypass

Agent can query contract/capabilities and reason about permitted actions

Errors follow MCP / JSON-RPC structured format