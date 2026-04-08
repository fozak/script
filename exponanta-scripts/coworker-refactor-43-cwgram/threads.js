// ============================================================
// threads.js — Channels UI — Tabler Chat UI
// Requires: CW.run, CW.Schema, pb adapter, marked.js, React 18
// Zero functional changes from previous version — UI only
// ============================================================

const ce  = React.createElement;
const CW  = globalThis.CW;

marked.setOptions({ breaks: true, gfm: true });

const md    = (text) => ({ __html: marked.parse(text || '') });
const uid   = () => globalThis.pb?.authStore?.model?.id || null;
const uname = () => globalThis.pb?.authStore?.model?.name
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

const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

// avatar color from string hash
const avatarColor = (str) => {
  const colors = ['#206bc4','#2fb344','#f76707','#e03131','#7048e8','#0ca678','#d6336c','#1098ad'];
  let h = 0; for (const c of (str||'')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
};

// ── helpers ───────────────────────────────────────────────────

const fireSignal = async (run_doc, key) => {
  run_doc.input._state = { [key]: '' };
  await CW.controller(run_doc);
  return run_doc;
};

const loadRecord = async (doctype, name, view = 'form') =>
  CW.run({ operation:'select', target_doctype:doctype,
    query:{ where:{ name }, view }, options:{ render:false } });

// ── Avatar component ─────────────────────────────────────────
const Avatar = ({ name, size = 'avatar-md' }) =>
  ce('span', {
    className: `avatar ${size}`,
    style: { background: avatarColor(name), color: '#fff', fontWeight: 600, fontSize: '.75rem' }
  }, initials(name));

// ============================================================
// MARKDOWN EDITOR  — unchanged logic, Tabler form styling
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
    ce('div', { className: 'd-flex gap-1 mb-1' },
      ce('button', { type:'button', className:'btn btn-sm btn-ghost-secondary px-2', onClick:()=>wrap('**','**') },
        ce('strong', {}, 'B')),
      ce('button', { type:'button', className:'btn btn-sm btn-ghost-secondary px-2', style:{fontStyle:'italic'}, onClick:()=>wrap('_','_') }, 'I'),
      ce('button', { type:'button', className:'btn btn-sm btn-ghost-secondary px-2', onClick:()=>wrap('`','`') }, '</>'),
      ce('button', { type:'button', className:'btn btn-sm btn-ghost-secondary px-2', onClick: quote }, '❝'),
      ce('button', { type:'button', className:'btn btn-sm btn-ghost-secondary px-2', onClick:()=>wrap('\n```\n','\n```') }, '▤'),
      ce('span', { className:'ms-auto text-secondary', style:{fontSize:'.72rem',alignSelf:'center'} }, 'Markdown')
    ),
    ce('textarea', {
      ref,
      className: 'form-control',
      style: { fontFamily: 'monospace', fontSize: '.875rem' },
      rows: rows || 6,
      value,
      placeholder: placeholder || 'Write in markdown...',
      onChange: (e) => onChange(e.target.value),
    })
  );
};

// ============================================================
// COMMENT THREAD  — chat-bubble layout
// ============================================================

