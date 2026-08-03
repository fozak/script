/**
 * CW BlockNote Editor
 * 
 * Exposes:
 *   window.CWEditor.mount({ run_doc, fieldname, onChange })
 *   window.CWEditor.mountRenderer({ run_doc, fieldname })
 *   window.CWEditor.unmount(run_doc, fieldname)
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

// ─── Upload via run_doc.child() ───────────────────────────────────────────────

async function uploadViaCW(file, run_doc) {
  const r = await run_doc.child({
    operation:      'update',
    target_doctype: run_doc.target_doctype,
    query:          { where: { name: run_doc.target?.data?.[0]?.name } },
    input:          { 'files+': file },
    options:        { render: false },
  })
  if (!r.success) throw new Error('[CWEditor] Upload failed: ' + (r.error || 'unknown'))
  const files    = r.target?.data?.[0]?.files || []
  const filename = files[files.length - 1]
  if (!filename) throw new Error('[CWEditor] No filename in response')
  return `${globalThis.CW._config?.pb_url}/api/files/item/${run_doc.target?.data?.[0]?.name}/${filename}`
}

// ─── Parse content safely ─────────────────────────────────────────────────────

function parseBlocks(raw) {
  if (!raw) return undefined
  if (typeof raw === 'string' && !raw.trim()) return undefined
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw.trim()) : raw
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined
  } catch { return undefined }
}

// ─── Root registry ────────────────────────────────────────────────────────────

const _roots = new Map()  // containerId → ReactDOM root

// ─── Editor component ─────────────────────────────────────────────────────────

function CWBlockNoteEditor({ run_doc, fieldname, onChange }) {
  const editor = useCreateBlockNote({
    initialContent: parseBlocks(run_doc.target?.data?.[0]?.[fieldname]),
    uploadFile: async (file) => {
      if (!run_doc.target?.data?.[0]?.name) {
        console.warn('[CWEditor] No record name — skipping upload')
        return URL.createObjectURL(file)
      }
      return uploadViaCW(file, run_doc)
    },
  })

  React.useEffect(() => {
    if (!onChange) return
    return editor.onChange(() => onChange(JSON.stringify(editor.document)))
  }, [editor, onChange])

  return <BlockNoteView editor={editor} theme="light" />
}

// ─── Renderer component ───────────────────────────────────────────────────────

function CWBlockNoteRenderer({ run_doc, fieldname }) {
  const editor = useCreateBlockNote({
    initialContent: parseBlocks(run_doc.target?.data?.[0]?.[fieldname]),
  })
  return <BlockNoteView editor={editor} editable={false} theme="light" />
}

// ─── Public API ───────────────────────────────────────────────────────────────

function mount({ run_doc, fieldname, onChange }) {
  const containerId = `${run_doc.name}-${fieldname}`
  const container   = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) {
    const old = _roots.get(containerId)
    _roots.delete(containerId)
    setTimeout(() => { try { old.unmount() } catch(_) {} }, 0)
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteEditor run_doc={run_doc} fieldname={fieldname} onChange={onChange} />
    </React.StrictMode>
  )
}

function mountRenderer({ run_doc, fieldname }) {
  const containerId = `${run_doc.name}-${fieldname}`
  const container   = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) {
    const old = _roots.get(containerId)
    _roots.delete(containerId)
    setTimeout(() => { try { old.unmount() } catch(_) {} }, 0)
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteRenderer run_doc={run_doc} fieldname={fieldname} />
    </React.StrictMode>
  )
}

function unmount(run_doc, fieldname) {
  const containerId = `${run_doc.name}-${fieldname}`
  if (_roots.has(containerId)) {
    try { _roots.get(containerId).unmount() } catch(_) {}
    _roots.delete(containerId)
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { mount, mountRenderer, unmount }

if (typeof window !== 'undefined') {
  window.CWEditor = { mount, mountRenderer, unmount }
}