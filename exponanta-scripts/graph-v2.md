


I am storing and using Frappe like schemas in the Pocketbase. But they are interlinked and invividual
Intread of unique schemas I have create 2 new universal to have graph-like approach:
Node and Node link. I have have  schema delegation (doctypes) into it. But now the linking is universal like
node:
id: Node-jc6b8mg9y1rpzj9
{
  "docsubtype": "Company",
  "from_node_doctype": "Company",
  "from_node_name": null,
  "name": "Company-vdfs38e8erfef83"
}
node-link:
id: Node-Link-lofi11o4eqi2oof
{
  "from_node_doctype": "Issue",
  "from_node_name": "ISS-2025-00004",
  "parent": "Node-jc6b8mg9y1rpzj9",
  "parentfield": "node_links",
  "parenttype": "Node"
}

where specific schemas are referenced in doctypes

what are benefits and disadvantages of this 




 