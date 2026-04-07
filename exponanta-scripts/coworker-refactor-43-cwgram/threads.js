// ============================================================
// threads.js — Channels UI
// Requires: CW.run, CW.Schema, pb adapter, marked.js, React 18
// ============================================================

const ce  = React.createElement;
const CW  = globalThis.CW;

// ── config ────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

const md   = (text) => ({ __html: marked.parse(text || '') });
const uid  = () => globalThis.pb?.authStore?.model?.id || null;
const uname= () => globalThis.pb?.authStore?.model?.name
                || globalThis.pb?.authStore?.model?.email
                || 'Anonymous';

const timeAgo = (ts) => {
  if (!ts) return '';
  const d = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - d;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
};

const parseTags = (tags) =>
  (tags || '').split(',').map(t => t.trim()).filter(Boolean);

// ── helpers ───────────────────────────────────────────────────

// Signal FSM transition on an existing run_doc
const fireSignal = async (run_doc, key) => {
  run_doc.input._state = { [key]: '' };
  await CW.controller(run_doc);
  return run_doc;
};

// Load single record by name
const loadRecord = async (doctype, name, view = 'form') => {
  return await CW.run({
    operation: 'select', target_doctype: doctype,
    query: { where: { name }, view },
    options: { render: false },
  });
};

// ============================================================
// MARKDOWN EDITOR
// ============================================================

const MarkdownEditor = function({ value, onChange, rows, placeholder }) {
  const ref = React.useRef(null);

  const wrap = (before, after) => {
    const ta  = ref.current;
    const s   = ta.selectionStart;
    const e   = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || 'text';
    const nv  = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    onChange(nv);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd   = s + before.length + sel.length;
    }, 0);
  };

  const quote = () => {
    const ta   = ref.current;
    const s    = ta.selectionStart;
    const line = ta.value.slice(0, s).lastIndexOf('\n') + 1;
    onChange(ta.value.slice(0, line) + '> ' + ta.value.slice(line));
  };

  return ce('div', {},
    ce('div', { className: 'md-toolbar' },
      ce('button', { type:'button', onClick:()=>wrap('**','**') }, 'B'),
      ce('button', { type:'button', style:{fontStyle:'italic'}, onClick:()=>wrap('_','_') }, 'I'),
      ce('button', { type:'button', onClick:()=>wrap('`','`') }, '</>'),
      ce('button', { type:'button', onClick: quote }, '❝'),
      ce('button', { type:'button', onClick:()=>wrap('\n```\n','\n```') }, '▤'),
      ce('span', { style:{flex:1} }),
      ce('span', { style:{fontSize:'.72rem', color:'#94a3b8', alignSelf:'center'} }, 'Markdown')
    ),
    ce('textarea', {
      ref,
      className: 'form-control md-textarea',
      rows: rows || 6,
      value,
      placeholder: placeholder || 'Write in markdown...',
      onChange: (e) => onChange(e.target.value),
    })
  );
};

// ============================================================
// COMMENT THREAD
// ============================================================

