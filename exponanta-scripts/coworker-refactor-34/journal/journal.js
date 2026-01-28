/* state
* decided to have the state 

/* PLAN lets move */

const fsmConfig = {
  "states": {
    "docstatus": {
      "options": [0, 1, 2],
      "transitions": {
        "0": [1],
        "1": [2],
        "2": []
      }
    },
    "dirty": {
      "options": [0, 1],
      "transitions": {
        "0": [1],
        "1": [0]
      }
    },
    "validating": {
      "options": ["idle", "validating", "valid", "validatingErrors"],
      "transitions": {
        "idle": ["validating"],
        "validating": ["valid", "validatingErrors"],
        "valid": ["idle"],
        "validatingErrors": ["idle"]
      }
    },
    "saving": {
      "options": ["idle", "saving", "saved", "savingErrors"],
      "transitions": {
        "idle": ["saving"],
        "saving": ["saved", "savingErrors"],
        "saved": ["idle"],
        "savingErrors": ["idle"]
      }
    },
    "submitting": {
      "options": ["idle", "submitting", "submitted", "submittingErrors"],
      "transitions": {
        "idle": ["submitting"],
        "submitting": ["submitted", "submittingErrors"],
        "submitted": ["idle"],
        "submittingErrors": ["idle"]
      }
    },
    "cancelling": {
      "options": ["idle", "cancelling", "cancelled", "cancellingErrors"],
      "transitions": {
        "idle": ["cancelling"],
        "cancelling": ["cancelled", "cancellingErrors"],
        "cancelled": ["idle"],
        "cancellingErrors": ["idle"]
      }
    },
    "is_submittable": {
      "options": [0, 1],
      "transitions": {
        "0": [],
        "1": []
      }
    },
    "autosave_enabled": {
      "options": [0, 1],
      "transitions": {
        "0": [],
        "1": []
      }
    }
  },
  
  "rules": {
    "docstatus": {
      "0_to_1": {
        "requires": {
          "dirty": 0,
          "validating": "valid",
          "saving": "idle",
          "submitting": "idle"
        }
      },
      "1_to_2": {
        "requires": {
          "saving": "idle",
          "submitting": "idle",
          "cancelling": "idle"
        }
      }
    },
    "dirty": {
      "0_to_1": {
        "requires": {
          "docstatus": 0
        }
      },
      "1_to_0": {
        "requires": {
          "saving": ["saved", "idle"]
        }
      }
    },
    "validating": {
      "idle_to_validating": {
        "requires": {
          "saving": "idle",
          "submitting": "idle",
          "cancelling": "idle"
        }
      }
    },
    "saving": {
      "idle_to_saving": {
        "requires": {
          "docstatus": 0,
          "dirty": 1,
          "validating": "valid",
          "submitting": "idle",
          "cancelling": "idle"
        }
      }
    },
    "submitting": {
      "idle_to_submitting": {
        "requires": {
          "docstatus": 0,
          "dirty": 0,
          "validating": "valid",
          "saving": "idle",
          "cancelling": "idle"
        }
      }
    },
    "cancelling": {
      "idle_to_cancelling": {
        "requires": {
          "docstatus": 1,
          "saving": "idle",
          "submitting": "idle"
        }
      }
    }
  },
  
  "sequences": {
    "save": {
      "steps": [
        {
          "transitions": [
            { "state": "saving", "value": "saving" }
          ]
        },
        {
          "execute": "validate",
          "onSuccess": [
            { "state": "validating", "value": "valid" }
          ],
          "onFailure": [
            { "state": "validating", "value": "validatingErrors" },
            { "state": "saving", "value": "savingErrors" },
            { "state": "saving", "value": "idle" },
            { "stop": true }
          ]
        },
        {
          "execute": "dbSave",
          "onSuccess": [
            { "state": "saving", "value": "saved" },
            { "state": "dirty", "value": 0 }
          ],
          "onFailure": [
            { "state": "saving", "value": "savingErrors" },
            { "state": "saving", "value": "idle" },
            { "stop": true }
          ]
        },
        {
          "transitions": [
            { "state": "saving", "value": "idle" }
          ]
        }
      ]
    },
    
    "submit": {
      "steps": [
        {
          "transitions": [
            { "state": "submitting", "value": "submitting" }
          ]
        },
        {
          "execute": "validate",
          "onSuccess": [
            { "state": "validating", "value": "valid" }
          ],
          "onFailure": [
            { "state": "validating", "value": "validatingErrors" },
            { "state": "submitting", "value": "submittingErrors" },
            { "state": "submitting", "value": "idle" },
            { "stop": true }
          ]
        },
        {
          "execute": "dbSubmit",
          "onSuccess": [
            { "state": "docstatus", "value": 1 },
            { "state": "submitting", "value": "submitted" }
          ],
          "onFailure": [
            { "state": "submitting", "value": "submittingErrors" },
            { "state": "submitting", "value": "idle" },
            { "stop": true }
          ]
        },
        {
          "transitions": [
            { "state": "submitting", "value": "idle" }
          ]
        }
      ]
    },
    
    "cancel": {
      "steps": [
        {
          "transitions": [
            { "state": "cancelling", "value": "cancelling" }
          ]
        },
        {
          "execute": "dbCancel",
          "onSuccess": [
            { "state": "docstatus", "value": 2 },
            { "state": "cancelling", "value": "cancelled" }
          ],
          "onFailure": [
            { "state": "cancelling", "value": "cancellingErrors" },
            { "state": "cancelling", "value": "idle" },
            { "stop": true }
          ]
        },
        {
          "transitions": [
            { "state": "cancelling", "value": "idle" }
          ]
        }
      ]
    },
    
    "validate": {
      "steps": [
        {
          "transitions": [
            { "state": "validating", "value": "validating" }
          ]
        },
        {
          "execute": "validateDocument",
          "onSuccess": [
            { "state": "validating", "value": "valid" }
          ],
          "onFailure": [
            { "state": "validating", "value": "validatingErrors" },
            { "stop": true }
          ]
        },
        {
          "transitions": [
            { "state": "validating", "value": "idle" }
          ]
        }
      ]
    }
  }
};

