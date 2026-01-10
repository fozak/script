// ============================================================
// coworker-config.js v1.25COWORKER CONFIG - Configuration Only (No Execution Logic)
// ============================================================

// RULES - the system used the frappe enriched approach  --//
// RULE 1. Used exact doctype and schemas (so each doctype has mandatory schema) in frappe-format. TODO: cross-link
// RULE 2. Each schema is doctype itself with doctype = "Schema".
// RULE 3. The lifecicle of schema and doctype is identical and based on frappe-like docstatus (0 = draft, 1 = submitted, 2 = cancelled).
// RULE 4. Lifecicle of schemas and documents is exactly 0,1,2
// RULE 5. Each doctype should have ONE schema with doctype = "Schema" and docstatus = 1 (submitted). prev. schemas for this doctype

// RULE.FIELD_TYPES : FIELD TYPES (lowest level, foundational)
// Field is the single important element in document and its schema. Each field type has a category and JS type for validation / UI

const FIELD_TYPES = {
  Attach: { category: "media", jstype: "string" },
  AttachImage: { category: "media", jstype: "string" },
  Autocomplete: { category: "input", jstype: "string" },
  Barcode: { category: "input", jstype: "string" },
  Button: { category: "control", jstype: "null" },
  Check: { category: "boolean", jstype: "boolean" },
  Code: { category: "text", jstype: "string" },
  Color: { category: "input", jstype: "string" },
  "Column Break": { category: "layout", jstype: "null" },
  Currency: { category: "numeric", jstype: "number" },
  Data: { category: "text", jstype: "string" },
  Date: { category: "date", jstype: "string" },
  Datetime: { category: "date", jstype: "string" },
  Duration: { category: "numeric", jstype: "number" },
  "Dynamic Link": { category: "reference", jstype: "string" },
  Float: { category: "numeric", jstype: "number" },
  Fold: { category: "layout", jstype: "null" },
  Geolocation: { category: "data", jstype: "object" },
  Heading: { category: "layout", jstype: "null" },
  HTML: { category: "layout", jstype: "string" },
  "HTML Editor": { category: "text", jstype: "string" },
  Image: { category: "media", jstype: "string" },
  Int: { category: "numeric", jstype: "number" },
  JSON: { category: "data", jstype: "object" },
  Link: { category: "reference", jstype: "string" },
  "Long Text": { category: "text", jstype: "string" },
  "Markdown Editor": { category: "text", jstype: "string" },
  MultiCheck: { category: "multi", jstype: "array" },
  MultiSelect: { category: "multi", jstype: "array" },
  Percent: { category: "numeric", jstype: "number" },
  Phone: { category: "input", jstype: "string" },
  "Read Only": { category: "input", jstype: "string" },
  Rating: { category: "numeric", jstype: "number" },
  "Section Break": { category: "layout", jstype: "null" },
  Select: { category: "choice", jstype: "string" },
  Signature: { category: "media", jstype: "string" },
  "Small Text": { category: "text", jstype: "string" },
  Table: { category: "child", jstype: "array" },
  "Table MultiSelect": { category: "child", jstype: "array" },
  Text: { category: "text", jstype: "string" },
  Time: { category: "date", jstype: "string" },
};

