# CW Framework — Implemented Features

Status as of April 15, 2026. Tracks what is built and verified, separate from coding rules.

---

## Core Framework

| Component | Status |
|---|---|
| `CW-run.js` — run factory, controller, FSM, preflight, handlers | Done |
| `CW-config.js` — adapters, operations, views, systemFields, runParams, calendar config | Done |
| `CW-utils.js` — generateId, evaluateDependsOn | Done |
| `CW-state.js` — CW object initialization | Done |
| `CW-url.js` — cwStateFromUrl / cwStateToUrl | Done, tested 25/25 |
| `pb-adapter-pocketbase.js` — select/create/update/delete + full PB query params | Done, tested 20/20 |
| `auth.js` — provisionUser, authLogin, authRegister, authLogout, authRefresh, authRestore, authGuard | Done |
| `index.js` — bootstrap, schema compile, adapter init, authRestore | Done |

---

## UI Components

| Component | Status |
|---|---|
| `CW-ui.js` — MainGrid, MainForm, FieldRenderer, CWComponent, BlockNoteField | Done |
| MainForm auto-switch to `update` for non-`explicit_edit_intent` doctypes | Done (Apr 15) |
| FieldRenderer — Data, Text, Int, Float, Currency, Check, Select, Date, Datetime, Link, Table, Code, Password, Relationship Panel | Done |
| `fieldtype: Component` (CWComponent) — lazy import, error guard, mount/unmount | Done (Apr 15) |
| `fieldtype: BlockNote` — editor.js integration | Done |
| Navigation — back/forward, breadcrumbs, navigateTo | Done |
| `app-ui.js` — NavBar, Toast | Done |
| RelationshipPanel | Done |

---

## URL-Driven Navigation

| Item | Status |
|---|---|
| `cwStateFromUrl` — URL → CW.run boot, child if boot exists | Done |
| `cwStateToUrl` — run_doc → URL (boot runs only) | Done |
| `CW._config.runParams` — single source of truth for URL param mapping | Done |
| pb-adapter query params — filter, fields, expand, perPage, page, batch, skipTotal | Done |
| `empty.html` with `cwStateFromUrl` boot | Done |
| Browser IIEE tests for URL params against live PB | Done 16/16 |

---

## Scheduling Feature

| Item | Status |
|---|---|
| `AvailabilityRule` schema — schedule JSON, duration, buffer, timezone | Done |
| `AvailabilityOverride` schema — date, available, start_time, end_time | Done |
| `Event` schema — merged with existing, event_slot as Data field | Done |
| `slot-picker.js` — generateSlots, MonthCalendar, TimeSlotList, mount/unmount | Done, tested 18/18 offline |
| generateSlots — timezone UTC conversion, override handling, taken slot exclusion, 60-day window | Done |
| normalizeOffset fix for Intl timezone offset formatting | Done |
| Seed data — availabilie5xcc rule (Mon-Fri 09-17 ET, 30min + 10min buffer), 2 overrides | Live in PB |
| slot-picker.js wired to live data via CWComponent | Pending — entry point decision |
| schedule-editor.js — weekly schedule UI for host | Not started |
| provisionGuest — email-only registration for booking flow | Not started |
| Event creation from slot selection | Not started |

---

## Schemas in db.json

| Schema | Status |
|---|---|
| Task | Done — primary test doctype |
| Event | Done — merged logistics + scheduling fields |
| AvailabilityRule | Done — schedule field as Data (Component pending schedule-editor.js) |
| AvailabilityOverride | Done |
| Post / Channel | Done — channels/threads feature |
| WebPage | Done — with sideEffects for multi-domain publish |
| User / UserPublicProfile | Done |
| Relationship | Done — FSM 0→1→2, Relationship Panel |
| SystemSchema | Done — FSM, action_labels, sideEffects |

---

## Pending Architectural Decisions

| Decision | Notes |
|---|---|
| `top_parent` for same-doctype hierarchy | `is_hierarchical` flag proposed but NOT implemented. Current behavior: `top_parent` fires when parent run target is same doctype — causes new root Events to get wrong `top_parent`. Fix pending business decision. |
| slot-picker.js entry point | Picker needs AvailabilityRule record as `run_doc.target.data[0]`. Booking flow entry point not yet defined. |
| schedule-editor.js | Component fieldtype on `AvailabilityRule.schedule`. Not started. Currently Data field. |
| provisionGuest flow | Email-only registration designed but not coded. derivePassword helper needed. |

---

## Known Issues

| Issue | Status |
|---|---|
| New Event gets wrong `top_parent` from grid context | Root cause identified. Fix pending `is_hierarchical` decision. |
| `Event.availability_rule` test record has user ID instead of rule name | Data issue — fix in PB directly |
| `query.take` removed — callers using `take` silently fall to `getFullList` | By design — `take` → `perPage` rename. No production callers yet. |
