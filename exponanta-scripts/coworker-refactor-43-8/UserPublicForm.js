
{
  "schema_name": "UserPublicProfile",
  "doctype": "Schema",
  "title_field": "full_name",
  "_autosave": 0,
  "is_submittable": 1,
  "fields": [
    { "fieldname": "email",     "fieldtype": "Data",     "label": "Email",     "reqd": 1, "virtual": 1 },
    { "fieldname": "password",  "fieldtype": "Password", "label": "Password",  "reqd": 1, "virtual": 1 },
    { "fieldname": "full_name", "fieldtype": "Data",     "label": "Full Name", "reqd": 1 },
    { "fieldname": "section_identity", "fieldtype": "Section Break", "label": "Identity", "depends_on": "eval:doc.name" },
    { "fieldname": "title",     "fieldtype": "Data",     "label": "Title",     "depends_on": "eval:doc.name" },
    { "fieldname": "bio",       "fieldtype": "Text",     "label": "Bio",       "depends_on": "eval:doc.name" },
    { "fieldname": "linkedin",  "fieldtype": "Data",     "label": "LinkedIn",  "depends_on": "eval:doc.name" },
    { "fieldname": "website",   "fieldtype": "Data",     "label": "Website",   "depends_on": "eval:doc.name" }
  ],
  "_state": {
    "0": {
      "values": [0, 1],
      "options": ["Draft", "Submitted"],
      "transitions": { "0": [1] },
      "labels": { "0_1": "Sign Up" },
      "primary": { "0_1": true },
      "sideEffects": { "0_1": "Adapter.pocketbase.signUp" }
    }
  }
},




version 2.


{
  "schema_name": "UserPublicProfile",
  "doctype": "Schema",
  "title_field": "full_name",
  "is_submittable": 1,
  "autoname": "generateId",

  "fields": [
    {
      "fieldname": "full_name",
      "fieldtype": "Data",
      "label": "Full Name",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "section_identity",
      "fieldtype": "Section Break",
      "label": "Identity"
    },
    {
      "fieldname": "title",
      "fieldtype": "Data",
      "label": "Title / Role",
      "in_list_view": 1
    },
    {
      "fieldname": "organization",
      "fieldtype": "Data",
      "label": "Organization",
      "in_list_view": 1
    },
    {
      "fieldname": "chapter",
      "fieldtype": "Data",
      "label": "Chapter"
    },
    {
      "fieldname": "avatar_url",
      "fieldtype": "Data",
      "label": "Avatar URL"
    },
    {
      "fieldname": "section_bio",
      "fieldtype": "Section Break",
      "label": "About"
    },
    {
      "fieldname": "bio",
      "fieldtype": "Text",
      "label": "Bio"
    },
    {
      "fieldname": "section_links",
      "fieldtype": "Section Break",
      "label": "Links"
    },
    {
      "fieldname": "linkedin",
      "fieldtype": "Data",
      "label": "LinkedIn URL"
    },
    {
      "fieldname": "website",
      "fieldtype": "Data",
      "label": "Website"
    },
    {
      "fieldname": "section_relationships",
      "fieldtype": "Section Break",
      "label": "Relationships"
    },
    {
      "fieldname": "relationships",
      "fieldtype": "Relationship Panel",
      "label": "Relationships"
    }
  ],

  "permissions": [
    { "role": "All",            "read": 1 },
    { "role": "Self",           "read": 1, "write": 1, "create": 1 },
    { "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1 }
  ],

 "_state": {
  "0": {
    "values": [0, 1, 2],
    "options": ["Draft", "Published", "Unpublished"],
    "transitions": { "0": [1, 2], "1": [2], "2": [0] },
    "labels": { "0_1": "Publish", "0_2": "Discard", "1_2": "Unpublish", "2_0": "Edit" },
    "primary": { "0_1": false },
    "requires": { "0_1": { "is_submittable": 1 } }
  },
  "1": {
    "values": [0, 1, 2, 3],
    "options": ["Active", "ChangePassword", "ChangeEmail", "LoggedOut"],
    "transitions": { "0": [1, 2, 3], "1": [0], "2": [0] },
    "labels": {
      "0_1": "Change Password",
      "0_2": "Change Email",
      "0_3": "Log Out",
      "1_0": "Update Password",
      "2_0": "Update Email"
    },
    "primary": {
      "1_0": true,
      "2_0": true
    },
    "sideEffects": {
      "1_0": "Adapter.pocketbase.confirmPasswordReset",
      "2_0": "Adapter.pocketbase.confirmEmailChange",
      "0_3": "Adapter.pocketbase.authClear"
    }
  }
}
},
