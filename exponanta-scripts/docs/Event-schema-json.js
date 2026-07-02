


//initial
{
  "name": "Event",
  "schema_name": "Event",
  "doctype": "Schema",
  "is_submittable": 1,
  "is_public": 1,
  "title_field": "title",
  "autoname": "generateId",
  "view_components": {
    "list": {
      "component": "UniversalGrid",
      "container": "right_pane"
    },
    "form": {
      "component": "MainForm",
      "container": "right_pane"
    }
  },
  "fields": [
    {
      "fieldname": "name",
      "fieldtype": "Data",
      "label": "Name",
      "in_list_view": 1,
      "read_only": 1,
      "hidden": 0
    },
    {
      "fieldname": "section_identity",
      "fieldtype": "Section Break",
      "label": "Event"
    },
    {
      "fieldname": "title",
      "fieldtype": "Data",
      "label": "Title",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "relationship_parent",
      "fieldtype": "Table",
      "in_list_view": 0,
      "label": "Event Relationships",
      "options": "Relationship",
      "search_index": 1
    },
    {
      "fieldname": "deck",
      "fieldtype": "Text",
      "label": "Tagline"
    },
    {
      "fieldname": "kicker",
      "fieldtype": "Data",
      "label": "Kicker"
    },
    {
      "fieldname": "featured",
      "fieldtype": "Check",
      "label": "Featured"
    },
    {
      "fieldname": "lang",
      "fieldtype": "Select",
      "label": "Language",
      "options": "en\nru\nes"
    },
    {
      "fieldname": "section_classify",
      "fieldtype": "Section Break",
      "label": "Classification"
    },
    {
      "fieldname": "category",
      "fieldtype": "Data",
      "label": "Category"
    },
    {
      "fieldname": "content_category",
      "fieldtype": "Data",
      "label": "Content Category"
    },
    {
      "fieldname": "audience",
      "fieldtype": "Data",
      "label": "Primary Audience"
    },
    {
      "fieldname": "tags",
      "fieldtype": "Data",
      "label": "Tags"
    },
    {
      "fieldname": "section_logistics",
      "fieldtype": "Section Break",
      "label": "Logistics"
    },
    {
      "fieldname": "event_slot",
      "fieldtype": "Data",
      "label": "Date/Time Slot",
      "component": "./slot-picker.js",
      "display": "SlotBadge",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "event_start",
      "fieldtype": "Datetime",
      "label": "Event Start",
      "reqd": 1,
      "in_list_view": 1,
      "read_only": 1,
      "description": "Derived from event_slot. Used for filtering past vs future events."
    },
    {
      "fieldname": "event_end",
      "fieldtype": "Datetime",
      "label": "Event End",
      "reqd": 0,
      "read_only": 1,
      "description": "Derived from event_slot. Used for detecting in-progress events."
    },
    {
      "fieldname": "availability_rule",
      "fieldtype": "Link",
      "label": "Availability Rule",
      "options": "AvailabilityRule",
      "reqd": 0
    },
    {
      "fieldname": "format",
      "fieldtype": "Select",
      "label": "Format",
      "options": "in-person\nonline\nhybrid"
    },
    {
      "fieldname": "docsubtype",
      "fieldtype": "Select",
      "label": "Type",
      "options": "conference\nmeetup\nworkshop\nwebinar\n1-1\nother",
      "reqd": 0,
      "in_list_view": 1
    },
    {
      "fieldname": "location",
      "fieldtype": "Data",
      "label": "Location"
    },
    {
      "fieldname": "city",
      "fieldtype": "Data",
      "label": "City"
    },
    {
      "fieldname": "region",
      "fieldtype": "Data",
      "label": "Region"
    },
    {
      "fieldname": "country",
      "fieldtype": "Data",
      "label": "Country"
    },
    {
      "fieldname": "virtual_url",
      "fieldtype": "Data",
      "label": "Virtual URL"
    },
    {
      "fieldname": "price",
      "fieldtype": "Currency",
      "label": "Price"
    },
    {
      "fieldname": "currency",
      "fieldtype": "Data",
      "label": "Currency"
    },
    {
      "fieldname": "capacity",
      "fieldtype": "Int",
      "label": "Capacity"
    },
    {
      "fieldname": "section_settings",
      "fieldtype": "Section Break",
      "label": "Settings"
    },
    {
      "fieldname": "allow_guest_booking",
      "fieldtype": "Check",
      "label": "Allow Guest Booking"
    },
    {
      "fieldname": "guest_verification",
      "fieldtype": "Select",
      "label": "Guest Verification",
      "options": "none\nemail\napproval"
    },
    {
      "fieldname": "section_content",
      "fieldtype": "Section Break",
      "label": "Content"
    },
    {
      "fieldname": "body",
      "fieldtype": "Text",
      "label": "Description"
    },
    {
      "fieldname": "highlights",
      "fieldtype": "Code",
      "label": "Highlights",
      "options": "JSON"
    },
    {
      "fieldname": "photos",
      "fieldtype": "Code",
      "label": "Photos",
      "options": "JSON"
    },
    {
      "fieldname": "section_web",
      "fieldtype": "Section Break",
      "label": "Web Page"
    },
    {
      "fieldname": "webpage",
      "fieldtype": "Table",
      "options": "WebPage",
      "label": "Web Page"
    },
    {
      "fieldname": "section_people",
      "fieldtype": "Section Break",
      "label": "People & Organizations"
    },
    {
      "fieldname": "relationships",
      "fieldtype": "Relationship Panel",
      "label": "Relationships"
    }
  ],
  "permissions": [
    {
      "role": "Event Manager",
      "read": 1,
      "write": 1,
      "create": 1,
      "delete": 1
    }
  ],
  "relationship_roles": {
    "User": {
      "Organizer":       { "transitions": ["0_1", "0_2", "1_2", "2_0"] },
      "Attendee":        { "transitions": ["0_1", "0_2", "1_2"] },
      "Speaker":         { "transitions": ["0_2", "1_2"] },
      "Volunteer":       { "transitions": ["0_2", "1_2"] },
      "Sponsor Contact": { "transitions": ["0_2", "1_2"] }
    }
  },
  "_state": {
    "0": {
      "values": [0, 1, 2],
      "options": ["Draft", "Published", "Archived"],
      "transitions": {
        "0": [1, 2],
        "1": [2],
        "2": [0]
      },
      "labels": {
        "0_1": "Publish",
        "0_2": "Archive",
        "1_2": "Archive",
        "2_0": "Restore"
      },
      "views": {
        "0": "edit",
        "1": "read",
        "2": "read"
      },
      "requires": {
        "0_1": {
          "is_submittable": 1
        }
      },
      "sideEffects": {},
      "rules": {},
      "primary": {
        "0_1": true
      }
    }
  },
  "field_order": ["name"]
},