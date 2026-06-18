// ── INIT ─────────────────────────────────────────────────────
const DEEPSEEK_KEY = 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

const nameEl = [...document.querySelectorAll('h2')].find(el => {
  const t = el.textContent.trim()
  const noise = new Set(['Activity','Experience','Education','Skills','Languages','Interests','Ad Options','People you may know','You might like'])
  return t.length > 0 && !noise.has(t) && !t.includes('notifications') && !t.includes('want to see') && !t.includes('(')
})

// ── INPUT ────────────────────────────────────────────────────
const raw   = document.body.innerText
const start = raw.indexOf(nameEl.textContent.trim())
const expAt = raw.indexOf('\nExperience\n', start)
const end   = raw.indexOf('\nSkills (', start)

const header = raw.substring(start, expAt).split('\n')
  .filter(l => {
    const t = l.trim()
    if (!t) return false
    const skip = ['· 1st','· 2nd','· 3rd','Contact info','Message','Sales','Retry','trial','Activity','followers','signals','reposted','reacted','reposts','Like','Show all','Comment','Repost','Send','View 2','1-month','7 days','1/18']
    return !skip.some(n => t.includes(n)) && t !== '·'
  })
  .join('\n')

const clean = header + '\n\n' + raw.substring(expAt, end).trim()

const avatarImg  = [...document.querySelectorAll('img')]
  .find(img => img.srcset?.includes('profile-displayphoto'))
const avatarBlob = await fetch(avatarImg.src).then(r => r.blob())
const avatar_b64 = await new Promise(res => {
  const reader = new FileReader()
  reader.onload = () => res(reader.result.split('base64,')[1])
  reader.readAsDataURL(avatarBlob)
})
const avatar_ext = avatarBlob.type.split('/')[1]

// ── EXECUTE ──────────────────────────────────────────────────
const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + DEEPSEEK_KEY
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    max_tokens: 1000,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: 'You are a data extractor. Return ONLY valid JSON, no markdown, no explanation.'
    }, {
      role: 'user',
      content: `Extract Person data from this LinkedIn profile text.
URL: ${location.href}
Schema: { "slug", "full_name", "first_name", "last_name", "headline", "city", "region", "country", "role", "company", "education", "experience": [{ "title", "company", "start", "end", "location" }], "linkedin" }
Profile text:\n${clean}`
    }]
  })
})

const data   = await res.json()
const person = JSON.parse(data.choices[0].message.content)
person.avatar_b64 = avatar_b64
person.avatar_ext = avatar_ext

// ── EXAMINE ──────────────────────────────────────────────────
console.table({
  slug:     person.slug,
  name:     person.full_name,
  role:     person.role,
  company:  person.company,
  city:     person.city,
  education:person.education
})
console.log('experience:', person.experience)
console.log('avatar:    ', avatar_ext, avatar_b64?.substring(0, 40) + '...')

window._cwPerson = person