// Create FSM document
const result = await coworker.run({
  operation: "create",
  doctype: "FSM",
  input: {
    name: "Document_FSM",
    ...fsmConfig
  }
});

console.log("FSM created:", result.target.data[0].name);


Doctype schema 

{
    "_schema_doctype": "DocType",
    "actions": [],
    "allow_rename": 1,
    "autoname": "Prompt",
    "creation": "2013-02-18 13:36:19",
    "description": "DocType is a Table / Form in the application./Changed",
    "doctype": "Schema",
    "document_type": "Document",
    "engine": "InnoDB",
    "field_order": [
        "form_builder_tab",
        "form_builder",
        "permissions_tab",
        "permissions",
        "restrict_to_domain",
        "read_only",
        "in_create",
        "protect_attached_files",
        "sb1",
        "naming_rule",
        "autoname",
        "column_break_nexu",
        "title_field",
        "allow_rename",
        "settings_tab",
        "sb0",
        "module",
        "is_submittable",
        "istable",
        "issingle",
        "is_tree",
        "is_calendar_and_gantt",
        "editable_grid",
        "quick_entry",
        "grid_page_length",
        "cb01",
        "track_changes",
        "track_seen",
        "track_views",
        "custom",
        "beta",
        "is_virtual",
        "queue_in_background",
        "description",
        "form_settings_section",
        "image_field",
        "timeline_field",
        "nsm_parent_field",
        "max_attachments",
        "documentation",
        "column_break_23",
        "hide_toolbar",
        "allow_copy",
        "allow_import",
        "allow_events_in_timeline",
        "allow_auto_repeat",
        "make_attachments_public",
        "view_settings",
        "show_title_field_in_link",
        "translated_doctype",
        "search_fields",
        "default_print_format",
        "sort_field",
        "sort_order",
        "default_view",
        "force_re_route_to_default_view",
        "column_break_29",
        "document_type",
        "icon",
        "color",
        "show_preview_popup",
        "show_name_in_global_search",
        "email_settings_sb",
        "default_email_template",
        "column_break_51",
        "email_append_to",
        "sender_field",
        "sender_name_field",
        "subject_field",
        "fields_tab",
        "fields_section",
        "fields",
        "actions_section",
        "actions",
        "links_section",
        "links",
        "document_states_section",
        "states",
        "web_view",
        "has_web_view",
        "allow_guest_to_view",
        "index_web_pages_for_search",
        "route",
        "is_published_field",
        "website_search_field",
        "advanced",
        "engine",
        "migration_hash",
        "row_format",
        "connections_tab",
        "docstatus",
        "owner",
        "_allowed",
        "_allowed_read"
    ],
    "fields": [
        {
            "fieldname": "sb0",
            "fieldtype": "Section Break",
            "oldfieldtype": "Section Break"
        },
        {
            "fieldname": "module",
            "fieldtype": "Link",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "label": "Module",
            "oldfieldname": "module",
            "oldfieldtype": "Link",
            "options": "Module Def",
            "reqd": 0,
            "search_index": 1
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "Once submitted, submittable documents cannot be changed. They can only be Cancelled and Amended.",
            "fieldname": "is_submittable",
            "fieldtype": "Check",
            "label": "Is Submittable"
        },
        {
            "default": "0",
            "description": "Child Tables are shown as a Grid in other DocTypes",
            "fieldname": "istable",
            "fieldtype": "Check",
            "in_standard_filter": 1,
            "label": "Is Child Table",
            "oldfieldname": "istable",
            "oldfieldtype": "Check"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "Single Types have only one record no tables associated. Values are stored in tabSingles",
            "fieldname": "issingle",
            "fieldtype": "Check",
            "in_standard_filter": 1,
            "label": "Is Single",
            "oldfieldname": "issingle",
            "oldfieldtype": "Check",
            "set_only_once": 1
        },
        {
            "default": "1",
            "depends_on": "istable",
            "fieldname": "editable_grid",
            "fieldtype": "Check",
            "label": "Editable Grid"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "Open a dialog with mandatory fields to create a new record quickly. There must be at least one mandatory field to show in dialog.",
            "fieldname": "quick_entry",
            "fieldtype": "Check",
            "label": "Quick Entry"
        },
        {
            "fieldname": "cb01",
            "fieldtype": "Column Break"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "If enabled, changes to the document are tracked and shown in timeline",
            "fieldname": "track_changes",
            "fieldtype": "Check",
            "label": "Track Changes"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "If enabled, the document is marked as seen, the first time a user opens it",
            "fieldname": "track_seen",
            "fieldtype": "Check",
            "label": "Track Seen"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "If enabled, document views are tracked, this can happen multiple times",
            "fieldname": "track_views",
            "fieldtype": "Check",
            "label": "Track Views"
        },
        {
            "default": "0",
            "fieldname": "custom",
            "fieldtype": "Check",
            "label": "Custom?"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "fieldname": "beta",
            "fieldtype": "Check",
            "label": "Beta"
        },
        {
            "fieldname": "fields",
            "fieldtype": "Table",
            "label": "Fields",
            "oldfieldname": "fields",
            "oldfieldtype": "Table",
            "options": "DocField"
        },
        {
            "fieldname": "sb1",
            "fieldtype": "Tab Break",
            "label": "Naming"
        },
        {
            "fieldname": "autoname",
            "fieldtype": "Data",
            "label": "Auto Name",
            "oldfieldname": "autoname",
            "oldfieldtype": "Data"
        },
        {
            "fieldname": "description",
            "fieldtype": "Small Text",
            "label": "Description",
            "oldfieldname": "description",
            "oldfieldtype": "Text"
        },
        {
            "collapsible": 1,
            "depends_on": "eval:!doc.istable",
            "fieldname": "form_settings_section",
            "fieldtype": "Section Break",
            "label": "Form Settings"
        },
        {
            "description": "Must be of type \"Attach Image\"",
            "fieldname": "image_field",
            "fieldtype": "Data",
            "label": "Image Field"
        },
        {
            "depends_on": "eval:!doc.istable",
            "description": "Comments and Communications will be associated with this linked document",
            "fieldname": "timeline_field",
            "fieldtype": "Data",
            "label": "Timeline Field"
        },
        {
            "fieldname": "max_attachments",
            "fieldtype": "Int",
            "label": "Max Attachments",
            "oldfieldname": "max_attachments",
            "oldfieldtype": "Int"
        },
        {
            "fieldname": "column_break_23",
            "fieldtype": "Column Break"
        },
        {
            "default": "0",
            "fieldname": "hide_toolbar",
            "fieldtype": "Check",
            "label": "Hide Sidebar, Menu, and Comments",
            "oldfieldname": "hide_toolbar",
            "oldfieldtype": "Check"
        },
        {
            "default": "0",
            "fieldname": "allow_copy",
            "fieldtype": "Check",
            "label": "Hide Copy",
            "oldfieldname": "allow_copy",
            "oldfieldtype": "Check"
        },
        {
            "default": "1",
            "fieldname": "allow_rename",
            "fieldtype": "Check",
            "label": "Allow Rename",
            "oldfieldname": "allow_rename",
            "oldfieldtype": "Check"
        },
        {
            "default": "0",
            "fieldname": "allow_import",
            "fieldtype": "Check",
            "label": "Allow Import (via Data Import Tool)"
        },
        {
            "default": "0",
            "fieldname": "allow_events_in_timeline",
            "fieldtype": "Check",
            "label": "Allow events in timeline"
        },
        {
            "default": "0",
            "fieldname": "allow_auto_repeat",
            "fieldtype": "Check",
            "label": "Allow Auto Repeat"
        },
        {
            "collapsible": 1,
            "depends_on": "eval:!doc.istable",
            "fieldname": "view_settings",
            "fieldtype": "Section Break",
            "label": "View Settings"
        },
        {
            "depends_on": "eval:!doc.istable",
            "fieldname": "title_field",
            "fieldtype": "Data",
            "label": "Title Field",
            "mandatory_depends_on": "eval:doc.show_title_field_in_link"
        },
        {
            "depends_on": "eval:!doc.istable",
            "fieldname": "search_fields",
            "fieldtype": "Data",
            "label": "Search Fields",
            "oldfieldname": "search_fields",
            "oldfieldtype": "Data"
        },
        {
            "fieldname": "default_print_format",
            "fieldtype": "Data",
            "label": "Default Print Format"
        },
        {
            "default": "creation",
            "depends_on": "eval:!doc.istable",
            "fieldname": "sort_field",
            "fieldtype": "Data",
            "label": "Default Sort Field"
        },
        {
            "default": "DESC",
            "depends_on": "eval:!doc.istable",
            "fieldname": "sort_order",
            "fieldtype": "Select",
            "label": "Default Sort Order",
            "options": "ASC\nDESC"
        },
        {
            "fieldname": "column_break_29",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "document_type",
            "fieldtype": "Select",
            "label": "Show in Module Section",
            "oldfieldname": "document_type",
            "oldfieldtype": "Select",
            "options": "\nDocument\nSetup\nSystem\nOther"
        },
        {
            "fieldname": "icon",
            "fieldtype": "Data",
            "label": "Icon"
        },
        {
            "fieldname": "color",
            "fieldtype": "Data",
            "label": "Color"
        },
        {
            "default": "0",
            "fieldname": "show_preview_popup",
            "fieldtype": "Check",
            "label": "Show Preview Popup"
        },
        {
            "default": "0",
            "fieldname": "show_name_in_global_search",
            "fieldtype": "Check",
            "label": "Make \"name\" searchable in Global Search"
        },
        {
            "fieldname": "permissions",
            "fieldtype": "Table",
            "label": "Permissions",
            "oldfieldname": "permissions",
            "oldfieldtype": "Table",
            "options": "DocPerm"
        },
        {
            "fieldname": "restrict_to_domain",
            "fieldtype": "Link",
            "label": "Restrict To Domain",
            "options": "Domain"
        },
        {
            "default": "0",
            "fieldname": "read_only",
            "fieldtype": "Check",
            "label": "User Cannot Search",
            "oldfieldname": "read_only",
            "oldfieldtype": "Check"
        },
        {
            "default": "0",
            "fieldname": "in_create",
            "fieldtype": "Check",
            "label": "User Cannot Create",
            "oldfieldname": "in_create",
            "oldfieldtype": "Check"
        },
        {
            "collapsible": 1,
            "depends_on": "eval:doc.custom===0 && !doc.istable",
            "fieldname": "web_view",
            "fieldtype": "Tab Break",
            "label": "Web View"
        },
        {
            "default": "0",
            "fieldname": "has_web_view",
            "fieldtype": "Check",
            "label": "Has Web View"
        },
        {
            "default": "0",
            "depends_on": "has_web_view",
            "fieldname": "allow_guest_to_view",
            "fieldtype": "Check",
            "label": "Allow Guest to View"
        },
        {
            "depends_on": "eval:!doc.istable",
            "fieldname": "route",
            "fieldtype": "Data",
            "label": "Route"
        },
        {
            "depends_on": "has_web_view",
            "fieldname": "is_published_field",
            "fieldtype": "Data",
            "label": "Is Published Field"
        },
        {
            "collapsible": 1,
            "fieldname": "advanced",
            "fieldtype": "Section Break",
            "hidden": 1,
            "label": "Advanced"
        },
        {
            "default": "InnoDB",
            "depends_on": "eval:!doc.issingle",
            "fieldname": "engine",
            "fieldtype": "Select",
            "label": "Database Engine",
            "options": "InnoDB\nMyISAM"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "Tree structures are implemented using Nested Set",
            "fieldname": "is_tree",
            "fieldtype": "Check",
            "label": "Is Tree"
        },
        {
            "depends_on": "is_tree",
            "fieldname": "nsm_parent_field",
            "fieldtype": "Data",
            "label": "Parent Field (Tree)"
        },
        {
            "description": "URL for documentation or help",
            "fieldname": "documentation",
            "fieldtype": "Data",
            "label": "Documentation Link"
        },
        {
            "collapsible": 1,
            "collapsible_depends_on": "actions",
            "depends_on": "eval:!doc.istable",
            "fieldname": "actions_section",
            "fieldtype": "Tab Break",
            "label": "Actions"
        },
        {
            "fieldname": "actions",
            "fieldtype": "Table",
            "label": "Document Actions",
            "options": "DocType Action"
        },
        {
            "collapsible": 1,
            "collapsible_depends_on": "links",
            "depends_on": "eval:!doc.istable",
            "fieldname": "links_section",
            "fieldtype": "Tab Break",
            "label": "Links"
        },
        {
            "fieldname": "links",
            "fieldtype": "Table",
            "label": "Document Links",
            "options": "DocType Link"
        },
        {
            "depends_on": "email_append_to",
            "fieldname": "subject_field",
            "fieldtype": "Data",
            "label": "Subject Field"
        },
        {
            "depends_on": "email_append_to",
            "fieldname": "sender_field",
            "fieldtype": "Data",
            "label": "Sender Email Field",
            "mandatory_depends_on": "email_append_to"
        },
        {
            "default": "0",
            "fieldname": "email_append_to",
            "fieldtype": "Check",
            "label": "Allow document creation via Email"
        },
        {
            "collapsible": 1,
            "depends_on": "eval:!doc.istable",
            "fieldname": "email_settings_sb",
            "fieldtype": "Section Break",
            "label": "Email Settings"
        },
        {
            "default": "1",
            "fieldname": "index_web_pages_for_search",
            "fieldtype": "Check",
            "label": "Index Web Pages for Search"
        },
        {
            "default": "0",
            "fieldname": "is_virtual",
            "fieldtype": "Check",
            "label": "Is Virtual"
        },
        {
            "fieldname": "default_email_template",
            "fieldtype": "Link",
            "label": "Default Email Template",
            "options": "Email Template"
        },
        {
            "fieldname": "column_break_51",
            "fieldtype": "Column Break"
        },
        {
            "depends_on": "has_web_view",
            "fieldname": "website_search_field",
            "fieldtype": "Data",
            "label": "Website Search Field"
        },
        {
            "fieldname": "naming_rule",
            "fieldtype": "Select",
            "label": "Naming Rule",
            "length": 40,
            "options": "\nSet by user\nAutoincrement\nBy fieldname\nBy \"Naming Series\" field\nExpression\nExpression (old style)\nRandom\nUUID\nBy script"
        },
        {
            "fieldname": "migration_hash",
            "fieldtype": "Data",
            "hidden": 1
        },
        {
            "fieldname": "states",
            "fieldtype": "Table",
            "label": "Document States",
            "options": "DocType State"
        },
        {
            "collapsible": 1,
            "depends_on": "eval:!doc.istable",
            "fieldname": "document_states_section",
            "fieldtype": "Tab Break",
            "label": "States"
        },
        {
            "default": "0",
            "fieldname": "show_title_field_in_link",
            "fieldtype": "Check",
            "label": "Show Title in Link Fields"
        },
        {
            "default": "0",
            "fieldname": "translated_doctype",
            "fieldtype": "Check",
            "label": "Translate Link Fields"
        },
        {
            "default": "0",
            "fieldname": "make_attachments_public",
            "fieldtype": "Check",
            "label": "Make Attachments Public by Default"
        },
        {
            "default": "0",
            "depends_on": "eval: doc.is_submittable",
            "description": "Enabling this will submit documents in background",
            "fieldname": "queue_in_background",
            "fieldtype": "Check",
            "label": "Queue in Background (BETA)"
        },
        {
            "fieldname": "default_view",
            "fieldtype": "Select",
            "label": "Default View"
        },
        {
            "default": "0",
            "fieldname": "force_re_route_to_default_view",
            "fieldtype": "Check",
            "label": "Force Re-route to Default View"
        },
        {
            "default": "0",
            "depends_on": "eval:!doc.istable",
            "description": "Enables Calendar and Gantt views.",
            "fieldname": "is_calendar_and_gantt",
            "fieldtype": "Check",
            "label": "Is Calendar and Gantt"
        },
        {
            "fieldname": "settings_tab",
            "fieldtype": "Tab Break",
            "label": "Settings"
        },
        {
            "depends_on": "eval:!doc.__islocal",
            "fieldname": "form_builder_tab",
            "fieldtype": "Tab Break",
            "label": "Form"
        },
        {
            "fieldname": "form_builder",
            "fieldtype": "HTML",
            "label": "Form Builder"
        },
        {
            "fieldname": "fields_section",
            "fieldtype": "Section Break",
            "label": "Fields"
        },
        {
            "fieldname": "connections_tab",
            "fieldtype": "Tab Break",
            "label": "Connections",
            "show_dashboard": 1
        },
        {
            "depends_on": "email_append_to",
            "fieldname": "sender_name_field",
            "fieldtype": "Data",
            "label": "Sender Name Field"
        },
        {
            "fieldname": "permissions_tab",
            "fieldtype": "Tab Break",
            "label": "Permissions"
        },
        {
            "fieldname": "column_break_nexu",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "fields_tab",
            "fieldtype": "Tab Break",
            "label": "Fields"
        },
        {
            "default": "Dynamic",
            "fieldname": "row_format",
            "fieldtype": "Select",
            "hidden": 1,
            "label": "Row Format",
            "options": "Dynamic\nCompressed"
        },
        {
            "default": "50",
            "depends_on": "istable",
            "fieldname": "grid_page_length",
            "fieldtype": "Int",
            "label": "Grid Page Length",
            "non_negative": 1
        },
        {
            "default": "0",
            "description": "Users are only able to delete attached files if the document is either in draft or if the document is canceled and they are also able to delete the document.",
            "fieldname": "protect_attached_files",
            "fieldtype": "Check",
            "label": "Protect Attached Files"
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
    "grid_page_length": 50,
    "icon": "fa fa-bolt",
    "id": "sev1c03qbtokey6",
    "idx": 6,
    "index_web_pages_for_search": 1,
    "links": [
        {
            "group": "Views",
            "link_doctype": "Report",
            "link_fieldname": "ref_doctype"
        },
        {
            "group": "Workflow",
            "link_doctype": "Workflow",
            "link_fieldname": "document_type"
        },
        {
            "group": "Workflow",
            "link_doctype": "Notification",
            "link_fieldname": "document_type"
        },
        {
            "group": "Customization",
            "link_doctype": "Custom Field",
            "link_fieldname": "dt"
        },
        {
            "group": "Customization",
            "link_doctype": "Client Script",
            "link_fieldname": "dt"
        },
        {
            "group": "Customization",
            "link_doctype": "Server Script",
            "link_fieldname": "reference_doctype"
        },
        {
            "group": "Workflow",
            "link_doctype": "Webhook",
            "link_fieldname": "webhook_doctype"
        },
        {
            "group": "Views",
            "link_doctype": "Print Format",
            "link_fieldname": "doc_type"
        },
        {
            "group": "Views",
            "link_doctype": "Web Form",
            "link_fieldname": "doc_type"
        },
        {
            "group": "Views",
            "link_doctype": "Calendar View",
            "link_fieldname": "reference_doctype"
        },
        {
            "group": "Views",
            "link_doctype": "Kanban Board",
            "link_fieldname": "reference_doctype"
        },
        {
            "group": "Workflow",
            "link_doctype": "Onboarding Step",
            "link_fieldname": "reference_document"
        },
        {
            "group": "Rules",
            "link_doctype": "Auto Repeat",
            "link_fieldname": "reference_doctype"
        },
        {
            "group": "Rules",
            "link_doctype": "Assignment Rule",
            "link_fieldname": "document_type"
        },
        {
            "group": "Rules",
            "link_doctype": "Energy Point Rule",
            "link_fieldname": "reference_doctype"
        }
    ],
    "modified": "2025-03-27 18:16:53.286909",
    "modified_by": "Administrator",
    "module": "Core",
    "name": "DocType",
    "naming_rule": "Set by user",
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
            "write": 1
        },
        {
            "create": 1,
            "delete": 1,
            "email": 1,
            "print": 1,
            "read": 1,
            "report": 1,
            "role": "Administrator",
            "share": 1,
            "write": 1
        }
    ],
    "route": "doctype",
    "row_format": "Dynamic",
    "search_fields": "module",
    "show_name_in_global_search": 1,
    "sort_field": "creation",
    "sort_order": "DESC",
    "states": [],
    "track_changes": 1,
    "translated_doctype": 1
}

