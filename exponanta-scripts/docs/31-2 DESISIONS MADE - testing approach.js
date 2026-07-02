/* testing new doctype - Adapter that extends concept of doctypes */
/*manually create schema for Adapter doctype*/


await getSchema("Role")   // Role schema its small, so its easy to mutate it into Adapter schema

{
    "_schema_doctype": "Role",
    "actions": [],
    "allow_rename": 1,
    "autoname": "field:role_name",
    "creation": "2013-01-08 15:50:01",
    "doctype": "Schema",
    "document_type": "Document",
    "engine": "InnoDB",
    "field_order": [
        "role_name",
        "home_page",
        "restrict_to_domain",
        "column_break_4",
        "disabled",
        "is_custom",
        "desk_access",
        "two_factor_auth",
        "docstatus",
        "owner",
        "_allowed",
        "_allowed_read"
    ],
    "fields": [
        {
            "fieldname": "role_name",
            "fieldtype": "Data",
            "label": "Role Name",
            "oldfieldname": "role_name",
            "oldfieldtype": "Data",
            "reqd": 1,
            "unique": 1
        },
        {
            "default": "0",
            "description": "If disabled, this role will be removed from all users.",
            "fieldname": "disabled",
            "fieldtype": "Check",
            "label": "Disabled"
        },
        {
            "default": "1",
            "fieldname": "desk_access",
            "fieldtype": "Check",
            "in_list_view": 1,
            "label": "Desk Access"
        },
        {
            "default": "0",
            "fieldname": "two_factor_auth",
            "fieldtype": "Check",
            "label": "Two Factor Authentication"
        },
        {
            "fieldname": "restrict_to_domain",
            "fieldtype": "Link",
            "label": "Restrict To Domain",
            "options": "Domain"
        },
        {
            "description": "Route: Example \"/app\"",
            "fieldname": "home_page",
            "fieldtype": "Data",
            "label": "Home Page"
        },
        {
            "fieldname": "column_break_4",
            "fieldtype": "Column Break"
        },
        {
            "default": "0",
            "fieldname": "is_custom",
            "fieldtype": "Check",
            "in_list_view": 1,
            "label": "Is Custom"
        },
        {
            "default": "0",
            "fieldname": "docstatus",
            "fieldtype": "Int",
            "hidden": 1,
            "label": "Document Status",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "owner",
            "fieldtype": "Data",
            "hidden": 1,
            "label": "Created By",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "_allowed",
            "fieldtype": "JSON",
            "hidden": 1,
            "label": "Allowed Roles (Write)",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "_allowed_read",
            "fieldtype": "JSON",
            "hidden": 1,
            "label": "Allowed Roles (Read)",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        }
    ],
    "icon": "fa fa-bookmark",
    "id": "jzkvxsrrfwhpyfn",
    "idx": 1,
    "index_web_pages_for_search": 1,
    "links": [],
    "modified": "2024-09-19 17:07:08.672124",
    "modified_by": "Administrator",
    "module": "Core",
    "name": "Role",
    "naming_rule": "By fieldname",
    "owner": "Administrator",
    "permissions": [
        {
            "create": 1,
            "delete": 1,
            "email": 1,
            "print": 1,
            "read": 1,
            "report": 1,
            "role": "System Manager",
            "share": 1,
            "write": 1
        }
    ],
    "quick_entry": 1,
    "sort_field": "creation",
    "sort_order": "DESC",
    "states": [],
    "track_changes": 1,
    "translated_doctype": 1
}