//RULE.DOCFIELD_JSON - the JSON structure for a docfield (field in a doctype) from FRAPPE, used as a reference. NOT used directly in code.
const DOCFIELD_JSON = {
  actions: [],
  autoname: "hash",
  creation: "2013-02-22 01:27:33",
  doctype: "docfield",
  document_type: "Setup",
  editable_grid: 1,
  engine: "InnoDB",
  field_order: [
    "label_and_type",
    "label",
    "fieldtype",
    "fieldname",
    "precision",
    "length",
    "non_negative",
    "hide_days",
    "hide_seconds",
    "reqd",
    "is_virtual",
    "search_index",
    "not_nullable",
    "column_break_18",
    "options",
    "sort_options",
    "show_dashboard",
    "link_filters",
    "defaults_section",
    "default",
    "column_break_6",
    "fetch_from",
    "fetch_if_empty",
    "visibility_section",
    "hidden",
    "show_on_timeline",
    "bold",
    "allow_in_quick_entry",
    "translatable",
    "print_hide",
    "print_hide_if_no_value",
    "report_hide",
    "column_break_28",
    "depends_on",
    "collapsible",
    "collapsible_depends_on",
    "hide_border",
    "list__search_settings_section",
    "in_list_view",
    "in_standard_filter",
    "in_preview",
    "sticky",
    "column_break_35",
    "in_filter",
    "in_global_search",
    "permissions",
    "read_only",
    "allow_on_submit",
    "ignore_user_permissions",
    "allow_bulk_edit",
    "make_attachment_public",
    "column_break_13",
    "permlevel",
    "ignore_xss_filter",
    "constraints_section",
    "unique",
    "no_copy",
    "set_only_once",
    "remember_last_selected_value",
    "column_break_38",
    "mandatory_depends_on",
    "read_only_depends_on",
    "display",
    "print_width",
    "width",
    "max_height",
    "columns",
    "column_break_22",
    "description",
    "documentation_url",
    "placeholder",
    "oldfieldname",
    "oldfieldtype",
  ],
  fields: [
    {
      fieldname: "label_and_type",
      fieldtype: "Section Break",
    },
    {
      bold: 1,
      fieldname: "label",
      fieldtype: "Data",
      in_list_view: 1,
      label: "Label",
      oldfieldname: "label",
      oldfieldtype: "Data",
      print_width: "163",
      search_index: 1,
      width: "163",
    },
    {
      bold: 1,
      default: "Data",
      fieldname: "fieldtype",
      fieldtype: "Select",
      in_list_view: 1,
      label: "Type",
      oldfieldname: "fieldtype",
      oldfieldtype: "Select",
      options:
        "Autocomplete\nAttach\nAttach Image\nBarcode\nButton\nCheck\nCode\nColor\nColumn Break\nCurrency\nData\nDate\nDatetime\nDuration\nDynamic Link\nFloat\nFold\nGeolocation\nHeading\nHTML\nHTML Editor\nIcon\nImage\nInt\nJSON\nLink\nLong Text\nMarkdown Editor\nPassword\nPercent\nPhone\nRead Only\nRating\nSection Break\nSelect\nSignature\nSmall Text\nTab Break\nTable\nTable MultiSelect\nText\nText Editor\nTime",
      reqd: 1,
      search_index: 1,
    },
    {
      bold: 1,
      fieldname: "fieldname",
      fieldtype: "Data",
      in_list_view: 1,
      label: "Name",
      oldfieldname: "fieldname",
      oldfieldtype: "Data",
      search_index: 1,
    },
    {
      default: "0",
      depends_on:
        'eval:!in_list(["Section Break", "Column Break", "Button", "HTML"], doc.fieldtype)',
      fieldname: "reqd",
      fieldtype: "Check",
      in_list_view: 1,
      label: "Mandatory",
      oldfieldname: "reqd",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      depends_on:
        'eval:in_list(["Float", "Currency", "Percent"], doc.fieldtype)',
      description: "Set non-standard precision for a Float or Currency field",
      fieldname: "precision",
      fieldtype: "Select",
      label: "Precision",
      options: "\n0\n1\n2\n3\n4\n5\n6\n7\n8\n9",
      print_hide: 1,
    },
    {
      depends_on:
        "eval:in_list(['Data', 'Link', 'Dynamic Link', 'Password', 'Select', 'Read Only', 'Attach', 'Attach Image', 'Int'], doc.fieldtype)",
      fieldname: "length",
      fieldtype: "Int",
      label: "Length",
    },
    {
      default: "0",
      fieldname: "search_index",
      fieldtype: "Check",
      label: "Index",
      oldfieldname: "search_index",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      depends_on: "eval:!doc.is_virtual",
      fieldname: "in_list_view",
      fieldtype: "Check",
      label: "In List View",
      print_width: "70px",
      width: "70px",
    },
    {
      default: "0",
      fieldname: "in_standard_filter",
      fieldtype: "Check",
      label: "In List Filter",
    },
    {
      default: "0",
      depends_on:
        'eval:(["Data", "Select", "Table", "Text", "Text Editor", "Link", "Small Text", "Long Text", "Read Only", "Heading", "Dynamic Link"].indexOf(doc.fieldtype) !== -1)',
      fieldname: "in_global_search",
      fieldtype: "Check",
      label: "In Global Search",
    },
    {
      default: "0",
      depends_on:
        "eval:!in_list(['Table', 'Table MultiSelect'], doc.fieldtype);",
      fieldname: "in_preview",
      fieldtype: "Check",
      label: "In Preview",
    },
    {
      default: "0",
      depends_on: "eval:!in_list(['Tab Break', 'Table'], doc.fieldtype)",
      fieldname: "allow_in_quick_entry",
      fieldtype: "Check",
      label: "Allow in Quick Entry",
    },
    {
      default: "0",
      fieldname: "bold",
      fieldtype: "Check",
      label: "Bold",
    },
    {
      default: "0",
      depends_on:
        "eval:['Data', 'Select', 'Text', 'Small Text', 'Text Editor'].includes(doc.fieldtype)",
      fieldname: "translatable",
      fieldtype: "Check",
      label: "Translatable",
    },
    {
      default: "0",
      depends_on: 'eval:doc.fieldtype==="Section Break"',
      fieldname: "collapsible",
      fieldtype: "Check",
      label: "Collapsible",
      length: 255,
    },
    {
      depends_on: 'eval:doc.fieldtype=="Section Break" && doc.collapsible',
      fieldname: "collapsible_depends_on",
      fieldtype: "Code",
      label: "Collapsible Depends On (JS)",
      max_height: "3rem",
      options: "JS",
    },
    {
      fieldname: "column_break_6",
      fieldtype: "Column Break",
    },
    {
      description:
        "For Links, enter the DocType as range.\nFor Select, enter list of Options, each on a new line.",
      fieldname: "options",
      fieldtype: "Small Text",
      ignore_xss_filter: 1,
      in_list_view: 1,
      label: "Options",
      oldfieldname: "options",
      oldfieldtype: "Text",
    },
    {
      fieldname: "default",
      fieldtype: "Small Text",
      ignore_xss_filter: 1,
      label: "Default",
      max_height: "3rem",
      oldfieldname: "default",
      oldfieldtype: "Text",
    },
    {
      fieldname: "fetch_from",
      fieldtype: "Small Text",
      label: "Fetch From",
    },
    {
      default: "0",
      description: "If unchecked, the value will always be re-fetched on save.",
      fieldname: "fetch_if_empty",
      fieldtype: "Check",
      label: "Fetch on Save if Empty",
    },
    {
      fieldname: "permissions",
      fieldtype: "Section Break",
      label: "Permissions",
    },
    {
      fieldname: "depends_on",
      fieldtype: "Code",
      label: "Display Depends On (JS)",
      length: 255,
      max_height: "3rem",
      oldfieldname: "depends_on",
      oldfieldtype: "Data",
      options: "JS",
    },
    {
      default: "0",
      fieldname: "hidden",
      fieldtype: "Check",
      label: "Hidden",
      oldfieldname: "hidden",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "read_only",
      fieldtype: "Check",
      label: "Read Only",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "unique",
      fieldtype: "Check",
      label: "Unique",
    },
    {
      default: "0",
      fieldname: "set_only_once",
      fieldtype: "Check",
      label: "Set only once",
    },
    {
      default: "0",
      depends_on: 'eval: doc.fieldtype == "Table"',
      fieldname: "allow_bulk_edit",
      fieldtype: "Check",
      label: "Allow Bulk Edit",
    },
    {
      fieldname: "column_break_13",
      fieldtype: "Column Break",
    },
    {
      default: "0",
      depends_on:
        "eval:!in_list(['Section Break', 'Column Break', 'Tab Break'], doc.fieldtype)",
      fieldname: "permlevel",
      fieldtype: "Int",
      label: "Perm Level",
      oldfieldname: "permlevel",
      oldfieldtype: "Int",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "ignore_user_permissions",
      fieldtype: "Check",
      label: "Ignore User Permissions",
    },
    {
      default: "0",
      depends_on: "eval: parent.is_submittable",
      fieldname: "allow_on_submit",
      fieldtype: "Check",
      label: "Allow on Submit",
      oldfieldname: "allow_on_submit",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "report_hide",
      fieldtype: "Check",
      label: "Report Hide",
      oldfieldname: "report_hide",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      depends_on: "eval:(doc.fieldtype == 'Link')",
      fieldname: "remember_last_selected_value",
      fieldtype: "Check",
      label: "Remember Last Selected Value",
    },
    {
      default: "0",
      description:
        "Don't encode HTML tags like &lt;script&gt; or just characters like &lt; or &gt;, as they could be intentionally used in this field",
      fieldname: "ignore_xss_filter",
      fieldtype: "Check",
      label: "Ignore XSS Filter",
    },
    {
      fieldname: "display",
      fieldtype: "Section Break",
      label: "Display",
    },
    {
      default: "0",
      fieldname: "in_filter",
      fieldtype: "Check",
      label: "In Filter",
      oldfieldname: "in_filter",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "no_copy",
      fieldtype: "Check",
      label: "No Copy",
      oldfieldname: "no_copy",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      fieldname: "print_hide",
      fieldtype: "Check",
      label: "Print Hide",
      oldfieldname: "print_hide",
      oldfieldtype: "Check",
      print_width: "50px",
      width: "50px",
    },
    {
      default: "0",
      depends_on:
        'eval:["Int", "Float", "Currency", "Percent"].indexOf(doc.fieldtype)!==-1',
      fieldname: "print_hide_if_no_value",
      fieldtype: "Check",
      label: "Print Hide If No Value",
    },
    {
      fieldname: "print_width",
      fieldtype: "Data",
      label: "Print Width",
      length: 10,
    },
    {
      fieldname: "width",
      fieldtype: "Data",
      label: "Width",
      length: 10,
      oldfieldname: "width",
      oldfieldtype: "Data",
      print_width: "50px",
      width: "50px",
    },
    {
      description:
        "Number of columns for a field in a List View or a Grid (Total Columns should be less than 11)",
      fieldname: "columns",
      fieldtype: "Int",
      label: "Columns",
    },
    {
      fieldname: "column_break_22",
      fieldtype: "Column Break",
    },
    {
      fieldname: "description",
      fieldtype: "Small Text",
      in_list_view: 1,
      label: "Description",
      oldfieldname: "description",
      oldfieldtype: "Text",
      print_width: "300px",
      width: "300px",
    },
    {
      fieldname: "oldfieldname",
      fieldtype: "Data",
      hidden: 1,
      oldfieldname: "oldfieldname",
      oldfieldtype: "Data",
    },
    {
      fieldname: "oldfieldtype",
      fieldtype: "Data",
      hidden: 1,
      oldfieldname: "oldfieldtype",
      oldfieldtype: "Data",
    },
    {
      fieldname: "mandatory_depends_on",
      fieldtype: "Code",
      label: "Mandatory Depends On (JS)",
      max_height: "3rem",
      options: "JS",
    },
    {
      fieldname: "read_only_depends_on",
      fieldtype: "Code",
      label: "Read Only Depends On (JS)",
      max_height: "3rem",
      options: "JS",
    },
    {
      fieldname: "column_break_38",
      fieldtype: "Column Break",
    },
    {
      default: "0",
      depends_on: "eval:doc.fieldtype=='Duration'",
      fieldname: "hide_days",
      fieldtype: "Check",
      label: "Hide Days",
    },
    {
      default: "0",
      depends_on: "eval:doc.fieldtype=='Duration'",
      fieldname: "hide_seconds",
      fieldtype: "Check",
      label: "Hide Seconds",
    },
    {
      default: "0",
      depends_on: "eval:doc.fieldtype=='Section Break'",
      fieldname: "hide_border",
      fieldtype: "Check",
      label: "Hide Border",
    },
    {
      default: "0",
      depends_on: 'eval:in_list(["Int", "Float", "Currency"], doc.fieldtype)',
      fieldname: "non_negative",
      fieldtype: "Check",
      label: "Non Negative",
    },
    {
      fieldname: "column_break_18",
      fieldtype: "Column Break",
    },
    {
      fieldname: "defaults_section",
      fieldtype: "Section Break",
      label: "Defaults",
      max_height: "2rem",
    },
    {
      fieldname: "visibility_section",
      fieldtype: "Section Break",
      label: "Visibility",
    },
    {
      fieldname: "column_break_28",
      fieldtype: "Column Break",
    },
    {
      fieldname: "constraints_section",
      fieldtype: "Section Break",
      label: "Constraints",
    },
    {
      fieldname: "max_height",
      fieldtype: "Data",
      label: "Max Height",
      length: 10,
    },
    {
      fieldname: "list__search_settings_section",
      fieldtype: "Section Break",
      label: "List / Search Settings",
    },
    {
      fieldname: "column_break_35",
      fieldtype: "Column Break",
    },
    {
      default: "0",
      depends_on: 'eval:doc.fieldtype==="Tab Break"',
      fieldname: "show_dashboard",
      fieldtype: "Check",
      label: "Show Dashboard",
    },
    {
      default: "0",
      fieldname: "is_virtual",
      fieldtype: "Check",
      label: "Virtual",
    },
    {
      depends_on:
        'eval:!in_list(["Tab Break", "Section Break", "Column Break", "Button", "HTML"], doc.fieldtype)',
      fieldname: "documentation_url",
      fieldtype: "Data",
      label: "Documentation URL",
      options: "URL",
    },
    {
      default: "0",
      depends_on: "eval: doc.fieldtype === 'Select'",
      fieldname: "sort_options",
      fieldtype: "Check",
      label: "Sort Options",
    },
    {
      fieldname: "link_filters",
      fieldtype: "JSON",
      label: "Link Filters",
    },
    {
      default: "0",
      depends_on:
        'eval:!in_list(["Check", "Currency", "Float", "Int", "Percent", "Rating", "Select", "Table", "Table MultiSelect"], doc.fieldtype)',
      fieldname: "not_nullable",
      fieldtype: "Check",
      label: "Not Nullable",
    },
    {
      default: "0",
      depends_on: "eval: doc.hidden",
      fieldname: "show_on_timeline",
      fieldtype: "Check",
      label: "Show on Timeline",
    },
    {
      fieldname: "placeholder",
      fieldtype: "Data",
      label: "Placeholder",
    },
    {
      default: "0",
      depends_on: "eval:['Attach', 'Attach Image'].includes(doc.fieldtype)",
      fieldname: "make_attachment_public",
      fieldtype: "Check",
      label: "Make Attachment Public (by default)",
    },
    {
      default: "0",
      depends_on:
        "eval:!in_list(['Table', 'Table MultiSelect'], doc.fieldtype);",
      fieldname: "sticky",
      fieldtype: "Check",
      label: "Sticky",
    },
  ],
  idx: 1,
  index_web_pages_for_search: 1,
  istable: 1,
  links: [],
  modified: "2025-01-30 14:58:19.746600",
  modified_by: "Administrator",
  module: "Core",
  name: "DocField",
  naming_rule: "Random",
  owner: "Administrator",
  permissions: [],
  sort_field: "creation",
  sort_order: "ASC",
  states: [],
};

