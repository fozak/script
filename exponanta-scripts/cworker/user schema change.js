//prev


{
    "schema_name": "User",
    "autoname": "field:email",
    "title_field": "full_name",
    "track_changes": 0,
    "fields": [
        {
            "fieldname": "email",
            "fieldtype": "Data",
            "read_only": 0,
            "reqd": 1,
            "in_list_view": 1,
            "in_local_view": 1
        },
        {
            "fieldname": "first_name",
            "fieldtype": "Data",
            "reqd": 0,
            "in_list_view": 1
        },
        {
            "fieldname": "full_name",
            "fieldtype": "Data",
            "in_list_view": 1,
            "in_local_view": 1,
            "read_only": 0
        },
        {
            "fieldname": "user_image",
            "fieldtype": "Data",
            "in_local_view": 1
        },
        {
            "fieldname": "password",
            "fieldtype": "Password"
        },
        {
            "fieldname": "providers",
            "fieldtype": "Code",
            "read_only": 1,
            "options": "JSON",
            "hidden": 0
        },
        {
            "fieldname": "role",
            "fieldtype": "Data",
            "in_local_view": 1,
            "read_only": 1,
            "hidden": 0
        },
        {
            "fieldtype": "Data",
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "fieldname": "doctype"
        },
        {
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "fieldtype": "Data",
            "fieldname": "slug"
        },
        {
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "fieldtype": "Data",
            "fieldname": "title"
        },
        {
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "fieldtype": "Data",
            "fieldname": "name"
        },
        {
            "fieldtype": "Data",
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_local_view": 1,
            "fieldname": "id"
        },
        {
            "fetch": true,
            "in_list_view": 1,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "State",
            "fieldname": "_state"
        },
        {
            "fieldtype": "Int",
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "read_only": 1,
            "fieldname": "docstatus"
        },
        {
            "fetch": true,
            "hidden": 1,
            "read_only": 1,
            "fieldtype": "Datetime",
            "label": "Created",
            "in_list_view": 1,
            "fieldname": "created"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "Owner",
            "in_list_view": 0,
            "in_local_view": 1,
            "fieldname": "owner"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Datetime",
            "label": "Modified",
            "in_list_view": 0,
            "fieldname": "modified"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "Modified By",
            "in_list_view": 0,
            "fieldname": "modified_by"
        },
        {
            "fieldtype": "Data",
            "fetch": true,
            "hidden": 0,
            "fieldname": "top_parent"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent",
            "fieldname": "parent"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent Type",
            "fieldname": "parenttype"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent Field",
            "fieldname": "parentfield"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Int",
            "in_list_view": 1,
            "label": "Index",
            "fieldname": "idx"
        },
        {
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "fieldtype": "SharePanel",
            "label": "Sharing",
            "in_list_view": 0,
            "in_local_view": 1,
            "fieldname": "_allowed"
        },
        {
            "fieldtype": "Code",
            "options": "JSON",
            "read_only": 0,
            "fetch": true,
            "hidden": 0,
            "in_local_view": 1,
            "fieldname": "_allowed_read"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 0,
            "fieldtype": "Filepicker",
            "label": "Attachments",
            "in_list_view": 1,
            "fieldname": "files"
        },
        {
            "fieldtype": "Code",
            "options": "JSON",
            "fetch": true,
            "in_list_view": 1,
            "hidden": 0,
            "read_only": 1,
            "fieldname": "_changes"
        },
        {
            "fieldname": "domain",
            "in_local_view": 1
        },
        {
            "fieldname": "password_hash",
            "fieldtype": "Data",
            "hidden": 0,
            "read_only": 1
        }
    ],
    "_state": {
        "status": {
            "name": "status",
            "default": "Active",
            "values": [
                "Invited",
                "Active",
                "Locked",
                "Reset Pending",
                "Disabled"
            ],
            "transitions": {
                "Invited": [
                    "Active",
                    "Disabled"
                ],
                "Active": [
                    "Locked",
                    "Reset Pending",
                    "Disabled"
                ],
                "Locked": [
                    "Active",
                    "Disabled"
                ],
                "Reset Pending": [
                    "Active",
                    "Disabled"
                ],
                "Disabled": [
                    "Invited"
                ]
            },
            "labels": {
                "Invited.Active": "Activate",
                "Invited.Disabled": "Cancel Invitation",
                "Active.Locked": "Lock Account",
                "Active.Reset Pending": "Require Password Reset",
                "Active.Disabled": "Disable User",
                "Locked.Active": "Unlock Account",
                "Reset Pending.Active": "Complete Reset",
                "Disabled.Invited": "Re-invite"
            },
            "sideEffects": {},
            "rules": {}
        },
        "email_status": {
            "name": "email_status",
            "default": "Unverified",
            "values": [
                "Unverified",
                "Pending",
                "Verified"
            ],
            "transitions": {
                "Unverified": [
                    "Pending"
                ],
                "Pending": [
                    "Verified"
                ]
            },
            "labels": {
                "Unverified.Pending": "Send Verification Email",
                "Pending.Verified": "Verify Email"
            },
            "sideEffects": {},
            "rules": {}
        },
        "docstatus": {
            "name": "docstatus",
            "default": "Draft",
            "values": [
                "Draft",
                "Submitted",
                "Cancelled"
            ],
            "transitions": {
                "Draft": [
                    "Submitted",
                    "Cancelled"
                ],
                "Submitted": [
                    "Cancelled"
                ],
                "Cancelled": []
            },
            "labels": {
                "Draft.Submitted": "Submit",
                "Draft.Cancelled": "Delete",
                "Submitted.Cancelled": "Cancel"
            }
        }
    },
    "permissions": [
        {
            "role": "rolesystemmanag",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "transitions": {
                "status.Invited.Active": "Activate",
                "status.Active.Locked": "Lock Account",
                "status.Active.Disabled": "Disable User",
                "status.Locked.Active": "Unlock Account",
                "email_status.Unverified.Pending": "Send Verification Email",
                "email_status.Pending.Verified": "Verify Email"
            }
        },
        {
            "role": "roleusermanagxx",
            "read": 1,
            "write": 1,
            "transitions": {}
        }
    ]
}

