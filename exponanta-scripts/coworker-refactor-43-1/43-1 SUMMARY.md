# CW Channels — BlockNote Image Upload Integration

## What was built

Replaced the plain markdown textarea editor in `threads.js` with a full WYSIWYG BlockNote editor with native image upload support, wired into the CW/PocketBase stack.

---

## Files changed

| File | Change |
|------|--------|
| `threads.js` | BlockNote components added, MarkdownEditor replaced |
| `threads.html` | Added `editor.css` link |
| `editor.jsx` | New source — BlockNote editor component |
| `editor.js` | Prebuilt bundle (output of `node editor-src/build.mjs`) |
| `editor.css` | Prebuilt styles (output of build) |
| `pb-adapter-pocketbase.js` | Config from CW._config, file upload support, pbResult fix |
| `CW-config.js` | Add `pb_url` and `collection` as top-level keys |

---

## Architecture decisions

### Editor as a separate prebuilt module

BlockNote requires a build step (JSX, npm packages). The rest of the CW stack is no-build (React 18 UMD, CDN). Solution: build `editor.jsx` once with esbuild into a self-contained `editor.js` ES module. `threads.js` lazy-loads it only when the post editor opens — readers never download it.

```
editor.jsx  →  node editor-src/build.mjs  →  editor.js (2MB, commit this)
```

### Image upload via CW.run — not raw fetch

Early versions used raw `fetch()` to PATCH PocketBase directly from inside the editor bundle. This broke because:
- `pbUrl` was not available inside the bundle scope
- Bypassed CW auth and adapter logic

Final approach: `uploadViaCW()` calls `globalThis.CW.run()` which is available at runtime in the same browser context. CW handles auth, URL, and the adapter handles FormData conversion.

```
BlockNote drop image
  → uploadViaCW(file, recordId)
  → CW.run({ operation:'update', input:{ 'files+': file } })
  → pb-adapter _splitRecord routes 'files+' to top level
  → PocketBase SDK sees File object → converts to FormData
  → PATCH /api/collections/item/records/{id}
  → PocketBase stores file, returns updated record with files[]
  → last filename in files[] used to construct URL
  → BlockNote renders <img src="...">
```

### Single source of truth for config

Removed the private `const config = { url, collection }` from `pb-adapter-pocketbase.js`. All config now lives in `CW._config` (loaded from `config.json`). Each adapter function reads at call time:

```js
const { pb_url, collection } = globalThis.CW._config
```

---

## Key fixes along the way

### `_splitRecord` — modifier key routing

PocketBase uses modifier keys (`files+`, `files-`, `+files`) to append/remove files without replacing the whole array. These must go to the top-level payload, not inside `data` JSON.

```js
// regex catches files+, files-, +files, avatar+, etc.
/^[\w]+[+-]$|^[+-][\w]+$/.test(k)
```

Added `"files"` to `PB_TOP` set so the files array is always treated as a top-level field.

### `update` returns `_mergeRecord(pbResult)` not stale rec

Original adapter assembled the return value from the pre-PATCH record:
```js
return Object.assign({}, recTop, mergedData, top)  // ← stale, files[] empty
```

After PATCH, PocketBase returns the updated record including the new filename in `files[]`. Fix: use the PB response:
```js
const pbResult = await pb.collection(collection).update(rec.id, payload)
return _mergeRecord(pbResult)  // ← fresh, files[] has new filename
```

### `ensureDraft` — stale closure fix

Image upload fires from inside the BlockNote editor which captures the React closure at mount time. By the time a user drops an image, the `postName` state variable is stale (still `null`).

Fix: `postNameRef` mirrors `postName` state. `onBeforeUpload` reads `postNameRef.current` (always current) not the stale `postName` closure.

```js
const postNameRef = React.useRef(null)

const ensureDraft = async () => {
  if (postNameRef.current) return
  const r = await CW.run({ operation:'create', ... })
  postNameRef.current = r.target.data[0].name  // ref updated immediately
  setPostName(r.target.data[0].name)           // state updated for re-render
}

onBeforeUpload: async () => {
  await ensureDraft()
  return postNameRef.current  // always current
}
```

### `onBlur` arrow function

`onBlur: ensureDraft` passes the browser Event object as the first argument to `ensureDraft`. Calling `.trim()` on an Event throws. Fix:

```js
onBlur: () => ensureDraft()  // arrow fn — no args passed
```

---

## Deployment checklist

1. Add to `CW-config.js`:
```js
globalThis.CW._config = {
  pb_url: "http://143.198.29.88:8090",
  collection: "item",
  // ... rest unchanged
}
```

2. Add `files` field to PocketBase `item` collection:
   - Type: File
   - Max files: 10
   - Max size: 5MB
   - Mime types: image/jpeg, image/png, image/gif, image/webp

3. Deploy files:
   - `pb-adapter-pocketbase.js`
   - `threads.js`
   - `threads.html`
   - `editor.js` (prebuilt)
   - `editor.css` (prebuilt)

4. To rebuild editor after source changes:
```bash
node editor-src/build.mjs
```

---

## What was NOT changed

- `CW-state.js` — unchanged
- `CW-run.js` — unchanged
- `CW-config.js` — only add `pb_url` and `collection` keys
- `auth.js` — unchanged
- `index.js` — unchanged
- `channels-schemas.json` — unchanged
- Comment input — still plain textarea (no image upload needed)