// ============================================
// CORE SYSTEM FIELDS (NON-USER, DOC-INTERNAL)
// ============================================
// RULE.CORE_SYSTEM_FIELDS : These fields are automatically added to every document by the system.
// all properties are moved to Field schema
//TODO: own and system doctype (0,1)

const SYSTEM_FIELDS = [
  { fieldname: "id", frappe_field: true, docstatus: 1 },
  { fieldname: "doctype", frappe_field: true, docstatus: 1 },
  { fieldname: "name", frappe_field: true, docstatus: 1 },
  { fieldname: "owner", frappe_field: true, docstatus: 1 }, // ACL key field
  { fieldname: "creation", frappe_field: true, docstatus: 1 },
  { fieldname: "modified", frappe_field: true, docstatus: 1 },
  { fieldname: "modified_by", frappe_field: true, docstatus: 1 },
  { fieldname: "docstatus", frappe_field: true, docstatus: 1 },
  { fieldname: "is_submittable", frappe_field: true, docstatus: 1 },
  { fieldname: "amended_from", frappe_field: true, docstatus: 1 },
  { fieldname: "amendment_date", frappe_field: true, docstatus: 1 },
  { fieldname: "idx", frappe_field: true, docstatus: 1 },
  { fieldname: "custom", frappe_field: true, docstatus: 1 }, //0- for system 1, for custom
  { fieldname: "_schema_doctype", frappe_field: false, docstatus: 1 }, //Potentially move to Schema doctypenot frappe
  { fieldname: "_schema_name", frappe_field: false, docstatus: 1 },
  { fieldname: "_allowed", frappe_field: false, docstatus: 1 }, //combined write access is like ACL ["User-B"] and roles etc ACL ["Manager"], // Managers read+write
  { fieldname: "_allowed_read", frappe_field: false, docstatus: 1 }, //combined read access is like ACL ["User-B"] and roles etc ACL ["Manager"], // Managers read+write
  { fieldname: "user_id", frappe_field: false, docstatus: 1 }, // special field for user profile linking to @users colleciton for auth
];
//  ACL - this is for pocketbased storage
//  @request.auth.name = data.owner
//  || @request.auth.roles ?~ data._allowed_roles
//  || @request.auth.roles ?~ data._allowed_roles_read
//  || @request.auth.name ~ data._allowed_users
//  || @request.auth.name ~ data._allowed_users_read

