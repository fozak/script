// ============================================================
// threads.js — CW Channels UI
// Requires: CW, pb (PocketBase), React 18 UMD, marked
// BlockNote editor loaded lazily via import('./editor.js')
// ============================================================

/* global React, ReactDOM, marked, CW */

const ce = React.createElement;

// ── helpers ───────────────────────────────────────────────────
const uid   = () => globalThis.pb?.authStore?.model?.id    || null;
const uname = () => globalThis.pb?.authStore?.model?.name
                 || globalThis.pb?.authStore?.model?.email || 'Anonymous';

const timeAgo = (ts) => {
  if (!ts) return '';
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

// Render BlockNote JSON → plain preview text for feed
const blockPreview = (body, maxLen = 120) => {
  if (!body) return '';
  try {
    const blocks = typeof body === 'string' ? JSON.parse(body) : body;
    const text = (blocks || [])
      .flatMap(b => b.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join(' ')
      .trim();
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  } catch {
    // fallback: body might be legacy markdown string
    return typeof body === 'string' ? body.slice(0, maxLen) : '';
  }
};

// ── BlockNote lazy loader ─────────────────────────────────────
let _editorMod = null;
async function getEditor() {
  if (!_editorMod) _editorMod = await import('./editor.js');
  return _editorMod;
}

// ── CW helpers ────────────────────────────────────────────────
async function cwRun(opts) {
  return CW.run({ ...opts, options: { render: false, ...(opts.options || {}) } });
}

async function loadDoc(doctype, name) {
  return cwRun({ operation: 'select', target_doctype: doctype,
                 query: { where: { name } } });
}

// ── docstatus badge ───────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = { 0: ['Draft','badge-draft'], 1: ['Published','badge-published'], 2: ['Archived','badge-archived'] };
  const [label, cls] = map[status] || ['Unknown','badge-draft'];
  return ce('span', { className:`badge ${cls}` }, label);
};

// ── avatar ────────────────────────────────────────────────────
const Avatar = ({ name }) =>
  ce('div', { className:'avatar-circle' },
    (name || '?')[0].toUpperCase()
  );

// ============================================================
// BLOCKNOTE EDITOR WRAPPER
// Mounts/unmounts editor.js into a div by id
// ============================================================
const BlockNoteEditor = function({ containerId, initialContent, recordId, onChange }) {
  const pbUrl      = CW._config?.pb_url || '';
  const pbToken    = globalThis.pb?.authStore?.token || '';
  const collId     = 'item';

  React.useEffect(() => {
    let alive = true;
    getEditor().then(({ mount }) => {
      if (!alive) return;
      mount({
        containerId,
        initialContent,
        pbUrl,
        pbToken,
        collectionId: collId,
        recordId,
        onChange,
      });
    });
    return () => {
      alive = false;
      getEditor().then(({ unmount }) => unmount(containerId));
    };
  // remount if recordId arrives (draft was created)
  }, [containerId, recordId]);

  return ce('div', {
    id: containerId,
    className: 'bn-editor-container',
  });
};

// ============================================================
// BLOCKNOTE RENDERER (read-only)
// ============================================================
const BlockNoteRenderer = function({ containerId, content, recordId }) {
  const pbUrl = CW._config?.pb_url || '';
  const collId = 'item';

  React.useEffect(() => {
    if (!content) return;
    let alive = true;
    getEditor().then(({ mountRenderer }) => {
      if (!alive) return;
      mountRenderer({ containerId, content, pbUrl, collectionId: collId, recordId });
    });
    return () => {
      alive = false;
      getEditor().then(({ unmount }) => unmount(containerId));
    };
  }, [containerId, content]);

  return ce('div', { id: containerId });
};

// ============================================================
// COMMENT THREAD
// ============================================================
const CommentThread = function({ postName, channelOwner }) {
  const [comments, setComments] = React.useState([]);
  const [body,     setBody]     = React.useState('');
  const [submitting, setSub]    = React.useState(false);
  const [showHidden, setShowH]  = React.useState(false);
  const bottomRef = React.useRef(null);

  const isOwner = channelOwner === uid();

  const load = React.useCallback(async () => {
    const r = await cwRun({
      operation: 'select', target_doctype: 'Comment',
      query: { where: { parent: postName }, sort: 'created' },
    });
    if (r.success) setComments(r.target.data || []);
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  // scroll to bottom on new comments
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const onPost = async () => {
    if (!body.trim()) return;
    setSub(true);
    await cwRun({
      operation: 'create', target_doctype: 'Comment',
      input: {
        body: body.trim(),
        parent: postName,
        author_name: uname(),
        channel_owner: channelOwner,
        owner: uid(),
      },
    });
    setBody('');
    setSub(false);
    await load();
  };

  const onModerate = async (comment, toState) => {
    await cwRun({
      operation: 'update', target_doctype: 'Comment',
      query: { where: { name: comment.name } },
      input: { _docstatus: toState },
    });
    await load();
  };

  const visible = showHidden
    ? comments
    : comments.filter(c => c._docstatus !== 2);

  return ce('div', { className:'d-flex flex-column', style:{ height: 360, borderTop:'1px solid var(--tblr-border-color)' } },

    // comment list
    ce('div', { className:'comment-list' },
      visible.length === 0
        ? ce('p', { className:'text-muted text-center', style:{fontSize:'.8rem',marginTop:'1rem'} }, 'No comments yet.')
        : visible.map(c => {
            const mine   = c.owner === uid();
            const hidden = c._docstatus === 2;
            return ce('div', {
              key: c.name,
              className: `comment-item d-flex ${mine ? 'justify-content-end' : 'justify-content-start'}`,
            },
              !mine && ce(Avatar, { name: c.author_name }),
              ce('div', { className:`ms-2 ${mine ? 'me-0' : ''}` },
                ce('div', {
                  className: `comment-bubble ${mine ? 'mine' : 'theirs'} ${hidden ? 'hidden' : ''}`,
                }, hidden ? '(hidden by moderator)' : c.body),
                ce('div', { className:'d-flex gap-2 mt-1', style:{fontSize:'.7rem', color:'#94a3b8'} },
                  ce('span', {}, c.author_name || 'Anon'),
                  ce('span', {}, timeAgo(c.created)),
                  // moderation buttons (owner only)
                  isOwner && !hidden &&
                    ce('button', {
                      className:'btn btn-link btn-sm p-0 text-danger',
                      style:{fontSize:'.7rem'},
                      onClick: () => onModerate(c, 2),
                    }, 'Hide'),
                  isOwner && hidden &&
                    ce('button', {
                      className:'btn btn-link btn-sm p-0 text-success',
                      style:{fontSize:'.7rem'},
                      onClick: () => onModerate(c, 0),
                    }, 'Unhide'),
                )
              )
            );
          }),
      ce('div', { ref: bottomRef })
    ),

    // owner: show/hide toggle
    isOwner && comments.some(c => c._docstatus === 2) &&
      ce('div', { className:'px-3 pb-1' },
        ce('button', {
          className:'btn btn-link btn-sm p-0 text-secondary',
          style:{fontSize:'.75rem'},
          onClick: () => setShowH(v => !v),
        }, showHidden ? 'Hide moderated' : `Show moderated (${comments.filter(c=>c._docstatus===2).length})`)
      ),

    // comment input
    ce('div', { className:'comment-bar' },
      ce('textarea', {
        className: 'form-control',
        rows: 2,
        placeholder: 'Write a comment...',
        value: body,
        onChange: e => setBody(e.target.value),
        onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onPost(); } },
        style: { resize:'none', fontSize:'.875rem' },
      }),
      ce('button', {
        className: 'btn btn-primary',
        disabled: submitting || !body.trim(),
        onClick: onPost,
        style: { flexShrink:0 },
      }, submitting ? '…' : '↑')
    )
  );
};

// ============================================================
// POST DETAIL
// ============================================================
const PostDetail = function({ postName, onNav }) {
  const [post,    setPost]    = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editBody,  setEditBody]  = React.useState('');
  const [saving,  setSaving]  = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const r = await loadDoc('Post', postName);
    if (r.success) setPost(r.target.data);
    setLoading(false);
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  const isOwner = post?.owner === uid();

  const onPublish = async () => {
    setSaving(true);
    await cwRun({
      operation: 'update', target_doctype: 'Post',
      query: { where: { name: postName } },
      input: { _docstatus: 1 },
    });
    await load();
    setSaving(false);
  };

  const onArchive = async () => {
    setSaving(true);
    await cwRun({
      operation: 'update', target_doctype: 'Post',
      query: { where: { name: postName } },
      input: { _docstatus: 2 },
    });
    await load();
    setSaving(false);
  };

  const onStartEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditing(true);
  };

  const onSaveEdit = async () => {
    setSaving(true);
    await cwRun({
      operation: 'update', target_doctype: 'Post',
      query: { where: { name: postName } },
      input: { title: editTitle, body: editBody },
    });
    setEditing(false);
    setSaving(false);
    await load();
  };

  if (loading) return ce('div', { className:'empty-state' }, 'Loading post…');
  if (!post)   return ce('div', { className:'empty-state' }, 'Post not found.');

  return ce('div', { className:'d-flex flex-column h-100' },

    // header
    ce('div', { className:'p-3 border-bottom d-flex align-items-start gap-2' },
      ce('button', {
        className:'btn btn-sm btn-ghost-secondary',
        onClick: () => onNav('feed', post.parent),
      }, '←'),
      ce('div', { className:'flex-grow-1' },
        ce('h5', { className:'mb-1' }, post.title),
        ce('div', { className:'d-flex gap-2 align-items-center flex-wrap', style:{fontSize:'.78rem', color:'#64748b'} },
          ce(StatusBadge, { status: post._docstatus }),
          ce('span', {}, post.author_name || 'Unknown'),
          ce('span', {}, timeAgo(post.created)),
          post.tags && ce('span', { className:'text-primary' },
            post.tags.split(',').map(t => `#${t.trim()}`).join(' ')
          )
        )
      ),
      // FSM action buttons (owner only)
      isOwner && ce('div', { className:'d-flex gap-1 flex-shrink-0' },
        post._docstatus === 0 && ce('button', {
          className:'btn btn-sm btn-success', disabled: saving,
          onClick: onPublish,
        }, 'Publish'),
        post._docstatus === 1 && ce('button', {
          className:'btn btn-sm btn-warning', disabled: saving,
          onClick: onArchive,
        }, 'Archive'),
        post._docstatus === 0 && ce('button', {
          className:'btn btn-sm btn-ghost-secondary', disabled: saving,
          onClick: onStartEdit,
        }, 'Edit'),
      )
    ),

    // body — editor (editing) or renderer (reading)
    ce('div', { className:'post-body-area' },
      editing
        ? ce('div', {},
            ce('input', {
              className: 'form-control mb-3',
              value: editTitle,
              onChange: e => setEditTitle(e.target.value),
              placeholder: 'Title',
            }),
            ce(BlockNoteEditor, {
              containerId: `bn-edit-${postName}`,
              initialContent: editBody,
              recordId: postName,
              onChange: json => setEditBody(json),
            }),
            ce('div', { className:'d-flex gap-2 mt-3' },
              ce('button', { className:'btn btn-primary', disabled:saving, onClick:onSaveEdit },
                saving ? 'Saving…' : 'Save'),
              ce('button', { className:'btn btn-ghost-secondary', onClick:()=>setEditing(false) }, 'Cancel'),
            )
          )
        : ce(BlockNoteRenderer, {
            containerId: `bn-view-${postName}`,
            content: post.body,
            recordId: postName,
          })
    ),

    // comments
    ce(CommentThread, { postName, channelOwner: post.channel_owner || post.owner })
  );
};