const CommentThread = function({ postName, channelOwner }) {
  const [comments, setComments]   = React.useState([]);
  const [body, setBody]           = React.useState('');
  const [submitting, setSubmit]   = React.useState(false);
  const [showHidden, setShowHid]  = React.useState(false);

  const isOwner = channelOwner === uid();

  const load = React.useCallback(async () => {
    const r = await CW.run({
      operation: 'select', target_doctype: 'Comment',
      query: { where: { parent: postName } },
      options: { render: false },
    });
    if (r.success) setComments(r.target.data);
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  const onPost = async () => {
    if (!body.trim()) return;
    setSubmit(true);
    await CW.run({
      operation: 'create', target_doctype: 'Comment',
      input: {
        body,
        parent:        postName,
        author_name:   uname(),
        channel_owner: channelOwner,
        owner:         uid(),
      },
      options: { render: false },
    });
    setBody('');
    setSubmit(false);
    await load();
  };

  const onModerate = async (comment, toState) => {
    const r = await loadRecord('Comment', comment.name);
    if (r.error || !r.target?.data?.[0]) return;
    const key = `${comment.docstatus}_${toState}`;
    await fireSignal(r, key);
    await load();
  };

  const visible  = showHidden ? comments : comments.filter(c => c.docstatus !== 2);
  const hiddenN  = comments.filter(c => c.docstatus === 2).length;
  const stateMap = { 0: '', 1: 'is-flagged', 2: 'is-hidden' };
  const labelMap = { 0: null, 1: ce('span',{className:'badge bg-warning text-dark ms-1',style:{fontSize:'.68rem'}},'Flagged'), 2: ce('span',{className:'badge bg-danger ms-1',style:{fontSize:'.68rem'}},'Hidden') };

  return ce('div', { className: 'mt-3' },

    ce('div', { className: 'd-flex justify-content-between align-items-center mb-3' },
      ce('h5', { className: 'mb-0' },
        `${visible.filter(c=>c.docstatus!==2).length + (showHidden ? hiddenN : 0)} Comments`),
      hiddenN > 0 && isOwner && ce('button', {
        className: 'btn btn-sm btn-outline-secondary',
        onClick: () => setShowHid(v => !v),
      }, showHidden ? 'Hide moderated' : `Show ${hiddenN} hidden`)
    ),

    visible.map(c =>
      ce('div', { key: c.name, className: `comment-item ${stateMap[c.docstatus] || ''}` },
        ce('div', { className: 'd-flex justify-content-between align-items-start mb-1' },
          ce('div', { className: 'd-flex align-items-center gap-2' },
            ce('div', { className: 'avatar-circle' }, (c.author_name || '?')[0].toUpperCase()),
            ce('div', {},
              ce('span', { className: 'fw-medium', style:{fontSize:'.85rem'} }, c.author_name || 'User'),
              ce('span', { className: 'text-muted ms-2', style:{fontSize:'.75rem'} }, timeAgo(c.created))
            ),
            labelMap[c.docstatus]
          ),
          isOwner && ce('div', { className: 'd-flex gap-1' },
            c.docstatus === 0 && ce('button', {
              className: 'btn btn-outline-warning btn-xs',
              style:{padding:'1px 6px',fontSize:'.7rem'},
              onClick: () => onModerate(c, 1), title:'Flag'
            }, '⚑'),
            (c.docstatus === 0 || c.docstatus === 1) && ce('button', {
              className: 'btn btn-outline-danger btn-xs',
              style:{padding:'1px 6px',fontSize:'.7rem'},
              onClick: () => onModerate(c, 2), title:'Hide'
            }, '🚫'),
            c.docstatus === 1 && ce('button', {
              className: 'btn btn-outline-secondary btn-xs',
              style:{padding:'1px 6px',fontSize:'.7rem'},
              onClick: () => onModerate(c, 0), title:'Dismiss'
            }, '✓'),
            c.docstatus === 2 && ce('button', {
              className: 'btn btn-outline-success btn-xs',
              style:{padding:'1px 6px',fontSize:'.7rem'},
              onClick: () => onModerate(c, 0), title:'Unhide (owner only)'
            }, '↩')
          )
        ),
        ce('div', { style:{fontSize:'.875rem', color: c.docstatus===2?'#ef4444':'#334155'} }, c.body)
      )
    ),

    comments.length === 0 && ce('div', { className: 'text-muted text-center py-3', style:{fontSize:'.875rem'} },
      'No comments yet — be the first!'
    ),

    // editor
    uid() && ce('div', { className: 'mt-3' },
      ce('textarea', {
        className: 'form-control', rows: 3,
        placeholder: 'Add a comment... (Ctrl+Enter to post)',
        value: body,
        onChange: (e) => setBody(e.target.value),
        onKeyDown: (e) => { if (e.ctrlKey && e.key === 'Enter') onPost(); },
      }),
      ce('div', { className: 'd-flex justify-content-end mt-2' },
        ce('button', {
          className: 'btn btn-primary btn-sm',
          disabled: !body.trim() || submitting,
          onClick: onPost,
        }, submitting ? '...' : 'Post')
      )
    ),

    !uid() && ce('div', { className: 'alert alert-info mt-3 py-2', style:{fontSize:'.875rem'} },
      'Sign in to comment.'
    )
  );
};

// ============================================================
// POST DETAIL
// ============================================================

const PostDetail = function({ postName, onNav }) {
  const [post, setPost]       = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setET]    = React.useState('');
  const [editBody,  setEB]    = React.useState('');
  const [editTags,  setETags] = React.useState('');
  const [saving, setSaving]   = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await loadRecord('Post', postName);
    if (r.success && r.target?.data?.[0]) {
      const p = r.target.data[0];
      setPost(p);
      setET(p.title || '');
      setEB(p.body  || '');
      setETags(p.tags || '');
    }
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  const onSignal = async (key) => {
    const r = await loadRecord('Post', postName);
    if (r.error) return;
    await fireSignal(r, key);
    await load();
  };

  const onSave = async () => {
    setSaving(true);
    const r = await loadRecord('Post', postName);
    if (!r.error) {
      r.input.title = editTitle;
      r.input.body  = editBody;
      r.input.tags  = editTags;
      await CW.controller(r);
    }
    setSaving(false);
    setEditing(false);
    await load();
  };

  if (!post) return ce('div', { className:'text-center py-5' },
    ce('div', { className:'spinner-border text-primary' })
  );

  const isOwner  = post.owner === uid();
  const isDraft  = post.docstatus === 0;
  const stateCls = ['status-draft','status-published','status-archived'];
  const stateLabel = ['Draft','Published','Archived'];
  const tags = parseTags(post.tags);

  // available FSM buttons for current state
  const stateDef = CW._getStateDef?.('Post');
  const dim0     = stateDef?.['0'];
  const current  = post._state?.['0'] ?? post.docstatus ?? 0;
  const fsmBtns  = isOwner && dim0
    ? (dim0.transitions?.[String(current)] || []).map(to => ({
        key:   `${current}_${to}`,
        label: dim0.labels?.[`${current}_${to}`] || `${current}_${to}`,
      }))
    : [];

  return ce('div', {},

    // breadcrumb
    ce('div', { className: 'breadcrumb-nav' },
      ce('a', { onClick: () => onNav('channels') }, 'Channels'),
      ce('span', {}, '›'),
      ce('a', { onClick: () => onNav('feed', post.parent) }, post.parent),
      ce('span', {}, '›'),
      post.title
    ),

    // post card
    ce('div', { className: `post-card ${isDraft ? 'is-draft' : ''} p-4` },
      ce('div', { className: 'd-flex justify-content-between align-items-start mb-3 gap-3' },
        ce('div', { style:{flex:1} },
          editing
            ? ce('input', { className:'form-control form-control-lg fw-bold mb-2',
                value: editTitle, onChange:(e)=>setET(e.target.value) })
            : ce('h2', { className:'mb-1' }, post.title),
          ce('div', { className:'d-flex align-items-center gap-2 flex-wrap' },
            ce('span', { className:`status-pill ${stateCls[post.docstatus]}` },
              stateLabel[post.docstatus]),
            ce('span', { className:'text-muted', style:{fontSize:'.8rem'} },
              (post.author_name || 'Unknown') + ' · ' + timeAgo(post.created)),
            tags.map(t => ce('span', { key:t, className:'tag-pill' }, '#'+t))
          )
        ),
        isOwner && ce('div', { className:'d-flex gap-2 flex-wrap justify-content-end' },
          fsmBtns.map(btn => ce('button', {
            key: btn.key,
            className: btn.label === 'Delete' || btn.label === 'Archive'
              ? 'btn btn-outline-danger btn-sm'
              : 'btn btn-success btn-sm',
            onClick: () => onSignal(btn.key),
          }, btn.label)),
          !editing && ce('button', {
            className: 'btn btn-outline-secondary btn-sm',
            onClick: () => setEditing(true),
          }, '✎ Edit'),
          editing && ce('button', {
            className: 'btn btn-primary btn-sm',
            disabled: saving,
            onClick: onSave,
          }, saving ? '...' : 'Save'),
          editing && ce('button', {
            className: 'btn btn-outline-secondary btn-sm',
            onClick: () => setEditing(false),
          }, 'Cancel')
        )
      ),

      // body
      editing
        ? ce('div', {},
            ce(MarkdownEditor, { value: editBody, onChange: setEB, rows: 14 }),
            ce('div', { className: 'mt-2' },
              ce('input', { className:'form-control form-control-sm', placeholder:'Tags (comma separated)',
                value: editTags, onChange:(e)=>setETags(e.target.value) })
            )
          )
        : ce('div', { className:'post-body', dangerouslySetInnerHTML: md(post.body) })
    ),

    // comments
    ce('div', { className:'card mt-3' },
      ce('div', { className:'card-body' },
        ce(CommentThread, { postName: post.name, channelOwner: post.owner })
      )
    )
  );
};

// ============================================================
// CHANNEL FEED
// ============================================================

const ChannelFeed = function({ channelName, onNav }) {
  const [channel, setCh]  = React.useState(null);
  const [posts, setPosts] = React.useState([]);

  const load = React.useCallback(async () => {
    const [cr, pr] = await Promise.all([
      CW.run({ operation:'select', target_doctype:'Channel',
        query:{ where:{ name: channelName } }, options:{ render:false } }),
      CW.run({ operation:'select', target_doctype:'Post',
        query:{ where:{ parent: channelName } }, options:{ render:false } }),
    ]);
    if (cr.success) setCh(cr.target.data[0]);
    if (pr.success) {
      // sort by created desc
      const sorted = [...pr.target.data].sort((a,b) =>
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
      setPosts(sorted);
    }
  }, [channelName]);

  React.useEffect(() => { load(); }, [channelName]);

  if (!channel) return ce('div', { className:'text-center py-5' },
    ce('div', { className:'spinner-border text-primary' })
  );

  const isOwner = channel.owner === uid();
  // non-owners only see published posts
  const visible = isOwner
    ? posts
    : posts.filter(p => p.docstatus === 1);

  const stateCls   = ['status-draft','status-published','status-archived'];
  const stateLabel = ['Draft','Published','Archived'];

  return ce('div', {},

    ce('div', { className:'breadcrumb-nav' },
      ce('a', { onClick:()=>onNav('channels') }, 'Channels'),
      ce('span', {}, '›'),
      channel.title
    ),

    ce('div', { className:'channel-header' },
      ce('div', { className:'d-flex justify-content-between align-items-start' },
        ce('div', {},
          ce('h2', {}, channel.title),
          ce('p', {}, channel.description || 'No description.')
        ),
        isOwner && ce('button', {
          className: 'btn btn-light btn-sm',
          onClick: () => onNav('new-post', channelName),
        }, '+ New Post')
      )
    ),

    visible.length === 0 && ce('div', { className:'empty-state' },
      ce('div', { style:{fontSize:'2.5rem'} }, '📭'),
      ce('p', {}, isOwner ? 'No posts yet. Create your first post!' : 'No posts published yet.')
    ),

    visible.map(post => {
      const tags    = parseTags(post.tags);
      const excerpt = (post.body || '').replace(/[#*`>_~\[\]]/g,'').slice(0, 180);

      return ce('div', {
        key: post.name,
        className: `post-card ${post.docstatus===0?'is-draft':''} p-3`,
        style:{cursor:'pointer'},
        onClick: () => onNav('post', post.name),
      },
        ce('div', { className:'d-flex gap-3' },
          ce('div', { style:{flex:1} },
            ce('div', { className:'d-flex align-items-center gap-2 mb-1 flex-wrap' },
              post.docstatus !== 1 && ce('span', { className:`status-pill ${stateCls[post.docstatus]}` },
                stateLabel[post.docstatus]),
              ce('h4', { className:'mb-0', style:{fontSize:'1rem'} }, post.title)
            ),
            ce('div', { className:'text-muted mb-1', style:{fontSize:'.8rem'} },
              (post.author_name || 'Unknown') + ' · ' + timeAgo(post.created),
              tags.length > 0 && ce('span', { className:'ms-2' },
                tags.map(t => ce('span',{key:t,className:'tag-pill'},'#'+t))
              )
            ),
            ce('p', { className:'text-muted mb-0', style:{
              fontSize:'.875rem', overflow:'hidden',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'
            }}, excerpt + (excerpt.length >= 180 ? '…' : ''))
          ),
          ce('div', { className:'text-muted text-center flex-shrink-0', style:{fontSize:'.75rem', minWidth:36} },
            ce('div', { style:{fontSize:'1.1rem'} }, '💬')
          )
        )
      );
    })
  );
};

// ============================================================
// NEW POST EDITOR
// ============================================================

const NewPostEditor = function({ channelName, onNav }) {
  const [title, setTitle]     = React.useState('');
  const [body,  setBody]      = React.useState('');
  const [tags,  setTags]      = React.useState('');
  const [publishNow, setPub]  = React.useState(false);
  const [saving, setSaving]   = React.useState(false);
  const [error, setError]     = React.useState(null);

  const onSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null);
    setSaving(true);

    const r = await CW.run({
      operation: 'create', target_doctype: 'Post',
      input: {
        title:       title.trim(),
        body,
        tags,
        parent:      channelName,
        author_name: uname(),
        owner:       uid(),
      },
      options: { render: false },
    });

    if (r.error) { setError(r.error?.message || r.error); setSaving(false); return; }

    // publish immediately if requested
    if (publishNow && r.target?.data?.[0]?.name) {
      await fireSignal(r, '0_1');
    }

    setSaving(false);
    if (r.target?.data?.[0]?.name) {
      onNav('post', r.target.data[0].name);
    }
  };

  return ce('div', {},

    ce('div', { className:'breadcrumb-nav' },
      ce('a', { onClick:()=>onNav('feed', channelName) }, '← Back to channel')
    ),

    ce('div', { className:'card' },
      ce('div', { className:'card-header' },
        ce('h3', { className:'card-title mb-0' }, 'New Post')
      ),
      ce('div', { className:'card-body' },
        error && ce('div', { className:'alert alert-danger py-2', style:{fontSize:'.875rem'} }, error),

        ce('div', { className:'mb-3' },
          ce('label', { className:'form-label fw-medium' }, 'Title *'),
          ce('input', { className:'form-control form-control-lg',
            placeholder:'Post title...', value: title,
            onChange:(e)=>setTitle(e.target.value) })
        ),
        ce('div', { className:'mb-3' },
          ce('label', { className:'form-label fw-medium' }, 'Body'),
          ce(MarkdownEditor, { value: body, onChange: setBody, rows: 12,
            placeholder: '# Your post\n\nWrite in **markdown**...' })
        ),
        ce('div', { className:'mb-3' },
          ce('label', { className:'form-label fw-medium' }, 'Tags'),
          ce('input', { className:'form-control',
            placeholder:'tag1, tag2, tag3', value: tags,
            onChange:(e)=>setTags(e.target.value) })
        ),
        ce('div', { className:'d-flex justify-content-between align-items-center' },
          ce('label', { className:'d-flex align-items-center gap-2 mb-0', style:{cursor:'pointer'} },
            ce('input', { type:'checkbox', checked: publishNow,
              onChange:(e)=>setPub(e.target.checked) }),
            ce('span', { className:'text-muted', style:{fontSize:'.875rem'} }, 'Publish immediately')
          ),
          ce('div', { className:'d-flex gap-2' },
            ce('button', { className:'btn btn-outline-secondary',
              onClick:()=>onNav('feed', channelName) }, 'Cancel'),
            ce('button', {
              className: 'btn btn-primary',
              disabled: !title.trim() || saving,
              onClick: onSave,
            }, saving ? '...' : (publishNow ? '↑ Publish' : 'Save Draft'))
          )
        )
      )
    )
  );
};

// ============================================================
// CHANNEL LIST
// ============================================================

const ChannelList = function({ onNav }) {
  const [channels, setCh] = React.useState([]);
  const [loading, setLoad] = React.useState(true);

  React.useEffect(() => {
    CW.run({ operation:'select', target_doctype:'Channel',
      query:{}, options:{ render:false }
    }).then(r => {
      if (r.success) setCh(r.target.data);
      setLoad(false);
    });
  }, []);

  if (loading) return ce('div', { className:'text-center py-5' },
    ce('div', { className:'spinner-border text-primary' })
  );

  return ce('div', {},
    ce('div', { className:'d-flex justify-content-between align-items-center mb-4' },
      ce('div', {},
        ce('h2', { className:'mb-1' }, 'Channels'),
        ce('p', { className:'text-muted mb-0', style:{fontSize:'.875rem'} },
          channels.length + ' channels available')
      )
    ),

    channels.length === 0 && ce('div', { className:'empty-state' },
      ce('div', { style:{fontSize:'2.5rem'} }, '📢'),
      ce('p', {}, 'No channels yet.')
    ),

    ce('div', { className:'row g-3' },
      channels.map(ch =>
        ce('div', { key:ch.name, className:'col-md-6 col-lg-4' },
          ce('div', { className:'card h-100', style:{cursor:'pointer'},
            onClick:()=>onNav('feed', ch.name) },
            ce('div', { className:'card-body' },
              ce('div', { className:'d-flex align-items-center gap-3 mb-2' },
                ce('div', { style:{
                  width:40, height:40, borderRadius:8, flexShrink:0,
                  background:'linear-gradient(135deg,#1e3a5f,#206bc4)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:700, fontSize:'1.1rem'
                }}, (ch.title||'?')[0].toUpperCase()),
                ce('div', {},
                  ce('h4', { className:'mb-0', style:{fontSize:'1rem'} }, ch.title),
                  ch.owner === uid() && ce('span', {
                    className:'badge bg-blue-lt', style:{fontSize:'.68rem'}
                  }, 'Admin')
                )
              ),
              ce('p', { className:'text-muted mb-3', style:{
                fontSize:'.82rem', overflow:'hidden',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'
              }}, ch.description || 'No description.'),
              ce('div', { className:'d-flex justify-content-end' },
                ce('span', { className:'text-primary', style:{fontSize:'.82rem'} }, 'View →')
              )
            )
          )
        )
      )
    )
  );
};

// ============================================================
// APP ROOT — navigation state machine
// ============================================================

const ThreadsApp = function() {
  const [view, setView]   = React.useState('channels');
  const [param, setParam] = React.useState(null);

  const onNav = (v, p) => { setView(v); setParam(p || null); };

  document.getElementById('topbar-home')?.addEventListener('click', (e) => {
    e.preventDefault(); onNav('channels');
  });

  const body = () => {
    if (view === 'channels')  return ce(ChannelList,   { onNav });
    if (view === 'feed')      return ce(ChannelFeed,   { channelName: param, onNav });
    if (view === 'post')      return ce(PostDetail,    { postName: param, onNav });
    if (view === 'new-post')  return ce(NewPostEditor, { channelName: param, onNav });
    return ce('div', {}, 'Unknown view');
  };

  return ce('div', {}, body());
};

// ── mount ──────────────────────────────────────────────────────
const container = document.getElementById('threads-app');
if (container) {
  ReactDOM.createRoot(container).render(ce(ThreadsApp));
  console.log('✅ threads.js mounted');
}