// listRule: @request.auth.name ?= data._allowed_users_read || @request.auth.name ?= data._allowed_users
//readRule: @request.auth.name ?= data._allowed_users_read || @request.auth.name ?= data._allowed_users
//updateRule: @request.auth.name ?= data._allowed_users
//createRule: (empty)
//deleteRule: locked

coworker._config = {
  // ============================================================
  // SYSTEM CONFIG
  // ============================================================
  debug: true,

  // User aliases → Internal operations
  operationAliases: {
    read: "select",
    insert: "create",
    query: "select",
    fetch: "select",
    add: "create",
    remove: "delete",
    modify: "update",
    patch: "update",
  },

  // User aliases → Canonical doctypes
  doctypeAliases: {
    user: "User",
    order: "Sales Order",
    customer: "Customer",
    item: "Item",
    invoice: "Sales Invoice",
  },

  // ✅ NEW: Operation behavior configuration for controller
  operations: {
    select: {
      type: "read",
      draft: false, // ✅ ADD THIS - Reading, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    takeone: {
      type: "read",
      draft: false, // ✅ ADD THIS - Viewing, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    create: {
      type: "write",
      draft: true, // ✅ ADD THIS - Creating, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    update: {
      type: "write",
      draft: true, // ✅ ADD THIS - Editing, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    delete: {
      type: "write",
      draft: false, // ✅ ADD THIS - Deleting, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: true,
      bypassController: false,
    },
    upsert: {
      type: "write",
      draft: true, // ✅ ADD THIS - Upserting, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    bulk_update: {
      type: "write",
      draft: false, // ✅ ADD THIS - Bulk ops, not draft-based
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
  },

  // ✅ ADD THIS SECTION:
  views: {
    list: {
      component: "MainGrid",
      container: "main_container",
      options: {
        render: true,
      },
    },
    form: {
      component: "MainForm",
      container: "main_container",
      options: {
        render: true,
      },
    },
    chat: {
      component: "MainChat",
      container: "right_pane",
      options: {
        render: true,
      },
    },
  },

  // old structure
  // Operation → View mapping
  operationToView: {
    select: "list",
    create: "form",
    update: "form",
    delete: null,
    takeone: "form", // Internal operation for rendering
  },

  // View → Component mapping
  viewToComponent: {
    list: "MainGrid",
    form: "MainForm",
    chat: "MainChat",
    grid: "MainGrid",
    detail: "MainForm",
    conversation: "MainChat",
  },

  // View → Container mapping
  viewToContainer: {
    list: "main_container",
    form: "main_container",
    chat: "right_pane",
    grid: "main_container",
    detail: "main_container",
    MainGrid: "main_container",
    MainForm: "main_container",
    MainChat: "right_pane",
  },

  behaviorMatrix: {
    // ═══════════════════════════════════════════════════════════
    // MATRIX: [is_submittable]-[docstatus]-[_autosave]
    // Only 8 meaningful combinations (2 × 4 × 1 for non-submittable)
    // ═══════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────
    // Non-Submittable Documents (is_submittable = 0)
    // ───────────────────────────────────────────────────────────

    "0-0-0": {
      name: "Non-Submittable, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"],
        badge: null,
      },
      controller: {
        autoSave: false, // Don't auto-save
        validateOnChange: true, // But do validate for feedback
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    "0-0-1": {
      name: "Non-Submittable, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"], // Keep save button anyway
        badge: null,
      },
      controller: {
        autoSave: true, // Auto-save enabled
        validateOnChange: true, // Validate before saving
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - DRAFT (is_submittable = 1, docstatus = 0)
    // ───────────────────────────────────────────────────────────

    "1-0-0": {
      name: "Submittable Draft, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    "1-0-1": {
      name: "Submittable Draft, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: true,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - SUBMITTED (is_submittable = 1, docstatus = 1)
    // ───────────────────────────────────────────────────────────

    "1-1-0": {
      name: "Submitted Document, Manual Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    "1-1-1": {
      name: "Submitted Document, Auto-Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: true, // For allow_on_submit fields
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - CANCELLED (is_submittable = 1, docstatus = 2)
    // ───────────────────────────────────────────────────────────

    "1-2-0": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false,
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },

    "1-2-1": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false, // Doesn't matter, nothing editable
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },
  },

  fieldInteractionConfig: {
    // ═══════════════════════════════════════════════════════════
    // Field interaction triggers (independent of auto-save)
    // ═══════════════════════════════════════════════════════════

    triggers: {
      onChange: {
        enabled: true, // Fire on every change
        debounce: 300, // Wait 300ms after last change
        action: "write_draft", // Always write to draft
      },

      onBlur: {
        enabled: true, // Fire when field loses focus
        debounce: 0, // Immediate
        action: "validate", // Validate when leaving field
      },
    },

    // You can configure different profiles
    profiles: {
      default: {
        onChange: { enabled: true, debounce: 300, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
      },

      blur_save: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "auto_save" },
      },

      instant: {
        onChange: { enabled: true, debounce: 0, action: "auto_save" },
        onBlur: { enabled: false },
      },

      manual_only: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
      },
    },

    // Active profile
    activeProfile: "default",
  },

  // ✅ Field types - just element + events
  fieldTypes: {
    // ════════════════════════════════════════════════════════
    // TEXT INPUTS
    // ════════════════════════════════════════════════════════

    Data: {
      element: "input",
      props: { type: "text" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    Text: {
      element: "textarea",
      props: { rows: 3 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    "Long Text": {
      element: "textarea",
      props: { rows: 6 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // NUMERIC INPUTS
    // ════════════════════════════════════════════════════════

    Int: {
      element: "input",
      props: {
        type: "number",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseInt", // Parse to integer
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Float: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Currency: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // BOOLEAN
    // ════════════════════════════════════════════════════════

    Check: {
      element: "input",
      props: {
        type: "checkbox",
        checked: "{{value || false}}", // Use checked, not value
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value || false}}" },
      events: {
        onChange: {
          updateState: "localValue",
          extract: "checked", // Extract e.target.checked instead of value
          delegate: "onChange",
        },
        // No onBlur for checkbox - change is immediate
      },
    },

    // ════════════════════════════════════════════════════════
    // DATE/TIME
    // ════════════════════════════════════════════════════════

    Date: {
      element: "input",
      props: { type: "date" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No debounce for date picker - selection is final
      },
    },

    Datetime: {
      element: "input",
      props: { type: "datetime-local" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    Time: {
      element: "input",
      props: { type: "time" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // SELECT
    // ════════════════════════════════════════════════════════

    Select: {
      element: "select",
      props: {
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value}}" },
      children: [
        {
          element: "option",
          props: { value: "" },
          content: "",
        },
        {
          repeat:
            "{{(field.options || '').split('\\n').filter(o => o.trim())}}",
          element: "option",
          props: { value: "{{item}}" },
          content: "{{item}}",
        },
      ],
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No onBlur for select - selection is final
      },
    },
    // ════════════════════════════════════════════════════════
    // LAYOUT FIELDS - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Section Break": {
      layoutOnly: true,
      render: function ({ field }) {
        if (!field.label) {
          return React.createElement("div", {
            className: window.CWStyles.form.sectionBreak, // ✅ CSS only
          });
        }

        return React.createElement(
          "div",
          { className: window.CWStyles.form.sectionBreak }, // ✅ CSS only
          React.createElement(
            "h4",
            {
              className: window.CWStyles.form.sectionBreakTitle, // ✅ CSS only
            },
            field.label
          )
        );
      },
    },

    "Tab Break": {
      layoutOnly: true,
      render: function ({ field }) {
        return React.createElement(
          "div",
          { className: window.CWStyles.form.tabBreak }, // ✅ CSS only
          field.label &&
            React.createElement(
              "h3",
              {
                className: window.CWStyles.form.tabBreakTitle, // ✅ CSS only
              },
              field.label
            )
        );
      },
    },

    "Column Break": {
      layoutOnly: true,
      render: function () {
        return null; // ✅ CSS Grid handles layout
      },
    },

 "Code": {
    element: "textarea",
    props: { 
      rows: 10,
      className: "{{CWStyles.field.code}}"  // ✅ Single class
    },
    state: { localValue: "{{value || ''}}" },
    events: {
      onChange: { updateState: "localValue", delegate: "onChange" },
      onBlur: { delegate: "onBlur" },
      onKeyDown: {
        custom: true,
        handler: function(e, setState, handlers, field) {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const value = e.target.value;
            const newValue = value.substring(0, start) + '  ' + value.substring(end);
            
            setState(prev => ({ ...prev, localValue: newValue }));
            setTimeout(() => {
              e.target.selectionStart = e.target.selectionEnd = start + 2;
            }, 0);
          }
        }
      }
    }
  },

    // ════════════════════════════════════════════════════════
    // ATTACH IMAGE - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Attach Image": {
      customComponent: true,
      render: function ({ field, value, handlers, run }) {
        const [preview, setPreview] = React.useState(value || null);
        const [uploading, setUploading] = React.useState(false);

        const handleFileSelect = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => setPreview(e.target.result);
          reader.readAsDataURL(file);

          setUploading(true);
          const base64 = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
          });

          if (handlers.onChange) {
            handlers.onChange(field.fieldname, base64);
          }
          setUploading(false);
        };

        const handleRemove = () => {
          setPreview(null);
          if (handlers.onChange) {
            handlers.onChange(field.fieldname, null);
          }
        };

        return React.createElement(
          "div",
          { className: window.CWStyles.field.attachImageWrapper }, // ✅ CSS only

          // Preview
          preview &&
            React.createElement(
              "div",
              {
                className: window.CWStyles.field.attachImagePreview, // ✅ CSS only
              },
              React.createElement("img", { src: preview }),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: window.CWStyles.field.attachImageRemove, // ✅ CSS only
                  onClick: handleRemove,
                },
                "×"
              )
            ),

          // File input
          !preview &&
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              onChange: handleFileSelect,
              disabled: field.read_only || uploading,
            }),

          uploading &&
            React.createElement(
              "span",
              {
                className: window.CWStyles.field.attachImageUploading, // ✅ CSS only
              },
              "Uploading..."
            )
        );
      },
    },

    // ════════════════════════════════════════════════════════
  // MISSING EASY TYPES
  // ════════════════════════════════════════════════════════
  
  "Percent": {
    element: "input",
    props: { 
      type: "number",
      step: "0.01",
      min: "0",
      max: "100"
    },
    state: { 
      localValue: "{{value === null || value === undefined ? '' : value}}"
    },
    events: {
      onChange: { 
        updateState: "localValue",
        transform: "parseFloat",
        delegate: "onChange" 
      },
      onBlur: { delegate: "onBlur" }
    },
    suffix: "%"  // ✅ Will display % after input
  },
  
  "Text Editor": {
    element: "textarea",
    props: { 
      rows: 10,
      className: "{{CWStyles.field.textarea}}"
    },
    state: { 
      localValue: "{{value || ''}}"
    },
    events: {
      onChange: { 
        updateState: "localValue",
        delegate: "onChange" 
      },
      onBlur: { delegate: "onBlur" }
    }
  },
  
  "Password": {
    element: "input",
    props: { 
      type: "password",
      autocomplete: "current-password"
    },
    state: { localValue: "{{value || ''}}" },
    events: {
      onChange: { updateState: "localValue", delegate: "onChange" },
      onBlur: { delegate: "onBlur" }
    }
  },
  
