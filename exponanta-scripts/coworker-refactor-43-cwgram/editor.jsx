/**
 * CW BlockNote Editor
 * Prebuilt standalone editor for threads.js
 *
 * Exposes:
 *   window.CWEditor.mount(options)   — mount editor into a container
 *   window.CWEditor.unmount(id)      — unmount editor
 *   window.CWEditor.getContent(id)   — get current JSON blocks
 *
 * Usage in threads.js:
 *   const { mount } = await import('./editor.js')
 *   mount({
 *     containerId: 'bn-editor',
 *     initialContent: post.body,   // JSON string or null
 *     pbUrl: 'https://pb.exponanta.com',
 *     pbToken: '...',
 *     collectionId: 'item',
 *     recordId: 'post7sx8v9q1vw7',
 *     onChange: (jsonString) => {},
 *   })
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

// ─── Image upload via CW.run ─────────────────────────────────────────────────
// Uses globalThis.CW — available at runtime since editor.js loads in same browser context
// pb-adapter-pocketbase.js handles 'files+' modifier key via _splitRecord

async function uploadViaCW(file, recordId) {
  const CW = globalThis.CW
  if (!CW) throw new Error('[CWEditor] globalThis.CW not available')

  const r = await CW.run({
    operation: 'update',
    target_doctype: 'Post',
    query: { where: { name: recordId } },
    input: { 'files+': file },
    options: { render: false },
  })

  if (!r.success) throw new Error('[CWEditor] Upload failed: ' + (r.error || 'unknown'))

  // Get the filename PocketBase assigned — last item in files array
  const files = r.target?.data?.[0]?.files || []
  const filename = files[files.length - 1]
  if (!filename) throw new Error('[CWEditor] No filename in response')

  // Construct public URL using CW config
  const pbUrl = CW._config?.pb_url || ''
  return `${pbUrl}/api/files/item/${recordId}/${filename}`
}

// ─── Editor component ─────────────────────────────────────────────────────────

function CWBlockNoteEditor({ initialContent, recordId, onBeforeUpload, onChange }) {
  // Parse initial content — BlockNote expects array of blocks or undefined
  const initialBlocks = React.useMemo(() => {
    if (!initialContent) return undefined
    try {
      const parsed = typeof initialContent === 'string'
        ? JSON.parse(initialContent)
        : initialContent
      return Array.isArray(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }, [initialContent])

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,

    // Image upload via CW.run — adapter handles files+ modifier → FormData
    uploadFile: async (file) => {
      let rid = recordId
      if (!rid && onBeforeUpload) {
        rid = await onBeforeUpload()
      }
      if (!rid) {
        console.warn('[CWEditor] No recordId — skipping upload')
        return URL.createObjectURL(file)
      }
      return uploadViaCW(file, rid)
    },
  })

  // Notify parent on every change
  const handleChange = React.useCallback(() => {
    if (onChange) {
      onChange(JSON.stringify(editor.document))
    }
  }, [editor, onChange])

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="light"
    />
  )
}

// ─── Read-only renderer ───────────────────────────────────────────────────────

function CWBlockNoteRenderer({ content, pbUrl, collectionId, recordId }) {
  const blocks = React.useMemo(() => {
    if (!content) return undefined
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content
      return Array.isArray(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }, [content])

  const editor = useCreateBlockNote({
    initialContent: blocks,
  })

  return (
    <BlockNoteView
      editor={editor}
      editable={false}
      theme="light"
    />
  )
}

// ─── Mount registry ───────────────────────────────────────────────────────────

const _roots = new Map() // containerId → ReactDOM root

function mount({
  containerId,
  initialContent = null,
  recordId,
  onBeforeUpload,
  onChange,
}) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`[CWEditor] No element found with id="${containerId}"`)
    return
  }

  // Unmount any existing root in this container
  if (_roots.has(containerId)) {
    _roots.get(containerId).unmount()
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteEditor
        initialContent={initialContent}
        recordId={recordId}
        onBeforeUpload={onBeforeUpload}
        onChange={onChange}
      />
    </React.StrictMode>
  )
}

function mountRenderer({
  containerId,
  content,
  pbUrl,
  collectionId = 'item',
  recordId,
}) {
  const container = document.getElementById(containerId)
  if (!container) return

  if (_roots.has(containerId)) {
    _roots.get(containerId).unmount()
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)

  root.render(
    <React.StrictMode>
      <CWBlockNoteRenderer
        content={content}
        pbUrl={pbUrl}
        collectionId={collectionId}
        recordId={recordId}
      />
    </React.StrictMode>
  )
}

function unmount(containerId) {
  if (_roots.has(containerId)) {
    _roots.get(containerId).unmount()
    _roots.delete(containerId)
  }
}

function getContent(containerId) {
  // Content is managed via onChange callback
  // This is a convenience accessor — threads.js should track state via onChange
  console.warn('[CWEditor] Use onChange callback to track content, not getContent()')
  return null
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// Named exports for dynamic import in threads.js
export { mount, mountRenderer, unmount, getContent }

// Also expose as global for non-module usage
if (typeof window !== 'undefined') {
  window.CWEditor = { mount, mountRenderer, unmount, getContent }
}
