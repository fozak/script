/**
 * CW FilePicker
 *
 * Exposes:
 *   mount({ run_doc, fieldname, readOnly })
 *   unmount(run_doc)
 */

import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { useDropzone } from 'react-dropzone'

const MIME_MAP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif',  webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4',  mov: 'video/quicktime', webm: 'video/webm',
  mp3: 'audio/mpeg', wav: 'audio/wav',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip:  'application/zip',
  html: 'text/html', htm: 'text/html',
  txt:  'text/plain',
}

function getMime(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

function displayName(filename) {
  const parts = filename.split('.')
  const ext   = parts.pop()
  const base  = parts.join('.')
  const clean = base.replace(/_[a-z0-9]{8,12}$/, '')
  return `${clean}.${ext}`
}

function fileIcon(mime) {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word'))      return '📝'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
  if (mime === 'text/html')       return '🌐'
  return '📎'
}

function FileItem({ filename, url, onRemove, readOnly }) {
  const mime    = getMime(filename)
  const isImage = mime.startsWith('image/')
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', border:'1px solid #e6e7e9', borderRadius:6, marginBottom:4, background:'#fff' }}>
      {isImage
        ? <img src={url} alt={filename} style={{ width:36, height:36, objectFit:'cover', borderRadius:4, flexShrink:0 }} />
        : <span style={{ fontSize:24, flexShrink:0, lineHeight:1 }}>{fileIcon(mime)}</span>
      }
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#1a6eb5' }}
        title={filename}
      >{displayName(filename)}</a>
      {!readOnly && (
        <button onClick={onRemove}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#d63939', fontSize:18, lineHeight:1, padding:'0 2px', flexShrink:0 }}
          title="Remove"
        >×</button>
      )}
    </div>
  )
}

function CWFilePicker({ run_doc, fieldname, readOnly }) {
  const doc     = run_doc.target?.data?.[0] || {}
  const colName = globalThis.CW?._config?.collection || 'item'
  const pbBase  = globalThis.CW?._config?.pb_url || globalThis.pb?.baseUrl || ''

  const [files,     setFiles]     = useState(Array.isArray(doc[fieldname]) ? doc[fieldname] : [])
  const [uploading, setUploading] = useState(false)

  const fileUrl = (filename) => `${pbBase}/api/files/${colName}/${doc.id || doc.name}/${filename}`

  // CHANGE 1: use result directly from each update, no separate refetch
  const doUpload = async (acceptedFiles) => {
    if (!doc.name) { console.warn('[FilePicker] no record name'); return }
    setUploading(true)
    try {
      for (const file of acceptedFiles) {
        const result = await run_doc.child({
          operation:      'update',
          target_doctype: run_doc.target_doctype,
          query:          { where: { name: doc.name } },
          input:          { 'files+': file },
          options:        { internal: true, render: false },
        })
        const fresh = result?.target?.data?.[0]?.[fieldname]
        if (fresh) setFiles(fresh)
      }
    } finally {
      setUploading(false)
    }
  }

  // CHANGE 2: use result from update, fallback to optimistic filter
  const doRemove = async (filename) => {
    if (!doc.name) return
    setUploading(true)
    try {
      const result = await run_doc.child({
        operation:      'update',
        target_doctype: run_doc.target_doctype,
        query:          { where: { name: doc.name } },
        input:          { 'files-': filename },
        options:        { internal: true, render: false },
      })
      const fresh = result?.target?.data?.[0]?.[fieldname]
      if (fresh) setFiles(fresh)
      else setFiles(prev => prev.filter(f => f !== filename))
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: doUpload, disabled: readOnly || uploading,
  })

  return (
    <div style={{ fontSize:13 }}>
      {files.map(filename => (
        <FileItem key={filename} filename={filename} url={fileUrl(filename)}
          readOnly={readOnly} onRemove={() => doRemove(filename)} />
      ))}
      {!readOnly && (
        <div {...getRootProps()} style={{
          border:     `2px dashed ${isDragActive ? '#1a6eb5' : '#ced4da'}`,
          borderRadius:6, padding:'10px 12px', textAlign:'center',
          color:      isDragActive ? '#1a6eb5' : '#868e96',
          fontSize:   12, cursor: uploading ? 'wait' : 'pointer',
          marginTop:  files.length ? 6 : 0,
          background: isDragActive ? '#f0f6ff' : 'transparent',
          transition: 'all 0.15s',
        }}>
          <input {...getInputProps()} multiple />
          {uploading ? 'Uploading...' : isDragActive ? 'Drop files here' : 'Click or drag files to attach'}
        </div>
      )}
    </div>
  )
}

// CHANGE 3: container id = run_doc.name-fieldname throughout
const _roots = new Map()

export function mount({ run_doc, fieldname, readOnly }) {
  const containerId = `${run_doc.name}-${fieldname}`
  const container   = document.getElementById(containerId)
  if (!container) { console.warn('[FilePicker] container not found:', containerId); return }

  if (_roots.has(containerId)) {
    const old = _roots.get(containerId)
    _roots.delete(containerId)
    setTimeout(() => { try { old.unmount() } catch(_) {} }, 0)
  }

  const root = ReactDOM.createRoot(container)
  _roots.set(containerId, root)
  root.render(
    <React.StrictMode>
      <CWFilePicker run_doc={run_doc} fieldname={fieldname} readOnly={readOnly || false} />
    </React.StrictMode>
  )
}

export function unmount(run_doc, fieldname) {
  const containerId = `${run_doc.name}-${fieldname}`
  if (_roots.has(containerId)) {
    try { _roots.get(containerId).unmount() } catch(_) {}
    _roots.delete(containerId)
  }
}

if (typeof window !== 'undefined') {
  window.CWFilePicker = { mount, unmount }
}