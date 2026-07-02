// to add Schema definition for virtual fields:
javascript// User schema
{ fieldname: "token", fieldtype: "Data", is_virtual: 1 }
// verification_code is also virtual
{ fieldname: "verification_code", fieldtype: "Data", is_virtual: 1 }

//v2 

// FSM schema — defines the transition
schema._state = {
  "1.name": "_auth",
  "1.0_1.Adapter.auth.signup": ""  // transition definition
}

// Permissions — defines who can trigger it and how it's labeled
schema.permissions = {
  "System Manager": {
    "1.0_1.label": "Activate User",
  },
  "Self": {
    "1.0_1.label": "Accept Invite",
    "1.0_1.message": "Welcome!"
  }
}

// Document _state — records what happened
doc._state = {
  "1.0_1.Adapter.auth.signup": "1"  // completed
}

//_______________ document state

target.data._state = {  //< -- NOT verified
  1: {
    "0_1": 1,   // success
    "0_2": -1   // failure
  }
};


  "CW.Schema['User']":
  {
  "_state":    //fulleFSM here 
   {
  "1": {
    "name": "_auth",
    "values": [0, 1, 2, 3],
    "options": ["Invited/Unverified", "Active/Unverified", "Active/Verified", "Locked"],
    "transitions": {
      "0_1": { "handler": "...", "sideEffects": "..." },  // Invited → Active/Unverified
      "1_2": { "handler": "...", "sideEffects": "..." },  // Active/Unverified → Active/Verified
      "2_3": { "handler": "...", "sideEffects": "..." },  // Active/Verified → Locked
      "3_1": { "handler": "...", "sideEffects": "..." }   // Locked → Unlock
    }
  }
},
  "actions": [],
  "allow_import": 1,
  "allow_rename": 1,
  "autoname": "field:email",   //new nameresolution 
  "creation": "2022-01-10 17:29:51.672911",
  "description": "Represents a User in the system.",
  "doctype": "Schema",
  "engine": "InnoDB",
  "field_order": [
    "user_details_tab",
    "enabled",
    "section_break_3",
    "email",
    "first_name",
    "middle_name",
    "last_name",
    "column_break0",
    "full_name",
    "username",
    "column_break_11",
    "language",
    "time_zone",
    "send_welcome_email",
    "unsubscribed",
    "user_image",
    "roles_permissions_tab",
    "sb1",
    "role_profile_name",
    "role_profiles",
    "roles_html",
    "roles",
    "sb_allow_modules",
    "module_profile",
    "modules_html",
    "block_modules",
    "home_settings",
    "short_bio",
    "gender",
    "birth_date",
    "interest",
    "column_break_26",
    "phone",
    "location",
    "bio",
    "column_break_22",
    "mobile_no",
    "settings_tab",
    "desk_settings_section",
    "mute_sounds",
    "desk_theme",
    "code_editor_type",
    "banner_image",
    "navigation_settings_section",
    "search_bar",
    "notifications",
    "list_settings_section",
    "list_sidebar",
    "bulk_actions",
    "view_switcher",
    "form_settings_section",
    "form_sidebar",
    "timeline",
    "dashboard",
    "change_password",
    "new_password",
    "logout_all_sessions",
    "reset_password_key",
    "last_reset_password_key_generated_on",
    "last_password_reset_date",
    "redirect_url",
    "document_follow_notifications_section",
    "document_follow_notify",
    "document_follow_frequency",
    "column_break_75",
    "follow_created_documents",
    "follow_commented_documents",
    "follow_liked_documents",
    "follow_assigned_documents",
    "follow_shared_documents",
    "email_settings",
    "email_signature",
    "thread_notify",
    "send_me_a_copy",
    "allowed_in_mentions",
    "user_emails",
    "workspace_section",
    "default_workspace",
    "app_section",
    "default_app",
    "sb2",
    "defaults",
    "sb3",
    "simultaneous_sessions",
    "restrict_ip",
    "last_ip",
    "column_break1",
    "login_after",
    "user_type",
    "last_active",
    "section_break_63",
    "login_before",
    "bypass_restrict_ip_check_if_2fa_enabled",
    "last_login",
    "last_known_versions",
    "third_party_authentication",
    "social_logins",
    "api_access",
    "api_key",
    "generate_keys",
    "column_break_65",
    "api_secret",
    "onboarding_status",
    "connections_tab",
    "docstatus",
    "owner",
    "_allowed",
    "_allowed_read",
    "password",
    "tokenKey",
    "verified",
    "emailVisibility",
    "_state"   //storing nested value in target document
  ],
  "fields": [
    {
      "default": "1",
      "fieldname": "enabled",
      "fieldtype": "Check",
      "label": "Enabled",
      "oldfieldname": "enabled",
      "oldfieldtype": "Check",
      "read_only": 1
    },
    {
      "depends_on": "enabled",
      "fieldname": "section_break_3",
      "fieldtype": "Section Break",
      "label": "Basic Info"
    },
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "no_copy": 1,
      "oldfieldname": "email",
      "oldfieldtype": "Data",
      "options": "Email",
      "reqd": 1
    },
    {
      "fieldname": "first_name",
      "fieldtype": "Data",
      "label": "First Name",
      "oldfieldname": "first_name",
      "oldfieldtype": "Data",
      "reqd": 1
    },
    {
      "fieldname": "middle_name",
      "fieldtype": "Data",
      "label": "Middle Name",
      "oldfieldname": "middle_name",
      "oldfieldtype": "Data"
    },
    {
      "bold": 1,
      "fieldname": "last_name",
      "fieldtype": "Data",
      "label": "Last Name",
      "oldfieldname": "last_name",
      "oldfieldtype": "Data"
    },
    {
      "fieldname": "full_name",
      "fieldtype": "Data",
      "in_global_search": 1,
      "in_standard_filter": 1,
      "label": "Full Name",
      "read_only": 1
    },
    {
      "bold": 1,
      "default": "1",
      "depends_on": "eval:doc.__islocal",
      "fieldname": "send_welcome_email",
      "fieldtype": "Check",
      "label": "Send Welcome Email"
    },
    {
      "default": "0",
      "fieldname": "unsubscribed",
      "fieldtype": "Check",
      "hidden": 1,
      "label": "Unsubscribed",
      "no_copy": 1
    },
    {
      "fieldname": "column_break0",
      "fieldtype": "Column Break",
      "oldfieldtype": "Column Break",
      "print_width": "50%",
      "width": "50%"
    },
    {
      "fieldname": "username",
      "fieldtype": "Data",
      "in_global_search": 1,
      "in_standard_filter": 1,
      "label": "Username",
      "unique": 1
    },
    {
      "fieldname": "language",
      "fieldtype": "Link",
      "label": "Language",
      "options": "Language"
    },
    {
      "fieldname": "time_zone",
      "fieldtype": "Autocomplete",
      "label": "Time Zone"
    },
    {
      "description": "Get your globally recognized avatar from Gravatar.com",
      "fieldname": "user_image",
      "fieldtype": "Attach Image",
      "hidden": 1,
      "label": "User Image",
      "no_copy": 1,
      "print_hide": 1
    },
    {
      "depends_on": "eval:in_list(['System User', 'Website User'], doc.user_type) && doc.enabled == 1",
      "fieldname": "sb1",
      "fieldtype": "Section Break",
      "label": "Roles",
      "permlevel": 1,
      "read_only": 1
    },
    {
      "fieldname": "role_profile_name",
      "fieldtype": "Link",
      "hidden": 1,
      "label": "Role Profile",
      "options": "Role Profile",
      "permlevel": 1
    },
    {
      "fieldname": "roles_html",
      "fieldtype": "HTML",
      "label": "Roles HTML",
      "read_only": 1
    },
    {
      "fieldname": "roles",
      "fieldtype": "Table",
      "hidden": 1,
      "label": "Roles Assigned",
      "options": "Has Role",
      "permlevel": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "collapsible": 1,
      "depends_on": "enabled",
      "fieldname": "short_bio",
      "fieldtype": "Tab Break",
      "label": "More Information"
    },
    {
      "fieldname": "gender",
      "fieldtype": "Link",
      "label": "Gender",
      "oldfieldname": "gender",
      "oldfieldtype": "Select",
      "options": "Gender"
    },
    {
      "fieldname": "phone",
      "fieldtype": "Data",
      "label": "Phone",
      "options": "Phone"
    },
    {
      "fieldname": "mobile_no",
      "fieldtype": "Data",
      "label": "Mobile No",
      "options": "Phone",
      "unique": 1
    },
    {
      "fieldname": "birth_date",
      "fieldtype": "Date",
      "label": "Birth Date",
      "no_copy": 1,
      "oldfieldname": "birth_date",
      "oldfieldtype": "Date"
    },
    {
      "fieldname": "location",
      "fieldtype": "Data",
      "label": "Location",
      "no_copy": 1
    },
    {
      "fieldname": "banner_image",
      "fieldtype": "Attach Image",
      "label": "Banner Image"
    },
    {
      "fieldname": "column_break_22",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "interest",
      "fieldtype": "Small Text",
      "label": "Interests"
    },
    {
      "fieldname": "bio",
      "fieldtype": "Small Text",
      "label": "Bio",
      "no_copy": 1
    },
    {
      "default": "0",
      "fieldname": "mute_sounds",
      "fieldtype": "Check",
      "label": "Mute Sounds"
    },
    {
      "collapsible": 1,
      "depends_on": "eval:doc.enabled && (!doc.__islocal || !cint(doc.send_welcome_email))",
      "fieldname": "change_password",
      "fieldtype": "Section Break",
      "label": "Change Password"
    },
    {
      "fieldname": "new_password",
      "fieldtype": "Password",
      "label": "Set New Password",
      "no_copy": 1
    },
    {
      "default": "1",
      "fieldname": "logout_all_sessions",
      "fieldtype": "Check",
      "label": "Logout From All Devices After Changing Password"
    },
    {
      "fieldname": "reset_password_key",
      "fieldtype": "Data",
      "hidden": 1,
      "label": "Reset Password Key",
      "no_copy": 1,
      "permlevel": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "last_password_reset_date",
      "fieldtype": "Date",
      "hidden": 1,
      "label": "Last Password Reset Date",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1
    },
    {
      "fieldname": "redirect_url",
      "fieldtype": "Small Text",
      "hidden": 1,
      "label": "Redirect URL"
    },
    {
      "collapsible": 1,
      "fieldname": "document_follow_notifications_section",
      "fieldtype": "Section Break",
      "label": "Document Follow"
    },
    {
      "default": "0",
      "fieldname": "document_follow_notify",
      "fieldtype": "Check",
      "label": "Send Notifications For Documents Followed By Me"
    },
    {
      "default": "Daily",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "document_follow_frequency",
      "fieldtype": "Select",
      "label": "Frequency",
      "options": "Hourly\nDaily\nWeekly"
    },
    {
      "collapsible": 1,
      "depends_on": "enabled",
      "fieldname": "email_settings",
      "fieldtype": "Section Break",
      "label": "Email"
    },
    {
      "default": "1",
      "fieldname": "thread_notify",
      "fieldtype": "Check",
      "label": "Send Notifications For Email Threads"
    },
    {
      "default": "0",
      "fieldname": "send_me_a_copy",
      "fieldtype": "Check",
      "label": "Send Me A Copy of Outgoing Emails"
    },
    {
      "default": "1",
      "fieldname": "allowed_in_mentions",
      "fieldtype": "Check",
      "label": "Allowed In Mentions"
    },
    {
      "fieldname": "email_signature",
      "fieldtype": "Text Editor",
      "label": "Email Signature",
      "no_copy": 1
    },
    {
      "fieldname": "user_emails",
      "fieldtype": "Table",
      "label": "User Emails",
      "options": "User Email",
      "permlevel": 1
    },
    {
      "depends_on": "eval:in_list(['System User'], doc.user_type)",
      "fieldname": "sb_allow_modules",
      "fieldtype": "Section Break",
      "label": "Allow Modules",
      "permlevel": 1
    },
    {
      "fieldname": "modules_html",
      "fieldtype": "HTML",
      "label": "Modules HTML",
      "permlevel": 1
    },
    {
      "fieldname": "block_modules",
      "fieldtype": "Table",
      "hidden": 1,
      "label": "Block Modules",
      "options": "Block Module",
      "permlevel": 1
    },
    {
      "fieldname": "home_settings",
      "fieldtype": "Code",
      "hidden": 1,
      "label": "Home Settings"
    },
    {
      "description": "These values will be automatically updated in transactions and also will be useful to restrict permissions for this user on transactions containing these values.",
      "fieldname": "sb2",
      "fieldtype": "Section Break",
      "hidden": 1,
      "label": "Defaults",
      "oldfieldtype": "Column Break",
      "permlevel": 1,
      "print_width": "50%",
      "read_only": 1,
      "width": "50%"
    },
    {
      "description": "Enter default value fields (keys) and values. If you add multiple values for a field, the first one will be picked. These defaults are also used to set \"match\" permission rules. To see list of fields, go to \"Customize Form\".",
      "fieldname": "defaults",
      "fieldtype": "Table",
      "hidden": 1,
      "label": "User Defaults",
      "no_copy": 1,
      "options": "DefaultValue"
    },
    {
      "collapsible": 1,
      "depends_on": "enabled",
      "fieldname": "sb3",
      "fieldtype": "Section Break",
      "label": "Security Settings",
      "oldfieldtype": "Section Break",
      "read_only": 1
    },
    {
      "default": "2",
      "fieldname": "simultaneous_sessions",
      "fieldtype": "Int",
      "label": "Simultaneous Sessions"
    },
    {
      "bold": 1,
      "default": "System User",
      "description": "If the user has any role checked, then the user becomes a \"System User\". \"System User\" has access to the desktop",
      "fieldname": "user_type",
      "fieldtype": "Link",
      "in_list_view": 1,
      "in_standard_filter": 1,
      "label": "User Type",
      "oldfieldname": "user_type",
      "oldfieldtype": "Select",
      "options": "User Type",
      "permlevel": 1
    },
    {
      "description": "Allow user to login only after this hour (0-24)",
      "fieldname": "login_after",
      "fieldtype": "Int",
      "label": "Login After",
      "permlevel": 1
    },
    {
      "description": "Allow user to login only before this hour (0-24)",
      "fieldname": "login_before",
      "fieldtype": "Int",
      "label": "Login Before",
      "permlevel": 1
    },
    {
      "description": "Restrict user from this IP address only. Multiple IP addresses can be added by separating with commas. Also accepts partial IP addresses like (111.111.111)",
      "fieldname": "restrict_ip",
      "fieldtype": "Small Text",
      "label": "Restrict IP",
      "permlevel": 1
    },
    {
      "default": "0",
      "depends_on": "eval:doc.restrict_ip && doc.restrict_ip.length",
      "description": "If enabled,  user can login from any IP Address using Two Factor Auth, this can also be set for all users in System Settings",
      "fieldname": "bypass_restrict_ip_check_if_2fa_enabled",
      "fieldtype": "Check",
      "label": "Bypass Restricted IP Address Check If Two Factor Auth Enabled"
    },
    {
      "fieldname": "column_break1",
      "fieldtype": "Column Break",
      "oldfieldtype": "Column Break",
      "print_width": "50%",
      "width": "50%"
    },
    {
      "fieldname": "last_login",
      "fieldtype": "Read Only",
      "label": "Last Login",
      "no_copy": 1,
      "oldfieldname": "last_login",
      "oldfieldtype": "Read Only",
      "read_only": 1
    },
    {
      "fieldname": "last_ip",
      "fieldtype": "Read Only",
      "label": "Last IP",
      "no_copy": 1,
      "oldfieldname": "last_ip",
      "oldfieldtype": "Read Only",
      "read_only": 1
    },
    {
      "fieldname": "last_active",
      "fieldtype": "Datetime",
      "label": "Last Active",
      "no_copy": 1,
      "read_only": 1,
      "search_index": 1
    },
    {
      "description": "Stores the JSON of last known versions of various installed apps. It is used to show release notes.",
      "fieldname": "last_known_versions",
      "fieldtype": "Text",
      "hidden": 1,
      "label": "Last Known Versions",
      "read_only": 1
    },
    {
      "collapsible": 1,
      "depends_on": "enabled",
      "fieldname": "third_party_authentication",
      "fieldtype": "Section Break",
      "label": "Third Party Authentication",
      "permlevel": 1
    },
    {
      "fieldname": "social_logins",
      "fieldtype": "Table",
      "label": "Social Logins",
      "options": "User Social Login"
    },
    {
      "collapsible": 1,
      "fieldname": "api_access",
      "fieldtype": "Section Break",
      "label": "API Access"
    },
    {
      "description": "API Key cannot be regenerated",
      "fieldname": "api_key",
      "fieldtype": "Data",
      "label": "API Key",
      "no_copy": 1,
      "permlevel": 1,
      "read_only": 1,
      "unique": 1
    },
    {
      "fieldname": "generate_keys",
      "fieldtype": "Button",
      "label": "Generate Keys",
      "permlevel": 1
    },
    {
      "fieldname": "column_break_65",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "api_secret",
      "fieldtype": "Password",
      "label": "API Secret",
      "permlevel": 1,
      "read_only": 1
    },
    {
      "fieldname": "column_break_11",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "column_break_26",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "section_break_63",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "desk_theme",
      "fieldtype": "Select",
      "label": "Desk Theme",
      "options": "Light\nDark\nAutomatic"
    },
    {
      "fieldname": "module_profile",
      "fieldtype": "Link",
      "label": "Module Profile",
      "options": "Module Profile"
    },
    {
      "description": "Stores the datetime when the last reset password key was generated.",
      "fieldname": "last_reset_password_key_generated_on",
      "fieldtype": "Datetime",
      "hidden": 1,
      "label": "Last Reset Password Key Generated On",
      "permlevel": 1,
      "read_only": 1
    },
    {
      "fieldname": "column_break_75",
      "fieldtype": "Column Break"
    },
    {
      "default": "0",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "follow_created_documents",
      "fieldtype": "Check",
      "label": "Auto follow documents that you create"
    },
    {
      "default": "0",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "follow_commented_documents",
      "fieldtype": "Check",
      "label": "Auto follow documents that you comment on"
    },
    {
      "default": "0",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "follow_liked_documents",
      "fieldtype": "Check",
      "label": "Auto follow documents that you Like"
    },
    {
      "default": "0",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "follow_shared_documents",
      "fieldtype": "Check",
      "label": "Auto follow documents that are shared with you"
    },
    {
      "default": "0",
      "depends_on": "eval:(doc.document_follow_notify== 1)",
      "fieldname": "follow_assigned_documents",
      "fieldtype": "Check",
      "label": "Auto follow documents that are assigned to you"
    },
    {
      "fieldname": "user_details_tab",
      "fieldtype": "Tab Break",
      "label": "User Details"
    },
    {
      "fieldname": "roles_permissions_tab",
      "fieldtype": "Tab Break",
      "label": "Roles & Permissions"
    },
    {
      "fieldname": "settings_tab",
      "fieldtype": "Tab Break",
      "label": "Settings"
    },
    {
      "fieldname": "connections_tab",
      "fieldtype": "Tab Break",
      "label": "Connections",
      "show_dashboard": 1
    },
    {
      "collapsible": 1,
      "fieldname": "desk_settings_section",
      "fieldtype": "Section Break",
      "label": "Desk Settings"
    },
    {
      "default": "{}",
      "fieldname": "onboarding_status",
      "fieldtype": "Small Text",
      "hidden": 1,
      "label": "Onboarding Status"
    },
    {
      "allow_in_quick_entry": 1,
      "fieldname": "role_profiles",
      "fieldtype": "Table MultiSelect",
      "label": "Role Profiles",
      "options": "User Role Profile",
      "permlevel": 1
    },
    {
      "description": "If left empty, the default workspace will be the last visited workspace",
      "fieldname": "default_workspace",
      "fieldtype": "Link",
      "label": "Default Workspace",
      "options": "Workspace"
    },
    {
      "collapsible": 1,
      "fieldname": "workspace_section",
      "fieldtype": "Section Break",
      "label": "Workspace"
    },
    {
      "default": "vscode",
      "fieldname": "code_editor_type",
      "fieldtype": "Select",
      "label": "Code Editor Type",
      "options": "vscode\nvim\nemacs"
    },
    {
      "collapsible": 1,
      "fieldname": "app_section",
      "fieldtype": "Section Break",
      "label": "App"
    },
    {
      "description": "Redirect to the selected app after login",
      "fieldname": "default_app",
      "fieldtype": "Select",
      "label": "Default App"
    },
    {
      "collapsible": 1,
      "fieldname": "navigation_settings_section",
      "fieldtype": "Section Break",
      "label": "Navigation Settings"
    },
    {
      "default": "1",
      "fieldname": "search_bar",
      "fieldtype": "Check",
      "label": "Search Bar"
    },
    {
      "default": "1",
      "fieldname": "notifications",
      "fieldtype": "Check",
      "label": "Notifications"
    },
    {
      "collapsible": 1,
      "fieldname": "list_settings_section",
      "fieldtype": "Section Break",
      "label": "List Settings"
    },
    {
      "default": "1",
      "fieldname": "list_sidebar",
      "fieldtype": "Check",
      "label": "Sidebar"
    },
    {
      "default": "1",
      "fieldname": "bulk_actions",
      "fieldtype": "Check",
      "label": "Bulk Actions"
    },
    {
      "default": "1",
      "fieldname": "view_switcher",
      "fieldtype": "Check",
      "label": "View Switcher"
    },
    {
      "collapsible": 1,
      "fieldname": "form_settings_section",
      "fieldtype": "Section Break",
      "label": "Form Settings"
    },
    {
      "default": "1",
      "fieldname": "form_sidebar",
      "fieldtype": "Check",
      "label": "Sidebar"
    },
    {
      "default": "1",
      "fieldname": "timeline",
      "fieldtype": "Check",
      "label": "Timeline"
    },
    {
      "default": "1",
      "fieldname": "dashboard",
      "fieldtype": "Check",
      "label": "Dashboard"
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
      "fieldtype": "CODE",
      "hidden": 1,
      "label": "Owner",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1,
      "options": "JSON"
    },
    {
      "fieldname": "_allowed",
      "fieldtype": "CODE",
      "hidden": 1,
      "label": "Allowed Roles (Write)",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1,
      "options": "JSON"
    },
    {
      "fieldname": "_allowed_read",
      "fieldtype": "CODE",
      "hidden": 1,
      "label": "Allowed Roles (Read)",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1,
      "options": "JSON"
    },
    {
      "description": "Hashed password for user authentication",
      "fieldname": "password",
      "fieldtype": "Password",
      "label": "Password",
      "no_copy": 1
    },
    {
      "description": "Per-user secret used internally to sign JWTs; rotating it invalidates all active sessions",
      "fieldname": "tokenKey",
      "fieldtype": "Data",
      "hidden": 1,
      "label": "Token Key",
      "no_copy": 1
    },
    {
      "default": 0,
      "description": "Indicates whether the user's email is verified (0 = No, 1 = Yes)",
      "fieldname": "verified",
      "fieldtype": "Check",
      "label": "Email Verified"
    },
    {
      "default": 0,
      "description": "Controls whether the user's email is publicly visible (0 = Hidden, 1 = Visible)",
      "fieldname": "emailVisibility",
      "fieldtype": "Check",
      "label": "Email Visible"
    },
    {
      "fieldname": "_state",
      "fieldtype": "CODE",
      "hidden": 1,
      "label": "State",
      "no_copy": 1,
      "print_hide": 1,
      "read_only": 1,
      "options": "JSON"
    },
  ],
  "icon": "fa fa-user",
  "id": "7xzeg43zusjxdui",
  "idx": 413,
  "image_field": "user_image",
  "links": [
    {
      "group": "Profile",
      "link_doctype": "Contact",
      "link_fieldname": "user"
    },
    {
      "group": "Profile",
      "link_doctype": "Blogger",
      "link_fieldname": "user"
    },
    {
      "group": "Logs",
      "link_doctype": "Access Log",
      "link_fieldname": "user"
    },
    {
      "group": "Logs",
      "link_doctype": "Activity Log",
      "link_fieldname": "user"
    },
    {
      "group": "Logs",
      "link_doctype": "Energy Point Log",
      "link_fieldname": "user"
    },
    {
      "group": "Logs",
      "link_doctype": "Route History",
      "link_fieldname": "user"
    },
    {
      "group": "Settings",
      "link_doctype": "User Permission",
      "link_fieldname": "user"
    },
    {
      "group": "Settings",
      "link_doctype": "Document Follow",
      "link_fieldname": "user"
    },
    {
      "group": "Activity",
      "link_doctype": "Communication",
      "link_fieldname": "user"
    },
    {
      "group": "Activity",
      "link_doctype": "ToDo",
      "link_fieldname": "allocated_to"
    },
    {
      "group": "Integrations",
      "link_doctype": "Token Cache",
      "link_fieldname": "user"
    }
  ],
  "make_attachments_public": 1,
  "modified": "2025-03-17 11:29:39.254304",
  "modified_by": "Administrator",
  "module": "Core",
  "name": "schemauserxxxxx",
  "owner": "Administrator",
  "permissions": [
  { "role": "System Manager", "create": 1, "delete": 1, "read": 1, "write": 1,
    "0_1": { "label": "Activate User" },
    "1_2": { "label": "Verify Email" },
    "2_3": { "label": "Lock User" },
    "3_1": { "label": "Unlock User" } },

  { "role": "User Manager", "permlevel": 1, "read": 1, "write": 1 },

  { "role": "Desk User", "select": 1 },

  { "role": "Self",
    "0_1": { "label": "Accept Invite",   "message": "Welcome!" },
    "1_2": { "label": "Verify My Email", "message": "Email verified!" } }
],
  "quick_entry": 1,
  "route": "user",
  "row_format": "Dynamic",
  "schema_name": "User",
  "search_fields": "full_name",
  "show_name_in_global_search": 1,
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "title_field": "full_name",
  "track_changes": 1
}