//changing schema to Adapter (we dont use Schema YET to generate doctypes, so manual mutation is fine for now)
{
    "_schema_doctype": "Adapter",
    "actions": [],
    "allow_rename": 1,
    "autoname": "field:adapter_name",
    "creation": "2013-01-08 15:50:01",
    "doctype": "Schema",
    "document_type": "Document",
    "engine": "InnoDB",
    "field_order": [     //these are fileds of doctype based on this schema
        "id",
        "name",
        "adapter_name",
        "restrict_to_domain",
        "column_break_4",
        "disabled",
        "is_custom",
        "desk_access",
        "two_factor_auth",
        "docstatus",
        "owner",
        "_allowed",
        "_allowed_read",
        "config",
        "functions",
        "permissions"
    ],
    "fields": [
        {
            "fieldname": "adapter_name",
            "fieldtype": "Data",
            "label": "adapter Name",
            "oldfieldname": "adapter_name",
            "oldfieldtype": "Data",
            "reqd": 1,
            "unique": 1
        },
        {
            "default": "0",
            "description": "If disabled, this adapter will be removed from all users.",
            "fieldname": "disabled",
            "fieldtype": "Check",
            "label": "Disabled"
        },
        {
            "default": "0",
            "fieldname": "two_factor_auth",
            "fieldtype": "Check",
            "label": "Two Factor Authentication"
        },
        {
            "fieldname": "restrict_to_domain",
            "fieldtype": "Link",
            "label": "Restrict To Domain",
            "options": "Domain"
        },
        {
            "description": "Route: Example \"/app\"",
            "fieldname": "home_page",
            "fieldtype": "Data",
            "label": "Home Page"
        },
        {
            "fieldname": "column_break_4",
            "fieldtype": "Column Break"
        },
        {
            "default": "0",
            "fieldname": "is_custom",
            "fieldtype": "Check",
            "in_list_view": 1,
            "label": "Is Custom"
        },
        {
            "default": "0",
            "fieldname": "docstatus",
            "fieldtype": "Int",
            "hidden": 1,
            "label": "Document Status",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "owner",
            "fieldtype": "Data",
            "hidden": 1,
            "label": "Created By",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "_allowed",
            "fieldtype": "JSON",
            "hidden": 1,
            "label": "Allowed adapters (Write)",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        },
        {
            "fieldname": "_allowed_read",
            "fieldtype": "JSON",
            "hidden": 1,
            "label": "Allowed adapters (Read)",
            "no_copy": 1,
            "print_hide": 1,
            "read_only": 1
        }
    ],
    "icon": "fa fa-bookmark",
    "id": "schemaadaptht8e",
    "idx": 1,
    "index_web_pages_for_search": 1,
    "links": [],
    "modified": "2024-09-19 17:07:08.672124",
    "modified_by": "Administrator",
    "module": "Core",
    "name": "schemaadaptht8e",
    "naming_rule": "By fieldname",
    "owner": "",
    "permissions": [
        {
            "create": 1,
            "delete": 1,
            "email": 1,
            "print": 1,
            "read": 1,
            "report": 1,
            "role": "System Manager",
            "share": 1,
            "write": 1
        }
    ],
    "quick_entry": 1,
    "sort_field": "creation",
    "sort_order": "DESC",
    "states": [],
    "track_changes": 1,
    "translated_doctype": 1
}


/* generate manually the Adapter id=name=generateId("Schema", "Adapter") = schemaadaptht8e - just semantic id
/* put id and name of schema in the above schema object and save it as document */
/* owner = "" no owner */
/*DISCOVERED ISSUE and fixed from JSON doctype to code + options:*/