// ============================================================
// NEW POST EDITOR
// ============================================================
const NewPostEditor = function({ channelName, onNav }) {
  const [title,    setTitle]    = React.useState('');
  const [body,     setBody]     = React.useState('[]');
  const [postName, setPostName] = React.useState(null); // set after draft create
  const [saving,   setSaving]   = React.useState(false);
  const [error,    setError]    = React.useState('');

  // Create draft record on title blur so images have a recordId
  const ensureDraft = async () => {
    if (postName || !title.trim()) return;
    const r = await cwRun({
      operation: 'create', target_doctype: 'Post',
      input: {
        title: title.trim(),
        body: '[]',
        parent: channelName,
        author_name: uname(),
        owner: uid(),
        _docstatus: 0,
      },
    });
    if (r.success) setPostName(r.target.data.name);
  };

  const onPublish = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');

    if (postName) {
      // draft exists — update body + publish
      await cwRun({
        operation: 'update', target_doctype: 'Post',
        query: { where: { name: postName } },
        input: { title: title.trim(), body, _docstatus: 1 },
      });
    } else {
      // no draft — create + publish in one shot
      await cwRun({
        operation: 'create', target_doctype: 'Post',
        input: {
          title: title.trim(), body,
          parent: channelName,
          author_name: uname(),
          owner: uid(),
          _docstatus: 1,
        },
      });
    }

    setSaving(false);
    onNav('feed', channelName);
  };

  const onSaveDraft = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (postName) {
      await cwRun({
        operation: 'update', target_doctype: 'Post',
        query: { where: { name: postName } },
        input: { title: title.trim(), body },
      });
    } else {
      await ensureDraft();
    }
    setSaving(false);
  };

  return ce('div', { className:'p-3 d-flex flex-column gap-3', style:{ overflowY:'auto', flex:1 } },

    ce('div', { className:'d-flex align-items-center gap-2 mb-1' },
      ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick:()=>onNav('feed',channelName) }, '←'),
      ce('h5', { className:'mb-0' }, 'New Post'),
    ),

    // title
    ce('input', {
      className: 'form-control form-control-lg',
      placeholder: 'Post title…',
      value: title,
      onChange: e => { setTitle(e.target.value); setError(''); },
      onBlur: ensureDraft,
    }),

    error && ce('div', { className:'alert alert-danger py-2' }, error),

    // BlockNote editor
    // postName is passed so image uploads have a target record
    ce(BlockNoteEditor, {
      containerId: 'bn-new-post',
      initialContent: null,
      recordId: postName,   // null until draft exists — editor shows placeholder upload msg
      onChange: json => setBody(json),
    }),

    // action buttons
    ce('div', { className:'d-flex gap-2' },
      ce('button', {
        className: 'btn btn-primary',
        disabled: saving || !title.trim(),
        onClick: onPublish,
      }, saving ? 'Publishing…' : 'Publish'),
      ce('button', {
        className: 'btn btn-ghost-secondary',
        disabled: saving || !title.trim(),
        onClick: onSaveDraft,
      }, 'Save draft'),
      ce('button', {
        className: 'btn btn-link text-secondary',
        onClick: () => onNav('feed', channelName),
      }, 'Cancel'),
    )
  );
};