Task schema
{
    "_schema_doctype": "Task",
    "actions": [],
    "allow_import": 1,
    "autoname": "TASK-.YYYY.-.#####",
    "creation": "2013-01-29 19:25:50",
    "doctype": "Schema",
    "docstatus": 1,
    "is_submittable": 1,
    "document_type": "Setup",
    "engine": "InnoDB",
    "field_order": [
        "subject",
        "project",
        "issue",
        "type",
        "relationship_parent",
        "color",
        "is_group",
        "is_template",
        "column_break0",
        "status",
        "priority",
        "task_weight",
        "parent_task",
        "completed_by",
        "completed_on",
        "sb_timeline",
        "exp_start_date",
        "expected_time",
        "start",
        "column_break_11",
        "exp_end_date",
        "progress",
        "duration",
        "is_milestone",
        "sb_details",
        "description",
        "sb_depends_on",
        "depends_on",
        "depends_on_tasks",
        "sb_actual",
        "act_start_date",
        "actual_time",
        "column_break_15",
        "act_end_date",
        "sb_costing",
        "total_costing_amount",
        "column_break_20",
        "total_billing_amount",
        "sb_more_info",
        "review_date",
        "closing_date",
        "column_break_22",
        "department",
        "company",
        "lft",
        "rgt",
        "old_parent",
        "template_task",
        "actionbutton"
    ],
    "fields": [
        {
            "allow_in_quick_entry": 1,
            "fieldname": "subject",
            "fieldtype": "Data",
            "in_global_search": 1,
            "in_standard_filter": 1,
            "label": "Subject",
            "reqd": 1,
            "search_index": 1
        },
        {
            "allow_in_quick_entry": 1,
            "bold": 1,
            "fieldname": "project",
            "fieldtype": "Link",
            "in_global_search": 1,
            "in_list_view": 1,
            "in_standard_filter": 1,
            "label": "Project",
            "oldfieldname": "project",
            "oldfieldtype": "Link",
            "options": "Project",
            "remember_last_selected_value": 1,
            "search_index": 1
        },
        {
            "fieldname": "issue",
            "fieldtype": "Link",
            "label": "Issue",
            "options": "Issue"
        },
        {
            "fieldname": "type",
            "fieldtype": "Link",
            "label": "Type",
            "options": "Task Type"
        },
        {
            "bold": 1,
            "default": "0",
            "fieldname": "is_group",
            "fieldtype": "Check",
            "in_list_view": 1,
            "label": "Is Group"
        },
        {
            "fieldname": "column_break0",
            "fieldtype": "Column Break",
            "oldfieldtype": "Column Break",
            "print_width": "50%",
            "width": "50%"
        },
        {
            "bold": 1,
            "fieldname": "status",
            "fieldtype": "Select",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "label": "Status",
            "no_copy": 1,
            "oldfieldname": "status",
            "oldfieldtype": "Select",
            "options": "\nDraft\nApproved\nRejected\nPending"
        },
        {
            "fieldname": "priority",
            "fieldtype": "Select",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "label": "Priority",
            "oldfieldname": "priority",
            "oldfieldtype": "Select",
            "options": "Low\nMedium\nHigh\nUrgent",
            "search_index": 1
        },
        {
            "fieldname": "relationship_parent",
            "fieldtype": "Table",
            "in_list_view": 0,
            "label": "relationship Children",
            "options": "Relationship",
            "search_index": 1
        },
        {
            "fieldname": "color",
            "fieldtype": "Color",
            "label": "Color"
        },
        {
            "bold": 1,
            "fieldname": "parent_task",
            "fieldtype": "Link",
            "ignore_user_permissions": 1,
            "label": "Parent Task",
            "options": "Task",
            "search_index": 1
        },
        {
            "collapsible": 1,
            "collapsible_depends_on": "exp_start_date",
            "fieldname": "sb_timeline",
            "fieldtype": "Section Break",
            "label": "Timeline"
        },
        {
            "bold": 1,
            "fieldname": "exp_start_date",
            "fieldtype": "Datetime",
            "label": "Expected Start Date",
            "oldfieldname": "exp_start_date",
            "oldfieldtype": "Date"
        },
        {
            "default": "0",
            "fieldname": "expected_time",
            "fieldtype": "Float",
            "label": "Expected Time (in hours)",
            "oldfieldname": "exp_total_hrs",
            "oldfieldtype": "Data"
        },
        {
            "fetch_from": "type.weight",
            "fieldname": "task_weight",
            "fieldtype": "Float",
            "label": "Weight"
        },
        {
            "fieldname": "column_break_11",
            "fieldtype": "Column Break"
        },
        {
            "bold": 1,
            "fieldname": "exp_end_date",
            "fieldtype": "Datetime",
            "label": "Expected End Date",
            "oldfieldname": "exp_end_date",
            "oldfieldtype": "Date",
            "search_index": 1
        },
        {
            "fieldname": "progress",
            "fieldtype": "Percent",
            "label": "% Progress",
            "no_copy": 1
        },
        {
            "default": "0",
            "fieldname": "is_milestone",
            "fieldtype": "Check",
            "in_list_view": 1,
            "label": "Is Milestone"
        },
        {
            "fieldname": "sb_details",
            "fieldtype": "Section Break",
            "label": "Details",
            "oldfieldtype": "Section Break"
        },
        {
            "fieldname": "description",
            "fieldtype": "Text Editor",
            "label": "Task Description",
            "oldfieldname": "description",
            "oldfieldtype": "Text Editor",
            "print_width": "300px",
            "width": "300px"
        },
        {
            "fieldname": "sb_depends_on",
            "fieldtype": "Section Break",
            "label": "Dependencies",
            "oldfieldtype": "Section Break"
        },
        {
            "fieldname": "depends_on",
            "fieldtype": "Table",
            "label": "Dependent Tasks",
            "options": "Task Depends On"
        },
        {
            "fieldname": "depends_on_tasks",
            "fieldtype": "Code",
            "hidden": 1,
            "label": "Depends on Tasks",
            "read_only": 1
        },
        {
            "fieldname": "sb_actual",
            "fieldtype": "Section Break",
            "oldfieldtype": "Column Break",
            "print_width": "50%",
            "width": "50%"
        },
        {
            "fieldname": "act_start_date",
            "fieldtype": "Date",
            "label": "Actual Start Date (via Timesheet)",
            "oldfieldname": "act_start_date",
            "oldfieldtype": "Date",
            "read_only": 1
        },
        {
            "fieldname": "actual_time",
            "fieldtype": "Float",
            "label": "Actual Time in Hours (via Timesheet)",
            "read_only": 1
        },
        {
            "fieldname": "column_break_15",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "act_end_date",
            "fieldtype": "Date",
            "label": "Actual End Date (via Timesheet)",
            "oldfieldname": "act_end_date",
            "oldfieldtype": "Date",
            "read_only": 1
        },
        {
            "collapsible": 1,
            "fieldname": "sb_costing",
            "fieldtype": "Section Break",
            "label": "Costing"
        },
        {
            "fieldname": "total_costing_amount",
            "fieldtype": "Currency",
            "label": "Total Costing Amount (via Timesheet)",
            "oldfieldname": "actual_budget",
            "oldfieldtype": "Currency",
            "options": "Company:company:default_currency",
            "read_only": 1
        },
        {
            "fieldname": "column_break_20",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "total_billing_amount",
            "fieldtype": "Currency",
            "label": "Total Billable Amount (via Timesheet)",
            "read_only": 1
        },
        {
            "collapsible": 1,
            "fieldname": "sb_more_info",
            "fieldtype": "Section Break",
            "label": "More Info"
        },
        {
            "depends_on": "eval:doc.status == \"Closed\" || doc.status == \"Pending Review\"",
            "fieldname": "review_date",
            "fieldtype": "Date",
            "label": "Review Date",
            "oldfieldname": "review_date",
            "oldfieldtype": "Date"
        },
        {
            "depends_on": "eval:doc.status == \"Closed\"",
            "fieldname": "closing_date",
            "fieldtype": "Date",
            "label": "Closing Date",
            "oldfieldname": "closing_date",
            "oldfieldtype": "Date"
        },
        {
            "fieldname": "column_break_22",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "department",
            "fieldtype": "Link",
            "label": "Department",
            "options": "Department"
        },
        {
            "fetch_from": "project.company",
            "fieldname": "company",
            "fieldtype": "Link",
            "label": "Company",
            "options": "Company",
            "remember_last_selected_value": 1
        },
        {
            "fieldname": "lft",
            "fieldtype": "Int",
            "hidden": 1,
            "label": "lft",
            "read_only": 1
        },
        {
            "fieldname": "rgt",
            "fieldtype": "Int",
            "hidden": 1,
            "label": "rgt",
            "read_only": 1
        },
        {
            "fieldname": "old_parent",
            "fieldtype": "Data",
            "hidden": 1,
            "ignore_user_permissions": 1,
            "label": "Old Parent",
            "read_only": 1
        },
        {
            "depends_on": "eval: doc.status == \"Completed\"",
            "fieldname": "completed_by",
            "fieldtype": "Link",
            "label": "Completed By",
            "no_copy": 1,
            "options": "User"
        },
        {
            "default": "0",
            "fieldname": "is_template",
            "fieldtype": "Check",
            "label": "Is Template"
        },
        {
            "depends_on": "is_template",
            "fieldname": "start",
            "fieldtype": "Int",
            "label": "Begin On (Days)"
        },
        {
            "depends_on": "is_template",
            "fieldname": "duration",
            "fieldtype": "Int",
            "label": "Duration (Days)"
        },
        {
            "depends_on": "eval: doc.status == \"Completed\"",
            "fieldname": "completed_on",
            "fieldtype": "Date",
            "label": "Completed On",
            "mandatory_depends_on": "eval: doc.status == \"Completed\""
        },
        {
            "fieldname": "template_task",
            "fieldtype": "Data",
            "hidden": 1,
            "label": "Template Task"
        },
        {
            "fieldname": "actionbutton",
            "fieldtype": "Button",
            "hidden": 0,
            "label": "Save"
        }
    ],
    "icon": "fa fa-check",
    "idx": 1,
    "is_tree": 1,
    "links": [],
    "max_attachments": 5,
    "modified": "2024-05-24 12:36:12.214577",
    "modified_by": "Administrator",
    "module": "Projects",
    "name": "SCHEMA-0001",
    "naming_rule": "Expression (old style)",
    "nsm_parent_field": "parent_task",
    "owner": "Administrator",
    "permissions": [
        {
            "create": 1,
            "delete": 1,
            "email": 1,
            "print": 1,
            "read": 1,
            "report": 1,
            "role": "Projects User",
            "share": 1,
            "write": 1
        }
    ],
    "quick_entry": 1,
    "search_fields": "subject",
    "show_name_in_global_search": 1,
    "show_preview_popup": 1,
    "sort_field": "creation",
    "sort_order": "DESC",
    "states": [],
    "timeline_field": "project",
    "title_field": "subject",
    "track_seen": 1
}