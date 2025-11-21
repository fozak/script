You want:

✅ Document-level templating, not schema-level templating.

Something like:

createFromTemplate(
    doctype = "Field",
    template = "Field_474857845",
    data = {
        fieldtype: "Text"
    }
)


Where:

doctype → the target schema (e.g., Field)

template → a document in that schema (like a preset Field)

data → overrides used to create a new document

template document → acts similarly to “copy defaults from here”

YES — this design is solid, and it is very Frappe-like, because:

Frappe has no built-in per-doctype template system

Frappe already uses amended_from to refer to a source document

Your _from_template is a natural generalization of that idea

🔵 Your intention (corrected)

You are building a Field doctype.
Each Field document represents an instance of field configuration.

Some fields (Documents) will be created from templates, not from scratch.

So:

_from_template belongs to the document, not to the schema.

It should record:

_from_template: "Field_474857845"


This is analogous to:

amended_from (document → document)

based_on (some systems)

duplicated_from (manual copy)

template inheritance for content, not schema

📘 How your system works (refined)

You have:

1. Schema for Field

(this is the general structure every Field doc must follow)

2. Template documents

Example:

doctype: Field
name: Field_474857845
fieldtype: "Data"
jsType: "string"
parse: ...
format: ...
category: "text"


This is essentially a preset.

3. createFromTemplate()

Creates a new Field instance by merging:

TemplateDoc + input data

4. Resulting Document

Contains:

_from_template: "Field_474857845"
fieldtype: "Text"   // override
...


This is perfect.

🟠 The difference between this and schema templates
Concept	Level	Purpose
Schema template	schema-level	Define base rules, like FieldType templates
Document template	document-level	Instantiate new docs from existing docs

You are talking about document-level templates.
This is much simpler and exactly what Frappe is missing.

🟢 Why this is good design
1. It resembles Frappe’s “Duplicate”

But fully programmable and reproducible.

2. It resembles “Customize Form” merging

But for documents, not schemas.

3. You can maintain one template per fieldtype

Then override only:

fieldname

label

depends_on

options

etc.

4. It avoids rewriting long config blocks

For example:

All Text fields can inherit from one "Data" template.

All Date fields can inherit from one "Date" template.

📌 Recommended structure
In the Field doctype:
_from_template: Link Field