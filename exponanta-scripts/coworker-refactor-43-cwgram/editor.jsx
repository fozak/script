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

// ─── Image upload handler ────────────────────────────────────────────────────

async function uploadImageToPocketBase({ file, pbUrl, pbToken, collectionId, recordId }) {
  // PocketBase SDK auto-converts plain objects with File values to FormData
  // But here we're doing a raw fetch for the standalone bundle (no PB SDK dep)
  const formData = new FormData()

  // Append all required flat fields so PB accepts the PATCH
  // files+ modifier appends without replacing existing files
  formData.append('files+', file)

  const res = await fetch(
    `${pbUrl}/api/collections/${collectionId}/records/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: pbToken ? `Bearer ${pbToken}` : '',
      },
      body: formData,
    }
  )

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
  }

  const record = await res.json()

  // PocketBase returns the updated files array
  // The last item is the one we just uploaded
  const files = record.files || []
  const filename = files[files.length - 1]

  if (!filename) throw new Error('No filename returned from PocketBase')

  // Return the full URL — BlockNote injects this as <img src="...">
  return `${pbUrl}/api/files/${collectionId}/${recordId}/${filename}`
}

// ─── Editor component ─────────────────────────────────────────────────────────

function CWBlockNoteEditor({ initialContent, uploadOptions, onChange }) {
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

    // Image upload wired to PocketBase
    uploadFile: async (file) => {
      if (!uploadOptions?.recordId) {
        // No record yet — return object URL as placeholder
        // threads.js must create the Post record first, then remount with recordId
        return URL.createObjectURL(file)
      }
      return uploadImageToPocketBase({ file, ...uploadOptions })
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
  pbUrl,
  pbToken,
  collectionId = 'item',
  recordId,
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

  const uploadOptions = pbUrl && recordId
    ? { pbUrl, pbToken, collectionId, recordId }
    : null

  root.render(
    <React.StrictMode>
      <CWBlockNoteEditor
        initialContent={initialContent}
        uploadOptions={uploadOptions}
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
