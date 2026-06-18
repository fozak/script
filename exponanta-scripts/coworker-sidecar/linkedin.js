// ── INIT ─────────────────────────────────────────────────────
const nameEl = [...document.querySelectorAll('h2')].find(el => {
  const t = el.textContent.trim()
  const noise = new Set(['Activity','Experience','Education','Skills','Languages','Interests','Ad Options','People you may know','You might like'])
  return t.length > 0 && !noise.has(t) && !t.includes('notifications') && !t.includes('want to see') && !t.includes('(')
})

const raw    = document.body.innerText
const start  = raw.indexOf(nameEl.textContent.trim())
const expAt  = raw.indexOf('\nExperience\n', start)
const end    = raw.indexOf('\nSkills (', start)
const header = raw.substring(start, expAt).split('\n')
  .filter(l => l.trim() && !['· 1st','· 2nd','· 3rd','Contact info','Message','Sales','Retry','trial','Activity','followers','signals','reposted','reacted','reposts','Like','Show all','·','1/18'].some(n => l.includes(n)))
  .join('\n')
const clean  = header + '\n\n' + raw.substring(expAt, end).trim()

// ── INPUT ────────────────────────────────────────────────────
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
const res  = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Extract Person data from this LinkedIn profile text.
Return ONLY valid JSON, no markdown, no explanation.
URL: ${location.href}
Schema: { "slug", "full_name", "first_name", "last_name", "headline", "city", "region", "country", "role", "company", "education", "experience": [{ "title", "company", "start", "end", "location" }], "linkedin" }
Profile text:\n${clean}`
    }]
  })
})
const data   = await res.json()
const person = JSON.parse(data.content[0].text)
person.avatar_b64 = avatar_b64
person.avatar_ext = avatar_ext

// ── EXAMINE ──────────────────────────────────────────────────
console.table({ slug: person.slug, name: person.full_name, role: person.role, company: person.company, city: person.city })
console.log('experience:', person.experience)
console.log('avatar:    ', avatar_ext, avatar_b64.substring(0, 40) + '...')
window._cwPerson = person