// ============================================================
// CHANNEL FEED — post list
// ============================================================
const ChannelFeed = function({ channelName, onNav }) {
  const [channel, setChannel] = React.useState(null);
  const [posts,   setPosts]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [chR, postsR] = await Promise.all([
      loadDoc('Channel', channelName),
      cwRun({
        operation: 'select', target_doctype: 'Post',
        query: { where: { parent: channelName }, sort: '-created' },
      }),
    ]);
    if (chR.success)    setChannel(chR.target.data);
    if (postsR.success) setPosts(postsR.target.data || []);
    setLoading(false);
  }, [channelName]);

  React.useEffect(() => { load(); }, [channelName]);

  const isOwner = channel?.owner === uid();

  // non-owners only see published posts
  const visible = isOwner
    ? posts
    : posts.filter(p => p._docstatus === 1);

  if (loading) return ce('div', { className:'empty-state' }, 'Loading…');

  return ce('div', { className:'d-flex flex-column h-100' },

    // channel header
    ce('div', { className:'p-3 border-bottom' },
      ce('div', { className:'d-flex align-items-center justify-content-between' },
        ce('div', {},
          ce('h5', { className:'mb-0' }, channel?.title || channelName),
          channel?.description &&
            ce('p', { className:'text-muted mb-0', style:{fontSize:'.82rem'} }, channel.description),
        ),
        isOwner && ce('button', {
          className: 'btn btn-sm btn-primary',
          onClick: () => onNav('new-post', channelName),
        }, '+ New Post'),
      )
    ),

    // post list
    ce('div', { style:{ overflowY:'auto', flex:1 } },
      visible.length === 0
        ? ce('div', { className:'empty-state' },
            isOwner ? 'No posts yet. Create your first post!' : 'No posts published yet.'
          )
        : visible.map(p =>
            ce('div', {
              key: p.name,
              className: 'post-item',
              onClick: () => onNav('post', p.name),
            },
              ce('div', { className:'d-flex align-items-start gap-2' },
                ce('div', { className:'flex-grow-1' },
                  ce('div', { className:'d-flex align-items-center gap-2 mb-1' },
                    ce('strong', { style:{fontSize:'.95rem'} }, p.title),
                    isOwner && ce(StatusBadge, { status: p._docstatus }),
                  ),
                  ce('p', {
                    className:'text-muted mb-1',
                    style:{fontSize:'.8rem', lineHeight:1.4},
                  }, blockPreview(p.body)),
                  ce('div', { className:'d-flex gap-2', style:{fontSize:'.72rem',color:'#94a3b8'} },
                    ce('span', {}, p.author_name || 'Unknown'),
                    ce('span', {}, timeAgo(p.created)),
                    p.tags && ce('span', { className:'text-primary' },
                      p.tags.split(',').map(t=>`#${t.trim()}`).join(' ')
                    )
                  )
                ),
                ce('span', { className:'text-muted', style:{fontSize:'.9rem'} }, '›')
              )
            )
          )
    )
  );
};