{
  "_schema_doctype": "Adapter",
  "actions": [],
  "allow_rename": 1,
  "autoname": "field:adapter_name",
  "creation": "2013-01-08 15:50:01",
  "doctype": "Schema",
  "document_type": "Document",
  "engine": "InnoDB",
  "field_order": [
    "id",
    "name",
    "adapter_name",
    "restrict_to_domain",
    "column_break_4",
    "disabled",
    "is_custom",
    "desk_access",
    "two_factor_auth",
    "docstatus",
    "owner",
    "_allowed",
    "_allowed_read",
    "config",
    "functions",
    "permissions"
  ],
  "fields": [
    {
      "fieldname": "adapter_name",
      "fieldtype": "Data",
      "label": "adapter Name",
      "oldfieldname": "adapter_name",
      "oldfieldtype": "Data",
      "reqd": 1,
      "unique": 1
    },
    {
      "default": "0",
      "description": "If disabled, this adapter will be removed from all users.",
      "fieldname": "disabled",
      "fieldtype": "Check",
      "label": "Disabled"
    },
    {
      "default": "0",
      "fieldname": "two_factor_auth",
      "fieldtype": "Check",
      "label": "Two Factor Authentication"
    },
    {
      "fieldname": "restrict_to_domain",
      "fieldtype": "Link",
      "label": "Restrict To Domain",
      "options": "Domain"
    },
    {
      "description": "Route: Example \"/app\"",
      "fieldname": "home_page",
      "fieldtype": "Data",
      "label": "Home Page"
    },
    {
      "fieldname": "column_break_4",
      "fieldtype": "Column Break"
    },
    {
      "default": "0",
      "fieldname": "is_custom",
      "fieldtype": "Check",
      "in_list_view": 1,
      "label": "Is Custom"
    },
    {
      "default": "0",
      "fieldname": "docstatus",
      "fieldtype": "Int",
      "hidden": 1,
      "label": "Document Status",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "owner",
      "fieldtype": "Data",
      "hidden": 1,
      "label": "Created By",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "_allowed",
      "fieldtype": "Code",
      "options": "JSON",
      "hidden": 1,
      "label": "Allowed adapters (Write)",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "_allowed_read",
      "fieldtype": "Code",
      "options": "JSON",
      "hidden": 1,
      "label": "Allowed adapters (Read)",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "config",
      "fieldtype": "Code",
      "options": "JSON",
      "label": "Adapter Configuration",
      "description": "Static or runtime configuration for the adapter"
    },
    {
      "fieldname": "functions",
      "fieldtype": "Code",
      "options": "JSON",
      "label": "Adapter Functions",
      "description": "Callable adapter functions or operation mappings"
    },
    {
      "fieldname": "permissions",
      "fieldtype": "Code",
      "options": "JSON",
      "label": "Adapter Permissions",
      "description": "Fine-grained permission rules beyond read/write"
    }
  ],
  "icon": "fa fa-bookmark",
  "id": "schemaadaptht8e",
  "idx": 1,
  "index_web_pages_for_search": 1,
  "links": [],
  "modified": "2024-09-19 17:07:08.672124",
  "modified_by": "Administrator",
  "module": "Core",
  "name": "schemaadaptht8e",
  "naming_rule": "By fieldname",
  "owner": "",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "email": 1,
      "print": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    }
  ],
  "quick_entry": 1,
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 1,
  "translated_doctype": 1
}


/*schema manualy put in the database as document as there is no clone etc YET*/
/* now its avalably by getSchema("Adapter") */

/*then we can create

await coworker.run({
  operation: 'create',
  doctype: 'Adapter',
  input: { adapter_name: 'JSONPlaceholder' }
});

/*then we can select*/

const result = await coworker.run({
  operation: "select",        // CRUD operation
  doctype: "Adapter",         // target doctype
  query: {
    where: {
      adapter_name: "JSONPlaceholder" // your filter
    }
  }
});

/* TAKEONE IS BETTER it loads FULL DATA, not in_list_view fields only */
const result = await coworker.run({
  operation: "takeone",        // CRUD operation
  doctype: "Adapter",         // target doctype
  query: {
    where: {
      adapter_name: "JSONPlaceholder" // your filter
    }
  }
});


/*now we can update */
const result = await coworker.run({
  operation: "update",        // CRUD operation
  doctype: "Adapter",         // target doctype
  query: {
    where: {
      adapter_name: "JSONPlaceholder" // your filter
    }
  },
  input:
    { config: { baseUrl: "https://jsonplaceholder.typicode.com" } }

});

