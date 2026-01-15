
/*DONT give code, advice
/* CURRENT SITUATION: operations implemented the usage of exact frappe-type 
* 
*
*
*/

/* GOALS:
* WHAT:
*1. Instead of writing js module, Implement complete sets of js functions and behavoius and capabilities (earlier hardcoded as js
* as loadable json documents based on one json schema that extends current schema of doctypes.
*2. Implement loading as stardard operation: run(select, doctype=Adapter..., where {full_name=httpfetch}, options: {init=true}) 
* that loads data and makes functions available for global scope
*3. After loading the then the functions are callable as operations run(post, input:{}, options:{adapter: 'httpfetch'}), 
*. the operation post <-> invariant to function in adapter and vs versa making it easier to validate operations syntax
*4. Data of configuration is stores in this full_name=httpfetch document of doctype=Adapter as well as capabilities
*5. Capabilitie are implemented as extention of permission like read, write, create, delete and becoming 
*6. User _allow field becoming RBAC for capabilities of adapters. like _allowed: ['rolehttppost', 'roles3storage']

/* HOW:
* introduce new doctype = Adapter and its schema that has the following NEW fields:
* 1. fieldname = functions, fieldtype =json, the array of functions that stored as strings*/
{
  "functions": {
    "post": "async function(input, options) { /* POST logic */ }",
    "get": "async function(input, options) { /* GET logic */ }",
    "put": "async function(input, options) { /* PUT logic */ }",
    "delete": "async function(input, options) { /* DELETE logic */ }"
  }
}
/* 2. permissions in doctype are now copied from generic schema of doctype=Adapter
into each doctype and customized by adding capabilities like Section of doctype=Adapter..., where {full_name=httpfetch}*/ 
"permissions": [
  {
   "create": 1,
   "delete": 1,
   "email": 1,
   "export": 1,
   "get": 1,   //EXACT FUNCTION NAME
   "import": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "System Manager", //USING EXISTIG ROLES
   "share": 1,
   "write": 1
  },
  {
   "permlevel": 1,
   "read": 1,
   "get": 1,   //EXACT FUNCTION NAME
   "role": "System Manager",
   "write": 1
  },
  {
    "get": 1,   //EXACT FUNCTION NAME
   "read": 1,
   "role": "Http Get User",  //NEW ROLE
   "role": "Desk User",
   "select": 1
  }
 ],

/* then capabilities are assigned to users via Existing or new roles doctype=User..., where {full_name=httpfetch}*/
/* HOW its ralated to current system