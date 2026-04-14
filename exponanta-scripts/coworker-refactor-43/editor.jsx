/**
 * CW BlockNote Editor
 * Prebuilt standalone editor for threads.js
 *
 * Exposes:
 *   window.CWEditor.mount(options)       — mount editor into a container
 *   window.CWEditor.mountRenderer(opts)  — mount read-only renderer
 *   window.CWEditor.unmount(id)          — unmount editor or renderer
 *   window.CWEditor.getContent(id)       — get current JSON string from live editor
 *
 * Option C architecture: BlockNote owns its state.
 * Caller reads content via getContent() at save time — no onChange sync needed.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

// ─── Image upload via CW.run ──────────────────────────────────────────────────

async function uploadViaCW(file, recordId) {
  const CW = globalThis.CW
  if (!CW) throw new Error('[CWEditor] globalThis.CW not available')

  const r = await CW.run({
    operation:      'update',
    target_doctype: 'Post',
    query:          { where: { name: recordId } },
    input:          { 'files+': file },
    options:        { render: false },
  })

  if (!r.success) throw new Error('[CWEditor] Upload failed: ' + (r.error || 'unknown'))

  const files    = r.target?.data?.[0]?.files || []
  const filename = files[files.length - 1]
  if (!filename) throw new Error('[CWEditor] No filename in response')

  const pbUrl = globalThis.CW._config?.pb_url || globalThis.pb?.baseURL || ''
  return `${pbUrl}/api/files/item/${recordId}/${filename}`
}

// ─── Parse content safely ─────────────────────────────────────────────────────
// Returns array of blocks (non-empty) or undefined
// undefined → BlockNote starts with blank document (no crash)

function parseBlocks(raw) {
  if (!raw) return undefined
  if (typeof raw === 'string' && !raw.trim()) return undefined
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw.trim()) : raw
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined
  } catch {
    return undefined
  }
}

// ─── Editor instance registry ─────────────────────────────────────────────────
// Stores live editor instances so getContent() can read them at save time

const _roots   = new Map()  // containerId → ReactDOM root
const _editors = new Map()  // containerId → BlockNote editor instance

// ─── Editor component ─────────────────────────────────────────────────────────

function CWBlockNoteEditor({ containerId, initialContent, recordId, onBeforeUpload, onChange }) {
  const editor = useCreateBlockNote({
    initialContent: parseBlocks(initialContent),
    uploadFile: async (file) => {
      let rid = recordId
      if (!rid && onBeforeUpload) rid = await onBeforeUpload()
      if (!rid) {
        console.warn('[CWEditor] No recordId — skipping upload')
        return URL.createObjectURL(file)
      }
      return uploadViaCW(file, rid)
    },
  })

  React.useEffect(() => {
    _editors.set(containerId, editor)
    return () => _editors.delete(containerId)
  }, [containerId, editor])

  // wire onChange via canonical editor.onChange API
  React.useEffect(() => {
    if (!onChange) return
    return editor.onChange(() => {
      onChange(JSON.stringify(editor.document))
    })
  }, [editor, onChange])

  return <BlockNoteView editor={editor} theme="light" />
}

// ─── Read-only renderer ───────────────────────────────────────────────────────

function CWBlockNoteRenderer({ content }) {
  const editor = useCreateBlockNote({
    initialContent: parseBlocks(content),
  })

  return <BlockNoteView editor={editor} editable={false} theme="light" />
}

// ─── Public API ───────────────────────────────────────────────────────────────

function mount({ containerId, initialContent = null, recordId, onBeforeUpload, onChange }) {
  const container = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) {
    const old = _roots.get(containerId)
    _roots.delete(containerId)
    _editors.delete(containerId)
    setTimeout(() => { try { old.unmount() } catch(_) {} }, 0)
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteEditor
        containerId={containerId}
        initialContent={initialContent}
        recordId={recordId}
        onBeforeUpload={onBeforeUpload}
        onChange={onChange}
      />
    </React.StrictMode>
  )
}

function mountRenderer({ containerId, content, collectionId = 'item', recordId }) {
  const container = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) _roots.get(containerId).unmount()

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteRenderer content={content} />
    </React.StrictMode>
  )
}

function unmount(containerId) {
  if (_roots.has(containerId)) {
    try { _roots.get(containerId).unmount() } catch(_) {}
    _roots.delete(containerId)
  }
  _editors.delete(containerId)
}

// Read current content from live editor at save time
// Returns JSON string of current blocks, or null if editor not mounted
function getContent(containerId) {
  const editor = _editors.get(containerId)
  if (!editor) {
    console.warn(`[CWEditor] No editor mounted at "${containerId}"`)
    return null
  }
  return JSON.stringify(editor.document)
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { mount, mountRenderer, unmount, getContent }

if (typeof window !== 'undefined') {
  window.CWEditor = { mount, mountRenderer, unmount, getContent }
}
