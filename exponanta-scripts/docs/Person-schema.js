{
  "name": "Person",
  "schema_name": "Person",
  "doctype": "Schema",
  "module": "Core",
  "title_field": "full_name",
  "autoname": "generateId",
  "is_submittable": 1,
  "track_changes": 1,
  "sort_field": "full_name",
  "sort_order": "ASC",
  "fields": [

    { "fieldname": "slug",           "fieldtype": "Data",       "label": "Slug",          "reqd": 1 },
    { "fieldname": "full_name",      "fieldtype": "Data",       "label": "Full Name",      "in_list_view": 1 },
    { "fieldname": "first_name",     "fieldtype": "Data",       "label": "First Name" },
    { "fieldname": "last_name",      "fieldtype": "Data",       "label": "Last Name" },
    { "fieldname": "headline",       "fieldtype": "Data",       "label": "Headline",      "in_list_view": 1 },
    { "fieldname": "kicker",         "fieldtype": "Data",       "label": "Kicker" },
    { "fieldname": "deck",           "fieldtype": "Small Text", "label": "Deck" },
    { "fieldname": "bio",            "fieldtype": "Small Text", "label": "Bio" },
    { "fieldname": "about",          "fieldtype": "Long Text",  "label": "About" },

    { "fieldname": "role",           "fieldtype": "Data",       "label": "Role",          "in_list_view": 1 },
    { "fieldname": "company",        "fieldtype": "Link",       "label": "Company",       "options": "Company", "in_list_view": 1 },
    { "fieldname": "seniority",      "fieldtype": "Select",     "label": "Seniority",     "options": "c-suite\nvp\ndirector\nmanager\nindividual" },

    { "fieldname": "city",           "fieldtype": "Data",       "label": "City" },
    { "fieldname": "region",         "fieldtype": "Data",       "label": "Region" },
    { "fieldname": "country",        "fieldtype": "Data",       "label": "Country" },

    { "fieldname": "linkedin",       "fieldtype": "Data",       "label": "LinkedIn URL" },
    { "fieldname": "twitter",        "fieldtype": "Data",       "label": "Twitter" },
    { "fieldname": "website",        "fieldtype": "Data",       "label": "Website" },
    { "fieldname": "email",          "fieldtype": "Data",       "label": "Email" },
    { "fieldname": "user",           "fieldtype": "Link",       "label": "User",          "options": "User" },

    { "fieldname": "availability",   "fieldtype": "Select",     "label": "Availability",  "options": "open\nselective\nclosed" },
    { "fieldname": "meeting_format", "fieldtype": "JSON",       "label": "Meeting Format" },
    { "fieldname": "speaking",       "fieldtype": "Check",      "label": "Speaking" },
    { "fieldname": "mentoring",      "fieldtype": "Check",      "label": "Mentoring" },
    { "fieldname": "office_hours",   "fieldtype": "Check",      "label": "Office Hours" },

    { "fieldname": "industry",       "fieldtype": "JSON",       "label": "Industry" },
    { "fieldname": "tags",           "fieldtype": "JSON",       "label": "Tags" },
    { "fieldname": "audience",       "fieldtype": "Data",       "label": "Audience" },
    { "fieldname": "audience_secondary", "fieldtype": "JSON",   "label": "Audience Secondary" },

    { "fieldname": "featured",       "fieldtype": "Check",      "label": "Featured" },
    { "fieldname": "verified",       "fieldtype": "Check",      "label": "Verified" },
    { "fieldname": "lang",           "fieldtype": "Data",       "label": "Language",      "default": "en" },
    { "fieldname": "noindex",        "fieldtype": "Check",      "label": "No Index" },
    { "fieldname": "sort_order",     "fieldtype": "Int",        "label": "Sort Order" },
    { "fieldname": "expires",        "fieldtype": "Datetime",   "label": "Expires" },

    { "fieldname": "meta_title",     "fieldtype": "Data",       "label": "Meta Title" },
    { "fieldname": "meta_description","fieldtype": "Small Text","label": "Meta Description" }
  ]
}