const CommentThread = function({ postName, channelOwner }) {
  const [comments, setComments]  = React.useState([]);
  const [body, setBody]          = React.useState('');
  const [submitting, setSubmit]  = React.useState(false);
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
    setBody('');
    setSubmit(false);
    await load();
  };

  const onModerate = async (comment, toState) => {
    const r = await loadRecord('Comment', comment.name);
    if (r.error || !r.target?.data?.[0]) return;
    await fireSignal(r, `${comment.docstatus}_${toState}`);
    await load();
  };

  const visible = showHidden ? comments : comments.filter(c => c.docstatus !== 2);
  const hiddenN = comments.filter(c => c.docstatus === 2).length;

  // moderate button strip — owner only
  const ModBtns = ({ c }) => !isOwner ? null : ce('div', { className:'d-flex gap-1 mt-1' },
    c.docstatus === 0 && ce('button', {
      className:'btn btn-xs btn-ghost-warning', style:{padding:'1px 5px',fontSize:'.68rem'},
      onClick:()=>onModerate(c,1), title:'Flag'
    }, '⚑'),
    (c.docstatus === 0 || c.docstatus === 1) && ce('button', {
      className:'btn btn-xs btn-ghost-danger', style:{padding:'1px 5px',fontSize:'.68rem'},
      onClick:()=>onModerate(c,2), title:'Hide'
    }, '🚫'),
    c.docstatus === 1 && ce('button', {
      className:'btn btn-xs btn-ghost-secondary', style:{padding:'1px 5px',fontSize:'.68rem'},
      onClick:()=>onModerate(c,0), title:'Dismiss flag'
    }, '✓'),
    c.docstatus === 2 && ce('button', {
      className:'btn btn-xs btn-ghost-success', style:{padding:'1px 5px',fontSize:'.68rem'},
      onClick:()=>onModerate(c,0), title:'Unhide'
    }, '↩')
  );

  const stateLabel = { 1: ce('span',{className:'badge bg-warning-lt text-warning ms-1',style:{fontSize:'.65rem'}},'Flagged'),
                       2: ce('span',{className:'badge bg-danger-lt text-danger ms-1',style:{fontSize:'.65rem'}},'Hidden') };

  return ce('div', {},

    // header
    ce('div', { className:'d-flex justify-content-between align-items-center mb-2' },
      ce('h5', { className:'mb-0 text-secondary', style:{fontSize:'.875rem',fontWeight:600} },
        `💬 ${visible.filter(c=>c.docstatus!==2).length + (showHidden ? hiddenN : 0)} comments`),
      hiddenN > 0 && isOwner && ce('button', {
        className:'btn btn-sm btn-ghost-secondary',
        onClick:()=>setShowHid(v=>!v),
      }, showHidden ? 'Hide moderated' : `${hiddenN} hidden`)
    ),

    // chat bubbles
    ce('div', { className:'chat' },
      ce('div', { className:'chat-bubbles' },

        visible.length === 0 && ce('div', { className:'text-center text-secondary py-3', style:{fontSize:'.875rem'} },
          'No comments yet — be the first!'),

        visible.map(c => {
          const isMe = c.owner === uid();
          const dimmed = c.docstatus === 2 ? { opacity:.6 } : {};

          return ce('div', { key:c.name, className:'chat-item' },
            // Tabler: me = justify-content-end row, other = normal row
            ce('div', { className:`row align-items-end ${isMe ? 'justify-content-end' : ''}` },
              // avatar left (for others)
              !isMe && ce('div', { className:'col-auto' }, ce(Avatar, { name:c.author_name, size:'avatar-sm' })),

              // bubble
              ce('div', { className:'col col-lg-8' },
                ce('div', { className:`chat-bubble ${isMe ? 'chat-bubble-me' : ''}`, style:dimmed },
                  ce('div', { className:'chat-bubble-title' },
                    ce('div', { className:'row' },
                      ce('div', { className:'col chat-bubble-author d-flex align-items-center gap-1' },
                        c.author_name || 'User',
                        stateLabel[c.docstatus]
                      ),
                      ce('div', { className:'col-auto chat-bubble-date' }, timeAgo(c.created))
                    )
                  ),
                  ce('div', { className:'chat-bubble-body' },
                    ce('p', { className:'mb-0', style:{color: c.docstatus===2?'var(--tblr-danger)':'inherit'} }, c.body)
                  ),
                  ce(ModBtns, { c })
                )
              ),

              // avatar right (for me)
              isMe && ce('div', { className:'col-auto' }, ce(Avatar, { name:c.author_name, size:'avatar-sm' }))
            )
          );
        })
      )
    ),

    // comment input
    uid()
      ? ce('div', { className:'mt-3' },
          ce('div', { className:'input-group' },
            ce('textarea', {
              className:'form-control', rows:2,
              placeholder:'Add a comment... (Ctrl+Enter to post)',
              value: body,
              onChange:(e)=>setBody(e.target.value),
              onKeyDown:(e)=>{ if(e.ctrlKey && e.key==='Enter') onPost(); },
              style:{ resize:'none' }
            }),
            ce('button', {
              className:'btn btn-primary',
              disabled: !body.trim() || submitting,
              onClick: onPost,
            }, submitting ? '…' : 'Post')
          )
        )
      : ce('div', { className:'alert alert-info mt-3 py-2 mb-0', style:{fontSize:'.875rem'} }, 'Sign in to comment.')
  );
};