// ════════════════════════════════════════════════════════
  // FIX: Read Only - Proper className concatenation
  // ════════════════════════════════════════════════════════
  
  "Read Only": {
    element: "input",
    props: { 
      type: "text",
      readOnly: true,
      // ✅ Concatenate inside single template expression
      className: "{{CWStyles.field.input + ' ' + CWStyles.input.readOnly}}"
    },
    state: { localValue: "{{value || ''}}" },
    events: {}  // No events for read-only
  },
  
  "HTML": {
    layoutOnly: true,
    render: function({ field, value }) {
      // Display HTML content from field.options or value
      const htmlContent = field.options || value || '';
      
      return React.createElement("div", {
        className: window.CWStyles.field.html,
        dangerouslySetInnerHTML: { __html: htmlContent }
      });
    }
  },
  
  "Button": {
    layoutOnly: true,
    render: function({ field, handlers }) {
      const handleClick = () => {
        if (handlers.onAction) {
          handlers.onAction(field.fieldname, {
            action: field.fieldname,
            label: field.label
          });
        }
      };
      
      return React.createElement("button", {
        type: "button",
        className: window.CWStyles.button.primary,
        onClick: handleClick,
        disabled: field.read_only
      }, field.label || 'Button');
    }
  },

    // ════════════════════════════════════════════════════════
    // COMPLEX FIELDS (inline component definitions)
    // ════════════════════════════════════════════════════════

    Link: {
      customComponent: true,

      render: function ({ field, value, handlers, run }) {
        const [options, setOptions] = React.useState([]);
        const [isOpen, setIsOpen] = React.useState(false);
        const [searchText, setSearchText] = React.useState(value || "");

        const loadOptions = async () => {
          const childRun = await run.child({
            operation: "select",
            doctype: field.options,
            query: { take: 50 },
            options: { render: false },
          });

          if (childRun.success) {
            setOptions(childRun.output.data);
            setIsOpen(true);
          }
        };

        const handleSelect = (option) => {
          setSearchText(option.name);
          setIsOpen(false);

          if (handlers.onChange) {
            handlers.onChange(field.fieldname, option.name);
          }
        };

        return React.createElement(
          "div",
          { className: window.CWStyles.field.link }, // ✅ Your existing cw-field-link

          // Input
          React.createElement("input", {
            type: "text",
            className: window.CWStyles.field.linkInput, // ✅ Your existing cw-field-link-input
            value: searchText,
            onFocus: loadOptions,
            onChange: (e) => setSearchText(e.target.value),
            placeholder: `Select ${field.label}...`,
            readOnly: field.read_only,
          }),

          // Dropdown
          isOpen &&
            React.createElement(
              "div",
              {
                className: window.CWStyles.field.linkDropdown, // ✅ Your existing cw-field-link-dropdown
                style: { display: "block" }, // ✅ Override display: none from CSS when open
              },
              options.map((opt) =>
                React.createElement(
                  "div",
                  {
                    key: opt.name,
                    className: window.CWStyles.field.linkOption, // ✅ New class we just added
                    onClick: () => handleSelect(opt),
                  },
                  opt.name
                )
              )
            )
        );
      },
    },
  },

  // ✅ Element defaults - applied automatically
  elementDefaults: {
    input: {
      className: "{{CWStyles.field.input}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    textarea: {
      className: "{{CWStyles.field.textarea}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    select: {
      className: "{{CWStyles.field.select}}",
      disabled: "{{readOnly}}",
    },
  },

  // ✅ Interaction config
  fieldInteractionConfig: {
    activeProfile: "default",
    profiles: {
      default: {
        onChange: { enabled: true, debounce: 300, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "auto_save" },
      },
    },
  },

  getBehavior: function (schema, doc) {
    // Extract key parameters
    const isSubmittable = schema?.is_submittable || 0;
    const docstatus = doc?.docstatus !== undefined ? doc.docstatus : 0;
    const autosave = schema?._autosave !== undefined ? schema._autosave : 1;

    // Build key
    const key = `${isSubmittable}-${docstatus}-${autosave}`;

    // Lookup behavior
    const behavior = this.behaviorMatrix[key];

    if (!behavior) {
      console.warn(`No behavior defined for: ${key}`);
      // Return safe defaults
      return this.behaviorMatrix["0-0-0"];
    }

    return behavior;
  },

  _evalTemplate: function (template, context) {
    if (typeof template !== "string") return template;

    const match = template.match(/^\{\{(.+)\}\}$/);
    if (!match) return template;

    const expr = match[1];
    try {
      return new Function(...Object.keys(context), `return ${expr}`)(
        ...Object.values(context)
      );
    } catch (e) {
      console.warn(`Template eval error: ${expr}`, e);
      return template;
    }
  },

  _evalTemplateObj: function (obj, context) {
    if (!obj) return {};

    const result = {};
    for (const key in obj) {
      result[key] = this._evalTemplate(obj[key], context);
    }
    return result;
  },

  // ============================================================
  // FIELD HANDLERS CONFIG (Rendering Only)
  // ============================================================
  field_handlers: {
    // ===== TEXT FIELDS =====
    Data: {
      component: "FieldData",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Text: {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Long Text": {
      component: "FieldLongText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Small Text": {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Read Only": {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== NUMERIC FIELDS =====
    Int: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Float: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Currency: {
      component: "FieldCurrency",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Percent: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Rating: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Duration: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },

    // ===== BOOLEAN FIELDS =====
    Check: {
      component: "FieldCheck",
      category: "boolean",
      jstype: "boolean",
      value_processor: "boolean",
    },

    // ===== CHOICE FIELDS =====
    Select: {
      component: "FieldSelect",
      category: "choice",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverSelect",
    },

    // ===== REFERENCE FIELDS =====
    Link: {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverLink",
    },
    "Dynamic Link": {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
    },

    // ===== DATE/TIME FIELDS =====
    Date: {
      component: "FieldDate",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Datetime: {
      component: "FieldDatetime",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Time: {
      component: "FieldTime",
      category: "date",
      jstype: "string",
      value_processor: "text",
    },

    // ===== MULTI-VALUE FIELDS =====
    MultiSelect: {
      _handler: "_handleMultiSelectField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },
    MultiCheck: {
      _handler: "_handleMultiCheckField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== CHILD TABLE FIELDS =====
    Table: {
      _handler: "_handleTableField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },
    "Table MultiSelect": {
      _handler: "_handleTableMultiSelectField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== MEDIA FIELDS =====
    Attach: {
      _handler: "_handleAttachField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    "Attach Image": {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Image: {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Signature: {
      _handler: "_handleSignatureField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },

    // ===== SPECIAL FIELDS =====
    HTML: {
      _handler: "_handleHTMLField",
      category: "layout",
      jstype: "string",
      value_processor: "text",
    },
    "HTML Editor": {
      _handler: "_handleHTMLEditorField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Code: {
      _handler: "_handleCodeField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Markdown Editor": {
      _handler: "_handleMarkdownField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    JSON: {
      _handler: "_handleJSONField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },
    Geolocation: {
      _handler: "_handleGeolocationField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },

    // ===== INPUT FIELDS =====
    Autocomplete: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Barcode: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Color: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Phone: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== LAYOUT FIELDS (no component needed) =====
    "Section Break": {
      category: "layout",
      jstype: "null",
    },
    "Column Break": {
      category: "layout",
      jstype: "null",
    },
    Heading: {
      category: "layout",
      jstype: "null",
    },
    Fold: {
      category: "layout",
      jstype: "null",
    },

    // ===== CONTROL FIELDS =====
    Button: {
      category: "control",
      jstype: "null",
    },
  },

  // ============================================================
  // FIELD METADATA (from Configuration doctype)
  // ============================================================
  fieldtypes: {
    all_fieldtypes: {
      Attach: { category: "media", jstype: "string" },
      AttachImage: { category: "media", jstype: "string" },
      Autocomplete: { category: "input", jstype: "string" },
      Barcode: { category: "input", jstype: "string" },
      Button: { category: "control", jstype: "null" },
      Check: { category: "boolean", jstype: "boolean" },
      Code: { category: "text", jstype: "string" },
      Color: { category: "input", jstype: "string" },
      "Column Break": { category: "layout", jstype: "null" },
      Currency: { category: "numeric", jstype: "number" },
      Data: { category: "text", jstype: "string" },
      Date: { category: "date", jstype: "string" },
      Datetime: { category: "date", jstype: "string" },
      Duration: { category: "numeric", jstype: "number" },
      "Dynamic Link": { category: "reference", jstype: "string" },
      Float: { category: "numeric", jstype: "number" },
      Fold: { category: "layout", jstype: "null" },
      Geolocation: { category: "data", jstype: "object" },
      Heading: { category: "layout", jstype: "null" },
      HTML: { category: "layout", jstype: "string" },
      "HTML Editor": { category: "text", jstype: "string" },
      Image: { category: "media", jstype: "string" },
      Int: { category: "numeric", jstype: "number" },
      JSON: { category: "data", jstype: "object" },
      Link: { category: "reference", jstype: "string" },
      "Long Text": { category: "text", jstype: "string" },
      "Markdown Editor": { category: "text", jstype: "string" },
      MultiCheck: { category: "multi", jstype: "array" },
      MultiSelect: { category: "multi", jstype: "array" },
      Percent: { category: "numeric", jstype: "number" },
      Phone: { category: "input", jstype: "string" },
      "Read Only": { category: "input", jstype: "string" },
      Rating: { category: "numeric", jstype: "number" },
      "Section Break": { category: "layout", jstype: "null" },
      Select: { category: "choice", jstype: "string" },
      Signature: { category: "media", jstype: "string" },
      "Small Text": { category: "text", jstype: "string" },
      Table: { category: "child", jstype: "array" },
      "Table MultiSelect": { category: "child", jstype: "array" },
      Text: { category: "text", jstype: "string" },
      Time: { category: "date", jstype: "string" },
    },

    boolean_fieldtypes: ["Check"],
    child_fieldtypes: ["Table", "Table MultiSelect"],
    date_fieldtypes: ["Date", "Datetime", "Duration", "Time"],
    html_fieldtypes: ["HTML", "HTML Editor", "Markdown Editor"],
    layout_fieldtypes: ["Column Break", "Fold", "Heading", "Section Break"],
    multi_value_fieldtypes: ["MultiCheck", "MultiSelect", "Table MultiSelect"],
    numeric_fieldtypes: [
      "Currency",
      "Duration",
      "Float",
      "Int",
      "Percent",
      "Rating",
    ],
    text_fieldtypes: [
      "Autocomplete",
      "Barcode",
      "Code",
      "Color",
      "Data",
      "Long Text",
      "Phone",
      "Read Only",
      "Select",
      "Small Text",
      "Text",
    ],

    link_behavior: {
      default: "lazy",
      overrides: {
        Company: "cached",
        Role: "lazy",
        User: "eager",
      },
    },

    std_fields_override: {
      creation: {
        jstype: "string",
        description: "ISO datetime string when created",
      },
      docstatus: { jstype: "number", enum: [0, 1, 2] },
      idx: { jstype: "number" },
      modified: { jstype: "string" },
      modified_by: { jstype: "string", link: "User" },
      name: { jstype: "string", description: "Primary key" },
      owner: { jstype: "string", link: "User" },
      parent: { jstype: "string", link: "Any" },
      parentfield: { jstype: "string" },
      parenttype: { jstype: "string" },
    },
  },

  // ============================================================
  // RENDER BEHAVIOR
  // ============================================================
  render_behavior: {
    value_processors: {
      boolean: "Boolean(value)",
      date: "new Date(value).toISOString()",
      numeric: "Number(value)",
      text: "String(value)",
      multi: "Array.isArray(value) ? value : []",
    },
  },

  // ============================================================
  // LAYOUT RULES
  // ============================================================
  layout_rules: {
    "Section Break": {
      type: "container",
      className: "form.section",
      creates_section: true,
      header: { type: "heading", level: 3, className: "form.sectionLabel" },
    },
    "Column Break": {
      type: "container",
      className: "form.column",
      creates_column: true,
    },
    _default: {
      type: "field",
      wrapper: { type: "container", className: "form.fieldWrapper" },
    },
  },

  // ============================================================
  // RENDER MAP (Universal Renderer Config)
  // ============================================================
  render_map: {
    container: { element: "div" },
    heading: { element: (cfg) => `h${cfg.level || 2}` },
    label: { element: "label" },
    field: { handler: "_renderField" },
    button: { element: "button" },
    link: { element: "a" },
    component: { handler: "_renderComponent" },
  },
};

// ============================================================
// FIELD RESOLVERS (For fetching field options)
// ============================================================

coworker._resolverLink = async function (field, searchTerm) {
  return await this.run({
    operation: "select",
    doctype: field.options,
    input: {
      where: { name: { contains: searchTerm } },
      take: 20,
    },
    component: "FieldLink",
    container: `field_${field.fieldname}`,
    options: { render: true },
  });
};

coworker._resolverSelect = async function (field) {
  const options = field.options.split("\n").map((opt) => ({ name: opt }));
  return { success: true, output: { data: options } };
};

// ============================================================
// VALUE PROCESSORS
// ============================================================

coworker._processValue = function (processorName, value) {
  const processor =
    this._config.render_behavior.value_processors[processorName];
  if (!processor) return value;

  try {
    return eval(processor);
  } catch (err) {
    console.error("Value processor error:", err);
    return value;
  }
};

// ============================================================
// CUSTOM FIELD HANDLERS (Return render config)
// ============================================================

coworker._handleTableField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "TableField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleMultiSelectField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "MultiSelectField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleMultiCheckField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "MultiCheckField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleTableMultiSelectField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "TableMultiSelectField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleAttachField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "AttachField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleAttachImageField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "AttachImageField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleSignatureField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "SignatureField",
    props: { field, value, docname, doctype },
  };
};

coworker._handleHTMLField = function ({ field, value }) {
  return {
    type: "container",
    className: "form.fieldWrapper",
    children: [
      {
        type: "label",
        className: "form.label",
        content: field.label,
      },
      {
        type: "container",
        className: "field.html",
        dangerouslySetInnerHTML: { __html: value || "" },
      },
    ],
  };
};

coworker._handleHTMLEditorField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "HTMLEditor",
    props: { field, value, docname, doctype },
  };
};

coworker._handleCodeField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "CodeEditor",
    props: { field, value, docname, doctype },
  };
};

coworker._handleMarkdownField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "MarkdownEditor",
    props: { field, value, docname, doctype },
  };
};

coworker._handleJSONField = function ({ field, value, docname, doctype }) {
  return {
    type: "component",
    component: "JSONEditor",
    props: { field, value, docname, doctype },
  };
};

coworker._handleGeolocationField = function ({
  field,
  value,
  docname,
  doctype,
}) {
  return {
    type: "component",
    component: "GeolocationField",
    props: { field, value, docname, doctype },
  };
};