//roles 

// FSM _state
"1": {
  "name": "_auth",
  "values": [0, 1, 2, 3],
  "options": ["Invited/Unverified", "Active/Unverified", "Active/Verified", "Locked"],

  "1.0_1": { "handler": "...", "sideEffects": "..." },  // Invited → Active/Unverified
  "1.1_2": { "handler": "...", "sideEffects": "..." },  // Active/Unverified → Active/Verified
  "1.2_3": { "handler": "...", "sideEffects": "..." },  // Active/Verified → Locked
  "1.3_1": { "handler": "...", "sideEffects": "..." },  // Locked → Active/Unverified (unlock)
}

//Schema

schema._state = 
{}
//after fsm
document._state =

// permissions
{ "role": "System Manager", "1.0_1": { "label": "Activate User" },
                             "1.1_2": { "label": "Verify Email" },
                             "1.2_3": { "label": "Lock User" },
                             "1.3_1": { "label": "Unlock User" } },

{ "role": "Self",            "1.0_1": { "label": "Accept Invite",  "message": "Welcome!" },
                             "1.1_2": { "label": "Verify My Email", "message": "Email verified!" } }
So Self gets 1 and 2, System Manager gets all four. No key = no permission stays intact.i mean schema._ with . notation, some references1:43 PMYou mean like dot-notation references showing how pieces connect:
jsschema._state["1"].name                          // "_auth"
schema._state["1"].options[0]                    // "Invited/Unverified"
schema._state["1"]["1.0_1"].handler              // transition handler fn

schema.permissions[3].role                       // "Self"
schema.permissions[3]["1.0_1"].label             // "Accept Invite"

schema.permissions[0].role                       // "System Manager"
schema.permissions[0]["1.2_3"].label             // "Lock User"

// in controller:
schema._state["1"]["1.0_1"]                      // FSM def
schema.permissions.find(p=>p.role==="Self")["1.0_1"]  // role overlay
So _state["1"]["1.0_1"] and permissions[n]["1.0_1"] share the same key — that's the join point.but how to find permission by role with . notation1:46 PMYou can't — permissions is an array, so dot notation alone doesn't work. You need find first, then dot notation after:
jsconst byRole = role => schema.permissions.find(p => p.role === role);

byRole("Self")["1.0_1"].label        // "Accept Invite"
byRole("System Manager")["1.2_3"].label  // "Lock User"
Or if you want pure dot notation, change permissions from array to object keyed by role:
jsschema.permissions["Self"]["1.0_1"].label         // ✓ pure dot notation
schema.permissions["System Manager"]["1.2_3"].label  // ✓
The tradeoff: object form loses ordering and makes iteration slightly less natural, but gains clean lookup. Given you're always accessing by role name, the object form is probably the better fit here.
