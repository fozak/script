/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {

  const collection = app.findCollectionByNameOrId("item")

  const roles = [
    { id: "rolesystemmanag", role_name: "System Manager" },
    { id: "roleispublixxxx", role_name: "Public"         },
    { id: "roleeventattten", role_name: "Event Attendee" },
    { id: "roleeventmanagx", role_name: "Event Manager"  },
  ]

  for (const r of roles) {
    // skip if already exists
    try {
      app.findRecordById(collection, r.id)
      console.log("skip existing role:", r.id)
      continue
    } catch (_) {}

    const record = new Record(collection)
    record.set("id",            r.id)
    record.set("name",          r.id)
    record.set("doctype",       "Role")
    record.set("docstatus",     0)
    record.set("owner",         "")
    record.set("_allowed",      [])
    record.set("_allowed_read", ["roleispublixxxx"])
    record.set("data",          { role_name: r.role_name })
    app.save(record)
    console.log("seeded role:", r.id)
  }

}, (app) => {
  // down — remove seeded roles
  const collection = app.findCollectionByNameOrId("item")
  const ids = [
    "rolesystemmanag",
    "roleispublixxxx",
    "roleeventattten",
    "roleeventmanagx",
  ]
  for (const id of ids) {
    try {
      const record = app.findRecordById(collection, id)
      app.delete(record)
    } catch (_) {}
  }
})
