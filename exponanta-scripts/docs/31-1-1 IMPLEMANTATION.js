


now look into my existing run and tell what pieces need to be changed. 1. now I have added new fieldtype in doctype. it is structured like  {

      "fieldname": "functions",

      "fieldtype": "Code",

      "options": "JSON",

      "label": "Adapter Functions",

      "description": "Callable adapter functions or operation mappings"

    }, as in frappe.   I have added doctype: Adapter, we added also is_default 0 or 1 . the operation name should exactly ma