/*FIXIT ERROR - going like object */
/*
"config": "[object Object]" issue is classic JS → PocketBase serialization problem. Let me break it down step by step.

1️⃣ Why [object Object] happens

When you do:

input: { config: { baseUrl: "https://jsonplaceholder.typicode.com" } }


coworker.run (or your PocketBase adapter) eventually PATCHes the record via fetch.

PocketBase stores fields as strings in its Text / JSON-like fields.

If you pass a plain JS object, and the adapter does:

body: JSON.stringify(input)


That is fine for top-level JSON. But if somewhere internally your adapter does:

record.config = input.config; // assigns object to a Text field


PocketBase doesn’t automatically stringify it.

JS coerces object → string → "[object Object]".

✅ So "[object Object]" is just JS saying: “you assigned an object where a string is expected”.

2️⃣ How to fix it

You need to serialize the object to a JSON string before passing to PocketBase (or in your coworker.run input).

Example:

const result = await coworker.run({
  operation: "update",
  doctype: "Adapter",
  query: {
    where: { adapter_name: "JSONPlaceholder" }
  },
  input: {
    config: JSON.stringify({
      baseUrl: "https://jsonplaceholder.typicode.com"
    })
  }
});


Now PocketBase receives a string:

"{\"baseUrl\":\"https://jsonplaceholder.typicode.com\"}"


When you fetch it later, you can JSON.parse(config) to get back your JS object.

3️⃣ Optional: automatic serialization in coworker.run

If you want coworker.run to handle this for all Code/JSON fields (so you can just pass objects directly):

for (const key of ["config", "functions", "permissions"]) {
  if (input[key] && typeof input[key] === "object") {
    input[key] = JSON.stringify(input[key]);
  }
}


Insert this just before the _dbCreate / _dbUpdate call inside your PocketBase adapter.

Then you can always do:

input: { config: { baseUrl: "..." } }


without worrying about [object Object].

4️⃣ Reading the value

When fetching the record:

const adapter = result.output.data[0];
const config = JSON.parse(adapter.config);
console.log(config.baseUrl);


So the key takeaway:

PocketBase / coworker → Text field stores strings only

Always JSON.stringify JS objects before saving

Always JSON.parse when reading

If you want, I can write a drop-in fix for coworker.run("update") that automatically serializes any Code/JSON fields, so you never get [object Object] again.

Do you want me to do that?

i see "config": "{\"baseUrl\":\"https://jsonplaceholder.typicode.com\"}",

Perfect — that means the object is now properly serialized as a JSON string. ✅

"config": "{\"baseUrl\":\"https://jsonplaceholder.typicode.com\"}" is exactly what you want in PocketBase/Text fields.

You don’t want [object Object] anymore.

How to use it in JS

When you read it back from PocketBase / coworker:

const adapter = result.output.data[0];

// Parse JSON string back into object
const config = JSON.parse(adapter.config);

console.log(config.baseUrl); 
// → "https://jsonplaceholder.typicode.com"


This is standard: serialize before saving, parse after reading.

Same applies to your functions or permissions fields.
*/



"functions": {
    "get_post": "async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts/' + run_doc.input.id, { method: 'GET' }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }",
    "create_post": "async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: run_doc.input.title, body: run_doc.input.body, userId: run_doc.input.user_id || 1 }) }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }"
  }


  await coworker.run({
  operation: "update",
  doctype: "Adapter",
  query: { where: { adapter_name: "JSONPlaceholder" }},

  input: {
    config: JSON.stringify({
      base_url: "https://jsonplaceholder.typicode.com",
      timeout: 5000
    }),
    functions: JSON.stringify({
 "get_post": "async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts/' + run_doc.input.id, { method: 'GET' }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }",
    "create_post": "async function(run_doc) { const response = await fetch(run_doc.adapter.config.base_url + '/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: run_doc.input.title, body: run_doc.input.body, userId: run_doc.input.user_id || 1 }) }); const data = await response.json(); run_doc.target.doctype = 'BlogPost'; run_doc.target.data = [{ doctype: 'BlogPost', name: generateId('BlogPost'), post_id: data.id, user_id: data.userId, title: data.title, body: data.body }]; return run_doc; }"

    })
  }
});

//WE have added is_default
  await coworker.run({
  operation: "update",
  doctype: "Adapter",
  query: { where: { adapter_name: "JSONPlaceholder" }},

  input: {
    is_default: 1    },
    
});