//new 

{
    "schema_name": "User",
    "autoname": "field:email",
    "title_field": "full_name",
    "track_changes": 0,
    "fields": [
        {
            "fieldname": "email",
            "fieldtype": "Data",
            "read_only": 0,
            "reqd": 1,
            "in_list_view": 1,
            "in_local_view": 1
        },
        {
            "fieldname": "first_name",
            "fieldtype": "Data",
            "reqd": 0,
            "in_list_view": 1
        },
        {
            "fieldname": "full_name",
            "fieldtype": "Data",
            "in_list_view": 1,
            "in_local_view": 1,
            "read_only": 0
        },
        {
            "fieldname": "user_image",
            "fieldtype": "Data",
            "in_local_view": 1
        },
        {
            "fieldname": "password",
            "fieldtype": "Password"
        },
        {
            "fieldname": "providers",
            "fieldtype": "Code",
            "read_only": 1,
            "options": "JSON",
            "hidden": 0
        },
        {
            "fieldname": "role",
            "fieldtype": "Data",
            "in_local_view": 1,
            "read_only": 1,
            "hidden": 0
        },
        {
            "fieldtype": "Data",
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "fieldname": "doctype"
        },
        {
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "fieldtype": "Data",
            "fieldname": "slug"
        },
        {
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "fieldtype": "Data",
            "fieldname": "title"
        },
        {
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "fieldtype": "Data",
            "fieldname": "name"
        },
        {
            "fieldtype": "Data",
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "in_local_view": 1,
            "fieldname": "id"
        },
        {
            "fetch": true,
            "in_list_view": 1,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "State",
            "fieldname": "_state"
        },
        {
            "fieldtype": "Int",
            "fetch": true,
            "hidden": 0,
            "in_list_view": 1,
            "in_local_view": 1,
            "read_only": 1,
            "fieldname": "docstatus"
        },
        {
            "fetch": true,
            "hidden": 1,
            "read_only": 1,
            "fieldtype": "Datetime",
            "label": "Created",
            "in_list_view": 1,
            "fieldname": "created"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "Owner",
            "in_list_view": 0,
            "in_local_view": 1,
            "fieldname": "owner"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Datetime",
            "label": "Modified",
            "in_list_view": 0,
            "fieldname": "modified"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 1,
            "fieldtype": "Data",
            "label": "Modified By",
            "in_list_view": 0,
            "fieldname": "modified_by"
        },
        {
            "fieldtype": "Data",
            "fetch": true,
            "hidden": 0,
            "fieldname": "top_parent"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent",
            "fieldname": "parent"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent Type",
            "fieldname": "parenttype"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Data",
            "in_list_view": 1,
            "label": "Parent Field",
            "fieldname": "parentfield"
        },
        {
            "fetch": true,
            "hidden": 0,
            "fieldtype": "Int",
            "in_list_view": 1,
            "label": "Index",
            "fieldname": "idx"
        },
        {
            "read_only": 1,
            "fetch": true,
            "hidden": 0,
            "fieldtype": "SharePanel",
            "label": "Sharing",
            "in_list_view": 0,
            "in_local_view": 1,
            "fieldname": "_allowed"
        },
        {
            "fieldtype": "Code",
            "options": "JSON",
            "read_only": 0,
            "fetch": true,
            "hidden": 0,
            "in_local_view": 1,
            "fieldname": "_allowed_read"
        },
        {
            "fetch": true,
            "hidden": 0,
            "read_only": 0,
            "fieldtype": "Filepicker",
            "label": "Attachments",
            "in_list_view": 1,
            "fieldname": "files"
        },
        {
            "fieldtype": "Code",
            "options": "JSON",
            "fetch": true,
            "in_list_view": 1,
            "hidden": 0,
            "read_only": 1,
            "fieldname": "_changes"
        },
        {
            "fieldname": "domain",
            "in_local_view": 1
        },
        {
            "fieldname": "password_hash",
            "fieldtype": "Data",
            "hidden": 0,
            "read_only": 1
        }
    ],
    "_state": {
        "status": 
  default: "Unverified",
  labels: {
    "Unverified.Active": "Activate",
    "Active.Locked":     "Lock Account",
    "Locked.Active":     "Unlock Account",
    "Active.Disabled":   "Disable User",
  },
  "Unverified.Active": async (run_doc) => { /* guard */ },
},
       
    },
    "permissions": [
        {
            "role": "rolesystemmanag",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
            "transitions": {
                "status.Unverified.Active": "Activate",
                "status.Active.Locked": "Lock Account",
                "status.Active.Disabled": "Disable User",
                "status.Locked.Active": "Unlock Account"
            }
        },
        {
            "role": "roleusermanagxx",
            "read": 1,
            "write": 1,
            "transitions": {}
        }
    ]
}