// ============================================================
// CHANNEL LIST
// ============================================================
const ChannelList = function({ onNav, activeChannel }) {
  const [channels, setChannels] = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    cwRun({
      operation: 'select', target_doctype: 'Channel',
      query: { where: { _docstatus: 0 }, sort: 'title' },
    }).then(r => {
      if (r.success) setChannels(r.target.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return ce('div', { className:'empty-state', style:{fontSize:'.85rem'} }, 'Loading…');

  return ce('div', { className:'d-flex flex-column h-100' },

    ce('div', { className:'p-3 border-bottom' },
      ce('h6', { className:'mb-0 fw-bold' }, 'Channels')
    ),

    ce('div', { style:{ overflowY:'auto', flex:1 } },
      channels.length === 0
        ? ce('div', { className:'empty-state', style:{fontSize:'.85rem'} }, 'No channels found.')
        : channels.map(ch =>
            ce('div', {
              key: ch.name,
              className: `channel-item ${ch.name === activeChannel ? 'active' : ''}`,
              onClick: () => onNav('feed', ch.name),
            },
              ce('div', { className:'d-flex align-items-center gap-2' },
                ce(Avatar, { name: ch.title }),
                ce('div', { className:'flex-grow-1 overflow-hidden' },
                  ce('div', { className:'fw-semibold', style:{fontSize:'.9rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'} },
                    ch.title),
                  ch.description &&
                    ce('div', { className:'text-muted', style:{fontSize:'.75rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'} },
                      ch.description)
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
  const [view,    setView]    = React.useState('channels');
  const [channel, setChannel] = React.useState(null);
  const [post,    setPost]    = React.useState(null);

  const onNav = (v, param) => {
    setView(v);
    if (v === 'feed' || v === 'new-post') { setChannel(param); setPost(null); }
    if (v === 'post')                     { setPost(param); }
    if (v === 'channels')                 { setChannel(null); setPost(null); }

    // update topbar label
    const el = document.getElementById('topbar-channel-name');
    if (el) el.textContent = v === 'channels' ? 'Channels' : (param || 'Channels');
  };

  const rightContent = () => {
    if (view === 'post'     && post)    return ce(PostDetail,    { postName: post,    onNav });
    if (view === 'new-post' && channel) return ce(NewPostEditor, { channelName: channel, onNav });
    if (view === 'feed'     && channel) return ce(ChannelFeed,   { channelName: channel, onNav });
    return ce('div', { className:'empty-state' },
      view === 'channels' ? 'Select a channel →' : 'Select a post to read'
    );
  };

  return ce('div', { className:'threads-layout' },

    // left: channel list (always visible on desktop)
    ce('div', { className:'threads-left' },
      ce(ChannelList, { onNav, activeChannel: channel })
    ),

    // right: feed / post / editor
    ce('div', { className:'threads-right' },
      view === 'feed' && channel
        ? ce(ChannelFeed, { channelName: channel, onNav })
        : view === 'post' && post
          ? ce(PostDetail,  { postName: post, onNav })
          : view === 'new-post' && channel
            ? ce(NewPostEditor, { channelName: channel, onNav })
            : ce('div', { className:'empty-state' }, 'Select a channel to start')
    )
  );
};

// ── mount ─────────────────────────────────────────────────────
const _container = document.getElementById('threads-app');
if (_container) {
  ReactDOM.createRoot(_container).render(ce(ThreadsApp));
  console.log('✅ threads.js mounted');
} else {
  console.error('[threads] No #threads-app element found');
}
