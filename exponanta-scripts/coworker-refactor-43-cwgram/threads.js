// ============================================================
// threads.js — Channels UI — Tabler Chat UI
// CW renderer architecture — no internal navigation state
// Each component receives run_doc, fires CW.run for navigation
// Requires: CW, React 18 UMD, Tabler CSS
// ============================================================

const ce = React.createElement;
const CW = globalThis.CW;

// ── pure helpers ──────────────────────────────────────────────

const uid   = () => globalThis.pb?.authStore?.model?.id    || null;
const uname = () => globalThis.pb?.authStore?.model?.name
                 || globalThis.pb?.authStore?.model?.email || 'Anonymous';

const timeAgo = (ts) => {
  if (!ts) return '';
  const d    = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - d;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff / 60000)   + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000)  + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
};

const parseTags = (tags) =>
  (tags || '').split(',').map(t => t.trim()).filter(Boolean);

const initials   = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
const avatarColor = (str) => {
  const colors = ['#206bc4','#2fb344','#f76707','#e03131','#7048e8','#0ca678','#d6336c','#1098ad'];
  let h = 0; for (const c of (str||'')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
};

const blockPreview = (body, maxLen = 80) => {
  if (!body) return '';
  try {
    const blocks = typeof body === 'string' ? JSON.parse(body) : body;
    const text = (blocks || [])
      .flatMap(b => b.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join(' ').trim();
    return text.length > maxLen ? text.slice(0, maxLen) + '\u2026' : text;
  } catch {
    return (typeof body === 'string' ? body : '').replace(/[#*`>_~\[\]]/g,'').slice(0, maxLen);
  }
};

// ── navigation via CW.run ─────────────────────────────────────
// all navigation fires CW.run with explicit container + component
// run_doc.context carries channel/post context through the chain

const navTo = (component, view, doctype, query, run_doc, extra = {}) =>
  CW.run({
    operation:      'select',
    target_doctype: doctype,
    query,
    view,
    component,
    container:      run_doc.container,
    context:        run_doc.context || {},
    options:        { render: true },
    ...extra,
  });

// ── Avatar component ──────────────────────────────────────────

const Avatar = ({ name, size = 'avatar-md' }) =>
  ce('span', {
    className: `avatar ${size}`,
    style: { background: avatarColor(name), color: '#fff', fontWeight: 600, fontSize: '.75rem' }
  }, initials(name));

// ============================================================
// BLOCKNOTE — lazy loader + wrappers
// ============================================================

let _editorMod = null;
const getEditor = async () => {
  if (!_editorMod) _editorMod = await import('./editor.js');
  return _editorMod;
};

const BlockNoteEditor = function({ containerId, initialContent, recordId, onBeforeUpload }) {
  // Option C: no onChange — caller reads content via getContent() at save time
  // mounts once per containerId+recordId — no remount on content change
  React.useEffect(() => {
    let alive = true;
    getEditor().then(({ mount }) => {
      if (!alive) return;
      mount({ containerId, initialContent, recordId, onBeforeUpload });
    });
    return () => { alive = false; getEditor().then(({ unmount }) => unmount(containerId)); };
  }, [containerId, recordId]);
  return ce('div', { id: containerId, style: { border:'1px solid var(--tblr-border-color)', borderRadius:'4px', minHeight:'240px' } });
};

const BlockNoteRenderer = function({ containerId, content, recordId }) {
  // mounts once per containerId — content is initial only, BlockNote owns state after mount
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!content || mountedRef.current) return;
    mountedRef.current = true;
    let alive = true;
    getEditor().then(({ mountRenderer }) => {
      if (!alive) return;
      mountRenderer({ containerId, content, collectionId: 'item', recordId });
    });
    return () => { alive = false; mountedRef.current = false; getEditor().then(({ unmount }) => unmount(containerId)); };
  }, [containerId]);
  return ce('div', { id: containerId });
};

// ============================================================
// COMMENT THREAD — unchanged, no navigation needed
// ============================================================

const CommentThread = function({ postName, channelOwner }) {
  const [comments, setComments] = React.useState([]);
  const [body,     setBody]     = React.useState('');
  const [submitting, setSubmit] = React.useState(false);
  const [showHidden, setShowHid] = React.useState(false);

  const isOwner = channelOwner === uid();

  const load = React.useCallback(async () => {
    const r = await CW.run({
      operation:'select', target_doctype:'Comment',
      query:{ where:{ parent: postName } }, options:{ render:false },
    });
    if (r.success) setComments(r.target.data);
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  const onPost = async () => {
    if (!body.trim()) return;
    setSubmit(true);
    await CW.run({
      operation:'create', target_doctype:'Comment',
      input:{ body, parent:postName, author_name:uname(), channel_owner:channelOwner, owner:uid() },
      options:{ render:false },
    });
    setBody(''); setSubmit(false); await load();
  };

  const onModerate = async (comment, toState) => {
    const r = await CW.run({
      operation:'select', target_doctype:'Comment',
      query:{ where:{ name:comment.name } }, options:{ render:false },
    });
    if (r.error || !r.target?.data?.[0]) return;
    r.input._state = { [`${comment.docstatus}_${toState}`]: '' };
    await CW.controller(r);
    await load();
  };

  const visible = showHidden ? comments : comments.filter(c => c.docstatus !== 2);
  const hiddenN = comments.filter(c => c.docstatus === 2).length;

  const ModBtns = ({ c }) => !isOwner ? null : ce('div', { className:'d-flex gap-1 mt-1' },
    c.docstatus === 0 && ce('button', { className:'btn btn-xs btn-ghost-warning', style:{padding:'1px 5px',fontSize:'.68rem'}, onClick:()=>onModerate(c,1), title:'Flag' }, '⚑'),
    (c.docstatus === 0 || c.docstatus === 1) && ce('button', { className:'btn btn-xs btn-ghost-danger', style:{padding:'1px 5px',fontSize:'.68rem'}, onClick:()=>onModerate(c,2), title:'Hide' }, '🚫'),
    c.docstatus === 1 && ce('button', { className:'btn btn-xs btn-ghost-secondary', style:{padding:'1px 5px',fontSize:'.68rem'}, onClick:()=>onModerate(c,0), title:'Dismiss flag' }, '✓'),
    c.docstatus === 2 && ce('button', { className:'btn btn-xs btn-ghost-success', style:{padding:'1px 5px',fontSize:'.68rem'}, onClick:()=>onModerate(c,0), title:'Unhide' }, '↩')
  );

  const stateLabel = {
    1: ce('span',{className:'badge bg-warning-lt text-warning ms-1',style:{fontSize:'.65rem'}},'Flagged'),
    2: ce('span',{className:'badge bg-danger-lt text-danger ms-1',style:{fontSize:'.65rem'}},'Hidden'),
  };

  return ce('div', {},
    ce('div', { className:'d-flex justify-content-between align-items-center mb-2' },
      ce('h5', { className:'mb-0 text-secondary', style:{fontSize:'.875rem',fontWeight:600} },
        `\u{1F4AC} ${visible.filter(c=>c.docstatus!==2).length + (showHidden ? hiddenN : 0)} comments`),
      hiddenN > 0 && isOwner && ce('button', {
        className:'btn btn-sm btn-ghost-secondary', onClick:()=>setShowHid(v=>!v),
      }, showHidden ? 'Hide moderated' : `${hiddenN} hidden`)
    ),
    ce('div', { className:'chat' },
      ce('div', { className:'chat-bubbles' },
        visible.length === 0 && ce('div', { className:'text-center text-secondary py-3', style:{fontSize:'.875rem'} }, 'No comments yet \u2014 be the first!'),
        visible.map(c => {
          const isMe   = c.owner === uid();
          const dimmed = c.docstatus === 2 ? { opacity:.6 } : {};
          return ce('div', { key:c.name, className:'chat-item' },
            ce('div', { className:`row align-items-end ${isMe ? 'justify-content-end' : ''}` },
              !isMe && ce('div', { className:'col-auto' }, ce(Avatar, { name:c.author_name, size:'avatar-sm' })),
              ce('div', { className:'col col-lg-8' },
                ce('div', { className:`chat-bubble ${isMe ? 'chat-bubble-me' : ''}`, style:dimmed },
                  ce('div', { className:'chat-bubble-title' },
                    ce('div', { className:'row' },
                      ce('div', { className:'col chat-bubble-author d-flex align-items-center gap-1' }, c.author_name || 'User', stateLabel[c.docstatus]),
                      ce('div', { className:'col-auto chat-bubble-date' }, timeAgo(c.created))
                    )
                  ),
                  ce('div', { className:'chat-bubble-body' },
                    ce('p', { className:'mb-0', style:{color: c.docstatus===2?'var(--tblr-danger)':'inherit'} }, c.body)
                  ),
                  ce(ModBtns, { c })
                )
              ),
              isMe && ce('div', { className:'col-auto' }, ce(Avatar, { name:c.author_name, size:'avatar-sm' }))
            )
          );
        })
      )
    ),
    uid()
      ? ce('div', { className:'mt-3' },
          ce('div', { className:'input-group' },
            ce('textarea', {
              className:'form-control', rows:2,
              placeholder:'Add a comment... (Ctrl+Enter to post)',
              value: body, onChange:(e)=>setBody(e.target.value),
              onKeyDown:(e)=>{ if(e.ctrlKey && e.key==='Enter') onPost(); },
              style:{ resize:'none' }
            }),
            ce('button', { className:'btn btn-primary', disabled: !body.trim() || submitting, onClick: onPost }, submitting ? '\u2026' : 'Post')
          )
        )
      : ce('div', { className:'alert alert-info mt-3 py-2 mb-0', style:{fontSize:'.875rem'} }, 'Sign in to comment.')
  );
};

// ============================================================
// POST DETAIL — CW renderer, receives run_doc
// No editing state — FSM drives view switch via _execTransition
// ============================================================

const PostDetail = function({ run_doc }) {
  const post     = run_doc.target?.data?.[0] || null;
  const postName = run_doc.query?.where?.name;

  // reload after FSM signal
  const [rev, setRev] = React.useState(0);
  const [localPost, setLocalPost] = React.useState(post);

  React.useEffect(() => {
    if (post) { setLocalPost(post); return; }
    CW.run({ operation:'select', target_doctype:'Post', query:{ where:{ name:postName } }, options:{ render:false } })
      .then(r => { if (r.success && r.target?.data?.[0]) setLocalPost(r.target.data[0]); });
  }, [postName, rev]);

  if (!localPost) return ce('div', { className:'text-center py-5' }, ce('div', { className:'spinner-border text-primary' }));

  const p         = localPost;
  const isOwner   = p.owner === uid();
  const isDraft   = p.docstatus === 0;
  const stateDef  = CW._getStateDef?.('Post');
  const dim0      = stateDef?.['0'];
  const current   = p._state?.['0'] ?? p.docstatus ?? 0;
  const stateLabel = ['Draft','Published','Archived'];
  const stateCls   = ['bg-warning-lt text-warning','bg-success-lt text-success','bg-secondary-lt text-secondary'];
  const tags       = parseTags(p.tags);

  const fsmBtns = isOwner && dim0
    ? (dim0.transitions?.[String(current)]||[]).map(to => ({
        key:   `${current}_${to}`,
        label: dim0.labels?.[`${current}_${to}`] || `${current}_${to}`,
      }))
    : [];

  const onSignal = async (key) => {
    // FSM signal — _execTransition handles view switch automatically
    await CW.run({
      operation:      'update',
      target_doctype: 'Post',
      query:          { where: { name: p.name } },
      input:          { _state: { [key]: '' } },
      container:      run_doc.container,
      context:        run_doc.context,
      options:        { render: false, internal: true },
    });
    setRev(v => v + 1);
  };

  const onBack = () => {
    const channelName = p.parent || run_doc.context?.channel;
    CW.run({
      operation:      'select',
      target_doctype: 'Post',
      query:          { where: { parent: channelName } },
      view:           'list',
      component:      'ChannelFeed',
      container:      'threads_left',
      context:        { channel: channelName },
      options:        { render: true },
    });
    // clear right panel
    CW.run({
      operation:      'select',
      target_doctype: 'Channel',
      query:          { where: { name: channelName } },
      view:           'read',
      component:      'PostPlaceholder',
      container:      run_doc.container,
      options:        { render: true },
    });
  };

  return ce('div', { className:'d-flex flex-column h-100' },

    ce('div', { className:'card-header' },
      ce('div', { className:'d-flex align-items-center gap-2 w-100' },
        ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick: onBack }, '\u2190'),
        ce('div', { className:'flex-fill' },
          ce('span', { className:'text-secondary', style:{fontSize:'.8rem'} }, 'Channels \u203a ', p.parent),
          ce('div', { className:'fw-medium' }, p.title)
        ),
        ce('span', { className:`badge ${stateCls[p.docstatus]} me-2` }, stateLabel[p.docstatus]),
        isOwner && ce('div', { className:'d-flex gap-1' },
          fsmBtns.map(btn => ce('button', {
            key: btn.key,
            className: (btn.label==='Delete'||btn.label==='Archive') ? 'btn btn-sm btn-ghost-danger' : 'btn btn-sm btn-ghost-success',
            onClick: () => onSignal(btn.key),
          }, btn.label)),
          // edit button — navigate to PostEditor
          isDraft && isOwner && ce('button', {
            className: 'btn btn-sm btn-ghost-secondary',
            onClick: () => CW.run({
              operation:      'select',
              target_doctype: 'Post',
              query:          { where: { name: p.name } },
              view:           'edit',
              component:      'PostEditor',
              container:      run_doc.container,
              context:        run_doc.context,
              options:        { render: true },
            }),
          }, '\u270E')
        )
      )
    ),

    ce('div', { className:'card-body scrollable', style:{overflowY:'auto'} },
      ce('div', { className:'chat mb-4' },
        ce('div', { className:'chat-bubbles' },
          ce('div', { className:'chat-item' },
            ce('div', { className:'row align-items-start' },
              ce('div', { className:'col-auto' }, ce(Avatar, { name: p.author_name })),
              ce('div', { className:'col' },
                ce('div', { className:`chat-bubble ${isDraft ? 'border border-warning' : ''}` },
                  ce('div', { className:'chat-bubble-title' },
                    ce('div', { className:'row' },
                      ce('div', { className:'col chat-bubble-author' }, p.author_name || 'Unknown'),
                      ce('div', { className:'col-auto chat-bubble-date' }, timeAgo(p.created))
                    )
                  ),
                  ce('div', { className:'chat-bubble-body' },
                    ce('div', {},
                      ce('h4', { className:'mb-3' }, p.title),
                      ce(BlockNoteRenderer, { containerId:`bn-view-${p.name}`, content:p.body, recordId:p.name }),
                      tags.length > 0 && ce('div', { className:'mt-3 d-flex gap-1 flex-wrap' },
                        tags.map(t => ce('span', { key:t, className:'badge bg-blue-lt text-blue' }, '#'+t))
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),
      ce('div', { className:'hr-text hr-text-center text-secondary mb-3', style:{fontSize:'.8rem'} }, 'Comments'),
      ce(CommentThread, { postName: p.name, channelOwner: p.owner })
    )
  );
};

// ============================================================
// POST EDITOR — CW renderer for edit view
// Handles new post (no name yet) and editing existing draft
// ============================================================

const PostEditor = function({ run_doc }) {
  const existing    = run_doc.target?.data?.[0] || null;
  const channelName = existing?.parent || run_doc.context?.channel || '';
  const EDITOR_ID   = 'bn-post-editor';

  const [title,    setTitle]    = React.useState(existing?.title || '');
  const [tags,     setTags]     = React.useState(existing?.tags  || '');
  const [postName, setPostName] = React.useState(existing?.name  || null);
  const postNameRef             = React.useRef(existing?.name    || null);
  const titleRef                = React.useRef(existing?.title   || '');
  const [publishNow, setPub]    = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const [error,    setError]    = React.useState(null);

  // ensureDraft — creates a PB record so image upload has a recordId
  const ensureDraft = async () => {
    if (postNameRef.current) return;
    const t = titleRef.current.trim() || 'Untitled';
    const r = await CW.run({
      operation:'create', target_doctype:'Post',
      input:{ title:t, body:'[]', tags, parent:channelName, author_name:uname(), owner:uid() },
      options:{ render:false },
    });
    if (r.success && r.target?.data?.[0]?.name) {
      postNameRef.current = r.target.data[0].name;
      setPostName(r.target.data[0].name);
    }
  };

  const onSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null); setSaving(true);

    // read content from live BlockNote editor at save time
    // poll briefly — useEffect registration is async after mount
    const { getContent } = await getEditor();
    let rawBody = getContent(EDITOR_ID);
    if (!rawBody) {
      await new Promise(r => setTimeout(r, 100));
      rawBody = getContent(EDITOR_ID);
    }
    const body = rawBody || '[]';

    if (postNameRef.current) {
      await CW.run({
        operation:      'update',
        target_doctype: 'Post',
        query:          { where: { name: postNameRef.current } },
        input:          { title: title.trim(), body, tags,
                          ...(publishNow ? { _state: { '0_1': '' } } : {}) },
        container:      run_doc.container,
        context:        run_doc.context,
        options:        { render: false, internal: true },
      });
      setSaving(false);
      CW.run({
        operation:      'select',
        target_doctype: 'Post',
        query:          { where: { name: postNameRef.current } },
        view:           publishNow ? 'read' : 'edit',
        component:      publishNow ? 'PostDetail' : 'PostEditor',
        container:      run_doc.container,
        context:        run_doc.context,
        options:        { render: true },
      });
    } else {
      const r = await CW.run({
        operation:'create', target_doctype:'Post',
        input:{ title:title.trim(), body, tags, parent:channelName, author_name:uname(), owner:uid() },
        options:{ render:false },
      });
      if (r.error) { setError(r.error?.message||r.error); setSaving(false); return; }
      const name = r.target?.data?.[0]?.name;
      if (publishNow && name) {
        await CW.run({
          operation:'update', target_doctype:'Post',
          query:{ where:{ name } }, input:{ _state:{ '0_1':'' } },
          container: run_doc.container, context: run_doc.context,
          options:{ render:false, internal:true },
        });
      }
      setSaving(false);
      if (name) CW.run({
        operation:'select', target_doctype:'Post',
        query:{ where:{ name } },
        view: publishNow ? 'read' : 'edit',
        component: publishNow ? 'PostDetail' : 'PostEditor',
        container: run_doc.container, context: run_doc.context,
        options:{ render:true },
      });
    }
  };

  const onCancel = () => {
    CW.run({
      operation:      'select',
      target_doctype: 'Post',
      query:          { where: { parent: channelName } },
      view:           'list',
      component:      'ChannelFeed',
      container:      'threads_left',
      context:        { channel: channelName },
      options:        { render: true },
    });
  };

  return ce('div', { className:'d-flex flex-column h-100' },
    ce('div', { className:'card-header' },
      ce('button', { className:'btn btn-sm btn-ghost-secondary me-2', onClick: onCancel }, '←'),
      ce('span', { className:'fw-semibold' }, existing ? 'Edit Post' : 'New Post')
    ),
    ce('div', { className:'card-body scrollable', style:{overflowY:'auto'} },
      error && ce('div', { className:'alert alert-danger py-2 mb-3', style:{fontSize:'.875rem'} }, error),
      ce('div', { className:'mb-3' },
        ce('label', { className:'form-label' }, 'Title'),
        ce('input', {
          className:'form-control form-control-lg', placeholder:'Post title...',
          value: title,
          onChange: (e) => { setTitle(e.target.value); titleRef.current = e.target.value; },
          onBlur:   () => ensureDraft(),
        })
      ),
      ce('div', { className:'mb-3' },
        ce('label', { className:'form-label' }, 'Body'),
        ce(BlockNoteEditor, {
          containerId:    EDITOR_ID,
          initialContent: existing?.body || null,
          recordId:       postName,
          onBeforeUpload: async () => { await ensureDraft(); return postNameRef.current; },
        })
      ),
      ce('div', { className:'mb-3' },
        ce('label', { className:'form-label' }, 'Tags'),
        ce('input', { className:'form-control', placeholder:'tag1, tag2, tag3', value:tags, onChange:(e)=>setTags(e.target.value) })
      )
    ),
    ce('div', { className:'card-footer d-flex justify-content-between align-items-center' },
      ce('label', { className:'d-flex align-items-center gap-2 mb-0', style:{cursor:'pointer'} },
        ce('input', { type:'checkbox', className:'form-check-input m-0', checked:publishNow, onChange:(e)=>setPub(e.target.checked) }),
        ce('span', { className:'text-secondary', style:{fontSize:'.875rem'} }, 'Publish immediately')
      ),
      ce('div', { className:'d-flex gap-2' },
        ce('button', { className:'btn btn-outline-secondary', onClick: onCancel }, 'Cancel'),
        ce('button', { className:'btn btn-primary', disabled:!title.trim()||saving, onClick:onSave },
          saving ? '…' : (publishNow ? '↑ Publish' : 'Save Draft'))
      )
    )
  );
};

// ============================================================
// CHANNEL FEED — CW renderer for post list (left panel)
// ============================================================

const ChannelFeed = function({ run_doc }) {
  const channelName = run_doc.query?.where?.parent || run_doc.context?.channel;
  const [channel, setCh]    = React.useState(null);
  const [posts,   setPosts] = React.useState(run_doc.target?.data || []);

  React.useEffect(() => {
    Promise.all([
      CW.run({ operation:'select', target_doctype:'Channel', query:{ where:{ name:channelName } }, options:{ render:false } }),
      posts.length ? Promise.resolve(null)
        : CW.run({ operation:'select', target_doctype:'Post', query:{ where:{ parent:channelName } }, options:{ render:false } }),
    ]).then(([cr, pr]) => {
      if (cr?.success)  setCh(cr.target.data[0]);
      if (pr?.success)  setPosts([...pr.target.data].sort((a,b) => new Date(b.created)-new Date(a.created)));
    });
  }, [channelName]);

  if (!channel) return ce('div', { className:'text-center py-4' }, ce('div', { className:'spinner-border spinner-border-sm text-primary' }));

  const isOwner  = channel.owner === uid();
  const visible  = isOwner ? posts : posts.filter(p => p.docstatus === 1);
  const context  = { channel: channelName };

  const onPostClick = (post) => {
    CW.run({
      operation:      'select',
      target_doctype: 'Post',
      query:          { where: { name: post.name } },
      view:           'read',
      component:      'PostDetail',
      container:      'threads_right',
      context,
      options:        { render: true },
    });
  };

  const onNewPost = () => {
    CW.run({
      operation:      'create',
      target_doctype: 'Post',
      view:           'edit',
      component:      'PostEditor',
      container:      'threads_right',
      context,
      options:        { render: true },
    });
  };

  const onBack = () => {
    CW.run({
      operation:      'select',
      target_doctype: 'Channel',
      view:           'list',
      component:      'ChannelList',
      container:      'threads_left',
      options:        { render: true },
    });
  };

  return ce('div', { className:'d-flex flex-column h-100' },
    ce('div', { className:'card-header' },
      ce('div', { className:'d-flex align-items-center gap-2 w-100' },
        ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick: onBack }, '\u2190'),
        ce('div', { className:'flex-fill' },
          ce('span', { className:'fw-semibold' }, channel.title),
          ce('div', { className:'text-secondary', style:{fontSize:'.75rem'} }, channel.description || '')
        ),
        isOwner && ce('button', { className:'btn btn-sm btn-primary', onClick: onNewPost }, '+')
      )
    ),
    ce('div', { className:'card-body p-0 scrollable flex-fill', style:{overflowY:'auto'} },
      visible.length === 0
        ? ce('div', { className:'text-center text-secondary p-4', style:{fontSize:'.875rem'} },
            isOwner ? 'No posts yet.' : 'No posts published yet.')
        : ce('div', { className:'nav flex-column nav-pills', role:'tablist' },
            visible.map(post => {
              const excerpt  = blockPreview(post.body, 60);
              const isDraft  = post.docstatus === 0;
              return ce('a', {
                key:       post.name,
                className: 'nav-link text-start mw-100 p-3',
                style:     { cursor:'pointer', borderRadius:0 },
                onClick:   () => onPostClick(post),
              },
                ce('div', { className:'row align-items-center flex-fill g-2' },
                  ce('div', { className:'col-auto' }, ce(Avatar, { name: post.author_name })),
                  ce('div', { className:'col text-body overflow-hidden' },
                    ce('div', { className:'d-flex align-items-center gap-1' },
                      isDraft && ce('span', { className:'badge bg-warning-lt text-warning me-1', style:{fontSize:'.65rem'} }, 'Draft'),
                      ce('span', { className:'fw-medium text-truncate', style:{fontSize:'.875rem'} }, post.title)
                    ),
                    ce('div', { className:'text-secondary text-truncate', style:{fontSize:'.78rem'} }, excerpt)
                  ),
                  ce('div', { className:'col-auto text-secondary', style:{fontSize:'.72rem'} }, timeAgo(post.created))
                )
              );
            })
          )
    )
  );
};

// ============================================================
// CHANNEL LIST — CW renderer, left panel boot component
// ============================================================

const ChannelList = function({ run_doc }) {
  const [channels, setCh]  = React.useState(run_doc.target?.data || []);
  const [loading,  setLoad] = React.useState(!run_doc.target?.data?.length);

  React.useEffect(() => {
    if (channels.length) return;
    CW.run({ operation:'select', target_doctype:'Channel', query:{}, options:{ render:false } })
      .then(r => { if (r.success) setCh(r.target.data); setLoad(false); });
  }, []);

  if (loading) return ce('div', { className:'text-center py-4' }, ce('div', { className:'spinner-border spinner-border-sm text-primary' }));

  const onChannelClick = (ch) => {
    CW.run({
      operation:      'select',
      target_doctype: 'Post',
      query:          { where: { parent: ch.name } },
      view:           'list',
      component:      'ChannelFeed',
      container:      run_doc.container,
      context:        { channel: ch.name },
      options:        { render: true },
    });
  };

  return ce('div', { className:'d-flex flex-column h-100' },
    ce('div', { className:'card-header' },
      ce('span', { className:'fw-semibold' }, 'Channels'),
      ce('span', { className:'ms-auto badge bg-secondary-lt' }, channels.length)
    ),
    channels.length === 0
      ? ce('div', { className:'text-center text-secondary p-4', style:{fontSize:'.875rem'} }, 'No channels yet.')
      : ce('div', { className:'card-body p-0 scrollable flex-fill', style:{overflowY:'auto'} },
          ce('div', { className:'nav flex-column nav-pills', role:'tablist' },
            channels.map(ch =>
              ce('a', {
                key:       ch.name,
                className: 'nav-link text-start mw-100 p-3',
                style:     { cursor:'pointer', borderRadius:0 },
                onClick:   () => onChannelClick(ch),
              },
                ce('div', { className:'row align-items-center flex-fill g-2' },
                  ce('div', { className:'col-auto' },
                    ce('span', { className:'avatar avatar-sm', style:{ background:avatarColor(ch.title), color:'#fff', fontWeight:700 } },
                      (ch.title||'?')[0].toUpperCase())
                  ),
                  ce('div', { className:'col text-body overflow-hidden' },
                    ce('div', { className:'d-flex align-items-center gap-1' },
                      ce('span', { className:'fw-medium', style:{fontSize:'.875rem'} }, ch.title),
                      ch.owner===uid() && ce('span', { className:'badge bg-blue-lt ms-1', style:{fontSize:'.65rem'} }, 'Admin')
                    ),
                    ce('div', { className:'text-secondary text-truncate', style:{fontSize:'.78rem'} }, ch.description||'')
                  )
                )
              )
            )
          )
        )
  );
};

// ============================================================
// POST PLACEHOLDER — empty right panel state
// ============================================================

const PostPlaceholder = function({ run_doc }) {
  const msg = run_doc.context?.channel ? 'Select a post to read' : 'Select a channel to browse posts';
  return ce('div', { className:'d-flex flex-column align-items-center justify-content-center h-100 text-secondary' },
    ce('div', { style:{fontSize:'3rem'} }, '\uD83D\uDCE2'),
    ce('div', { className:'mt-2', style:{fontSize:'.875rem'} }, msg)
  );
};

// ============================================================
// REGISTER ON globalThis — CW._render resolves by name
// ============================================================

globalThis.ChannelList    = ChannelList;
globalThis.ChannelFeed    = ChannelFeed;
globalThis.PostDetail     = PostDetail;
globalThis.PostEditor     = PostEditor;
globalThis.PostPlaceholder = PostPlaceholder;
globalThis.CommentThread  = CommentThread;

console.log('\u2705 threads.js loaded — components registered');
