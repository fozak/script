{
  "_autosave": 1,
  "schema_name": "Schema",
  "allow_import": 1,
  "allow_rename": 1,
  "autoname": "field:schema_name",
  "description": "Meta-schema that defines doctype structure",
  "doctype": "Schema",
  "field_order": [
    "basic_section",
    "schema_name",
    "name",
    "module",
    "description",
    "column_break_1",
    "icon",
    "image_field",
    "title_field",
    "behavior_section",
    "is_submittable",
    "_autosave",
    "track_changes",
    "allow_rename",
    "column_break_2",
    "allow_import",
    "quick_entry",
    "show_name_in_global_search",
    "fields_section",
    "field_order",
    "fields",
    "display_section",
    "search_fields",
    "route",
    "column_break_3",
    "sort_field",
    "sort_order",
    "permissions_section",
    "permissions",
    "links_section",
    "links",
    "actions_section",
    "actions",
    "docstatus",
    "owner",
    "_allowed",
    "_allowed_read",
    "autoname",
    "schema_name"
  ],
  "fields": [
    {
      "fieldname": "basic_section",
      "fieldtype": "Section Break",
      "label": "Basic Info"
    },
    {
      "bold": 1,
      "description": "The DocType this schema defines",
      "fieldname": "schema_name",
      "fieldtype": "Data",
      "in_list_view": 1,
      "in_standard_filter": 1,
      "label": "DocType",
      "reqd": 1,
      "unique": 1
    },
    {
      "description": "Unique identifier for this schema document",
      "fieldname": "name",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Schema Name",
      "reqd": 1,
      "unique": 1
    },
    {
      "fieldname": "module",
      "fieldtype": "Link",
      "in_list_view": 1,
      "in_standard_filter": 1,
      "label": "Module",
      "options": "Module",
      "reqd": 1
    },
    {
      "fieldname": "description",
      "fieldtype": "Text",
      "label": "Description"
    },
    {
      "fieldname": "column_break_1",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "icon",
      "fieldtype": "Data",
      "label": "Icon"
    },
    {
      "description": "Fieldname that contains image",
      "fieldname": "image_field",
      "fieldtype": "Data",
      "label": "Image Field"
    },
    {
      "description": "Field to use as document title",
      "fieldname": "title_field",
      "fieldtype": "Data",
      "label": "Title Field"
    },
    {
      "fieldname": "behavior_section",
      "fieldtype": "Section Break",
      "label": "Behavior"
    },
    {
      "default": "0",
      "fieldname": "is_submittable",
      "fieldtype": "Check",
      "label": "Is Submittable"
    },
    {
      "default": "1",
      "depends_on": "eval:doc.is_submittable===1",
      "description": "Only shown when is_submittable=1. Auto-save drafts in forms.",
      "fieldname": "_autosave",
      "fieldtype": "Check",
      "label": "Auto Save"
    },
    {
      "default": "0",
      "fieldname": "track_changes",
      "fieldtype": "Check",
      "label": "Track Changes"
    },
    {
      "default": "0",
      "fieldname": "allow_rename",
      "fieldtype": "Check",
      "label": "Allow Rename"
    },
    {
      "fieldname": "column_break_2",
      "fieldtype": "Column Break"
    },
    {
      "default": "0",
      "fieldname": "allow_import",
      "fieldtype": "Check",
      "label": "Allow Import"
    },
    {
      "default": "0",
      "fieldname": "quick_entry",
      "fieldtype": "Check",
      "label": "Quick Entry"
    },
    {
      "default": "0",
      "fieldname": "show_name_in_global_search",
      "fieldtype": "Check",
      "label": "Show Name in Global Search"
    },
    {
      "fieldname": "fields_section",
      "fieldtype": "Section Break",
      "label": "Fields"
    },
    {
      "description": "JSON array of fieldnames in display order",
      "fieldname": "field_order",
      "fieldtype": "Long Text",
      "label": "Field Order"
    },
    {
      "fieldname": "fields",
      "fieldtype": "Table",
      "label": "Fields",
      "options": "Schema Field",
      "reqd": 1
    },
    {
      "fieldname": "display_section",
      "fieldtype": "Section Break",
      "label": "Display & Search"
    },
    {
      "description": "Comma-separated field names",
      "fieldname": "search_fields",
      "fieldtype": "Data",
      "label": "Search Fields"
    },
    {
      "description": "Custom URL route",
      "fieldname": "route",
      "fieldtype": "Data",
      "label": "Route"
    },
    {
      "fieldname": "column_break_3",
      "fieldtype": "Column Break"
    },
    {
      "default": "modified",
      "fieldname": "sort_field",
      "fieldtype": "Data",
      "label": "Sort Field"
    },
    {
      "default": "DESC",
      "fieldname": "sort_order",
      "fieldtype": "Select",
      "label": "Sort Order",
      "options": "ASC\nDESC"
    },
    {
      "collapsible": 1,
      "fieldname": "permissions_section",
      "fieldtype": "Section Break",
      "label": "Permissions"
    },
    {
      "fieldname": "permissions",
      "fieldtype": "Table",
      "label": "Permissions",
      "options": "Schema Permission"
    },
    {
      "collapsible": 1,
      "fieldname": "links_section",
      "fieldtype": "Section Break",
      "label": "Links"
    },
    {
      "fieldname": "links",
      "fieldtype": "Table",
      "label": "Links",
      "options": "Schema Link"
    },
    {
      "collapsible": 1,
      "fieldname": "actions_section",
      "fieldtype": "Section Break",
      "label": "Actions"
    },
    {
      "fieldname": "actions",
      "fieldtype": "Table",
      "label": "Actions",
      "options": "Schema Action"
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
    },
    {
      "fieldname": "autoname",
      "fieldtype": "Data",
      "label": "Autoname"
    },
        {
      "fieldname": "schema_name",
      "fieldtype": "Data",
      "label": "Schema Name"
    }
  ],
  "icon": "fa fa-code",
  "id": "schemascherfnw8",
  "is_submittable": 0,
  "module": "Core",
  "name": "schemascherfnw8",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "export": 1,
      "import": 1,
      "read": 1,
      "role": "System Manager",
      "write": 1
    }
  ],
  "search_fields": "schema_name,name,module",
  "sort_field": "modified",
  "sort_order": "DESC",
  "title_field": "name",
  "track_changes": 1
}