// ============================================================
// POST DETAIL — chat layout: post as large bubble, comments below
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
      setPost(p); setET(p.title||''); setEB(p.body||''); setETags(p.tags||'');
    }
  }, [postName]);

  React.useEffect(() => { load(); }, [postName]);

  const onSignal = async (key) => {
    const r = await loadRecord('Post', postName);
    if (!r.error) { await fireSignal(r, key); await load(); }
  };

  const onSave = async () => {
    setSaving(true);
    const r = await loadRecord('Post', postName);
    if (!r.error) { r.input.title=editTitle; r.input.body=editBody; r.input.tags=editTags; await CW.controller(r); }
    setSaving(false); setEditing(false); await load();
  };

  if (!post) return ce('div', { className:'text-center py-5' }, ce('div', { className:'spinner-border text-primary' }));

  const isOwner    = post.owner === uid();
  const isDraft    = post.docstatus === 0;
  const stateLabel = ['Draft','Published','Archived'];
  const stateCls   = ['bg-warning-lt text-warning','bg-success-lt text-success','bg-secondary-lt text-secondary'];
  const tags       = parseTags(post.tags);

  const stateDef = CW._getStateDef?.('Post');
  const dim0     = stateDef?.['0'];
  const current  = post._state?.['0'] ?? post.docstatus ?? 0;
  const fsmBtns  = isOwner && dim0
    ? (dim0.transitions?.[String(current)]||[]).map(to=>({ key:`${current}_${to}`, label:dim0.labels?.[`${current}_${to}`]||`${current}_${to}` }))
    : [];

  return ce('div', { className:'d-flex flex-column h-100' },

    // subheader breadcrumb
    ce('div', { className:'card-header' },
      ce('div', { className:'d-flex align-items-center gap-2 w-100' },
        ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick:()=>onNav('feed', post.parent) }, '←'),
        ce('div', { className:'flex-fill' },
          ce('span', { className:'text-secondary', style:{fontSize:'.8rem'} },
            ce('a', { className:'text-secondary', style:{cursor:'pointer'}, onClick:()=>onNav('channels') }, 'Channels'),
            ' › ',
            ce('a', { className:'text-secondary', style:{cursor:'pointer'}, onClick:()=>onNav('feed',post.parent) }, post.parent)
          ),
          ce('div', { className:'fw-medium' }, post.title)
        ),
        // status badge
        ce('span', { className:`badge ${stateCls[post.docstatus]} me-2` }, stateLabel[post.docstatus]),
        // FSM + edit buttons (owner only)
        isOwner && ce('div', { className:'d-flex gap-1' },
          fsmBtns.map(btn => ce('button', {
            key:btn.key,
            className: (btn.label==='Delete'||btn.label==='Archive') ? 'btn btn-sm btn-ghost-danger' : 'btn btn-sm btn-ghost-success',
            onClick:()=>onSignal(btn.key),
          }, btn.label)),
          !editing && ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick:()=>setEditing(true) }, '✎'),
          editing && ce('button', { className:'btn btn-sm btn-primary', disabled:saving, onClick:onSave }, saving?'…':'Save'),
          editing && ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick:()=>setEditing(false) }, '✕')
        )
      )
    ),

    // scrollable body
    ce('div', { className:'card-body scrollable', style:{overflowY:'auto'} },

      // post body — rendered as large chat bubble from channel owner
      ce('div', { className:'chat mb-4' },
        ce('div', { className:'chat-bubbles' },
          ce('div', { className:'chat-item' },
            ce('div', { className:'row align-items-start' },
              ce('div', { className:'col-auto' }, ce(Avatar, { name: post.author_name })),
              ce('div', { className:'col' },
                ce('div', { className:`chat-bubble ${isDraft ? 'border border-warning' : ''}` },
                  ce('div', { className:'chat-bubble-title' },
                    ce('div', { className:'row' },
                      ce('div', { className:'col chat-bubble-author' }, post.author_name || 'Unknown'),
                      ce('div', { className:'col-auto chat-bubble-date' }, timeAgo(post.created))
                    )
                  ),
                  ce('div', { className:'chat-bubble-body' },
                    editing
                      ? ce('div', {},
                          ce('input', { className:'form-control form-control-sm fw-bold mb-2',
                            value:editTitle, onChange:(e)=>setET(e.target.value) }),
                          ce(MarkdownEditor, { value:editBody, onChange:setEB, rows:12 }),
                          ce('input', { className:'form-control form-control-sm mt-2',
                            placeholder:'Tags (comma separated)', value:editTags, onChange:(e)=>setETags(e.target.value) })
                        )
                      : ce('div', {},
                          ce('h4', { className:'mb-3' }, post.title),
                          ce('div', { className:'post-body', dangerouslySetInnerHTML:md(post.body) }),
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

      // divider
      ce('div', { className:'hr-text hr-text-center text-secondary mb-3', style:{fontSize:'.8rem'} }, 'Comments'),

      // comments
      ce(CommentThread, { postName:post.name, channelOwner:post.owner })
    )
  );
};

// ============================================================
// CHANNEL FEED — left panel list item pattern
// ============================================================

const ChannelFeed = function({ channelName, onNav, selectedPost, setSelectedPost }) {
  const [channel, setCh]  = React.useState(null);
  const [posts, setPosts] = React.useState([]);

  const load = React.useCallback(async () => {
    const [cr, pr] = await Promise.all([
      CW.run({ operation:'select', target_doctype:'Channel', query:{ where:{ name:channelName } }, options:{ render:false } }),
      CW.run({ operation:'select', target_doctype:'Post',    query:{ where:{ parent:channelName } }, options:{ render:false } }),
    ]);
    if (cr.success) setCh(cr.target.data[0]);
    if (pr.success) setPosts([...pr.target.data].sort((a,b) => new Date(b.created)-new Date(a.created)));
  }, [channelName]);

  React.useEffect(() => { load(); }, [channelName]);

  if (!channel) return ce('div', { className:'text-center py-4' }, ce('div', { className:'spinner-border spinner-border-sm text-primary' }));

  const isOwner = channel.owner === uid();
  const visible = isOwner ? posts : posts.filter(p => p.docstatus === 1);

  return ce('div', { className:'d-flex flex-column h-100' },

    // channel header in left panel
    ce('div', { className:'card-header' },
      ce('div', { className:'d-flex align-items-center gap-2 w-100' },
        ce('button', { className:'btn btn-sm btn-ghost-secondary', onClick:()=>onNav('channels') }, '←'),
        ce('div', { className:'flex-fill' },
          ce('span', { className:'fw-semibold' }, channel.title),
          ce('div', { className:'text-secondary', style:{fontSize:'.75rem'} }, channel.description || '')
        ),
        isOwner && ce('button', { className:'btn btn-sm btn-primary', onClick:()=>onNav('new-post', channelName) }, '+')
      )
    ),

    // post list as nav pills
    ce('div', { className:'card-body p-0 scrollable flex-fill', style:{overflowY:'auto'} },
      visible.length === 0
        ? ce('div', { className:'text-center text-secondary p-4', style:{fontSize:'.875rem'} },
            isOwner ? 'No posts yet.' : 'No posts published yet.')
        : ce('div', { className:'nav flex-column nav-pills', role:'tablist' },
            visible.map(post => {
              const excerpt = (post.body||'').replace(/[#*`>_~\[\]]/g,'').slice(0,60);
              const isActive = selectedPost === post.name;
              const isDraft  = post.docstatus === 0;

              return ce('a', {
                key: post.name,
                className: `nav-link text-start mw-100 p-3 ${isActive ? 'active' : ''}`,
                style:{ cursor:'pointer', borderRadius:0 },
                onClick: () => setSelectedPost(post.name),
              },
                ce('div', { className:'row align-items-center flex-fill g-2' },
                  ce('div', { className:'col-auto' },
                    ce(Avatar, { name: post.author_name })
                  ),
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
// CHANNEL LIST — left panel, nav pills
// ============================================================

const ChannelList = function({ selectedChannel, setSelectedChannel }) {
  const [channels, setCh]   = React.useState([]);
  const [loading, setLoad]  = React.useState(true);

  React.useEffect(() => {
    CW.run({ operation:'select', target_doctype:'Channel', query:{}, options:{ render:false } })
      .then(r => { if (r.success) setCh(r.target.data); setLoad(false); });
  }, []);

  if (loading) return ce('div', { className:'text-center py-4' }, ce('div', { className:'spinner-border spinner-border-sm text-primary' }));

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
                key: ch.name,
                className: `nav-link text-start mw-100 p-3 ${selectedChannel===ch.name?'active':''}`,
                style:{ cursor:'pointer', borderRadius:0 },
                onClick: () => setSelectedChannel(ch.name),
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
// NEW POST EDITOR — right panel card
// ============================================================

const NewPostEditor = function({ channelName, onNav }) {
  const [title, setTitle]    = React.useState('');
  const [body,  setBody]     = React.useState('');
  const [tags,  setTags]     = React.useState('');
  const [publishNow, setPub] = React.useState(false);
  const [saving, setSaving]  = React.useState(false);
  const [error, setError]    = React.useState(null);

  const onSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null); setSaving(true);
    const r = await CW.run({
      operation:'create', target_doctype:'Post',
      input:{ title:title.trim(), body, tags, parent:channelName, author_name:uname(), owner:uid() },
      options:{ render:false },
    });
    if (r.error) { setError(r.error?.message||r.error); setSaving(false); return; }
    if (publishNow && r.target?.data?.[0]?.name) await fireSignal(r, '0_1');
    setSaving(false);
    if (r.target?.data?.[0]?.name) onNav('post', r.target.data[0].name);
  };

  return ce('div', { className:'d-flex flex-column h-100' },
    ce('div', { className:'card-header' },
      ce('button', { className:'btn btn-sm btn-ghost-secondary me-2', onClick:()=>onNav('feed', channelName) }, '←'),
      ce('span', { className:'fw-semibold' }, 'New Post')
    ),
    ce('div', { className:'card-body scrollable', style:{overflowY:'auto'} },
      error && ce('div', { className:'alert alert-danger py-2 mb-3', style:{fontSize:'.875rem'} }, error),
      ce('div', { className:'mb-3' },
        ce('label', { className:'form-label' }, 'Title'),
        ce('input', { className:'form-control form-control-lg', placeholder:'Post title...', value:title, onChange:(e)=>setTitle(e.target.value) })
      ),
      ce('div', { className:'mb-3' },
        ce('label', { className:'form-label' }, 'Body'),
        ce(MarkdownEditor, { value:body, onChange:setBody, rows:14, placeholder:'# Your post\n\nWrite in **markdown**...' })
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
        ce('button', { className:'btn btn-outline-secondary', onClick:()=>onNav('feed', channelName) }, 'Cancel'),
        ce('button', { className:'btn btn-primary', disabled:!title.trim()||saving, onClick:onSave },
          saving ? '…' : (publishNow ? '↑ Publish' : 'Save Draft'))
      )
    )
  );
};

// ============================================================
// APP ROOT — Tabler two-column chat layout
// Left: channel list → post list
// Right: post detail → new post editor
// ============================================================

const ThreadsApp = function() {
  const [view, setView]               = React.useState('channels');  // channels | feed | post | new-post
  const [selectedChannel, setSelChan] = React.useState(null);
  const [selectedPost, setSelPost]    = React.useState(null);

  const onNav = (v, p) => {
    setView(v);
    if (v === 'channels')  { setSelChan(null); setSelPost(null); }
    if (v === 'feed')      { setSelChan(p);    setSelPost(null); }
    if (v === 'post')      { setSelPost(p); }
    if (v === 'new-post')  { setSelChan(p||selectedChannel); setSelPost(null); }
  };

  // left panel content
  const leftPanel = () => {
    if (view === 'channels') {
      return ce(ChannelList, {
        selectedChannel,
        setSelectedChannel: (name) => { setSelChan(name); setView('feed'); setSelPost(null); },
      });
    }
    // feed, post, new-post — show post list for current channel
    if (selectedChannel) {
      return ce(ChannelFeed, {
        channelName: selectedChannel,
        onNav,
        selectedPost,
        setSelectedPost: (name) => { setSelPost(name); setView('post'); },
      });
    }
    return null;
  };

  // right panel content
  const rightPanel = () => {
    if (view === 'channels' || (view === 'feed' && !selectedPost)) {
      return ce('div', { className:'d-flex flex-column align-items-center justify-content-center h-100 text-secondary' },
        ce('div', { style:{fontSize:'3rem'} }, '📢'),
        ce('div', { className:'mt-2', style:{fontSize:'.875rem'} },
          view === 'channels' ? 'Select a channel to browse posts' : 'Select a post to read'
        )
      );
    }
    if (view === 'post' && selectedPost) {
      return ce(PostDetail, { postName:selectedPost, onNav });
    }
    if (view === 'new-post') {
      return ce(NewPostEditor, { channelName:selectedChannel, onNav });
    }
    return null;
  };

  return ce('div', { className:'row g-0 h-100' },
    // left column — channel/post list
    ce('div', { className:'col-12 col-lg-5 col-xl-3', style:{ borderRight:'1px solid var(--tblr-border-color)' } },
      ce('div', { className:'card card-borderless rounded-0 h-100', style:{border:'none'} },
        leftPanel()
      )
    ),
    // right column — content
    ce('div', { className:'col-12 col-lg-7 col-xl-9 d-flex flex-column' },
      ce('div', { className:'card card-borderless rounded-0 h-100 d-flex flex-column', style:{border:'none'} },
        rightPanel()
      )
    )
  );
};

// ── mount ──────────────────────────────────────────────────────
const container = document.getElementById('threads-app');
if (container) {
  ReactDOM.createRoot(container).render(ce(ThreadsApp));
  console.log('✅ threads.js mounted');
}
