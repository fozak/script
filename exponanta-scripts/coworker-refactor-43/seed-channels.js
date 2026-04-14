// ============================================================
// seed-channels.js — IIFE seeder
// Paste in browser console on any CW page (app.html etc)
// or add as <script type="module" src="seed-channels.js">
// after index.js has booted
// ============================================================

(async () => {

  const run = async (doctype, input) => {
    const r = await CW.run({
      operation: 'create',
      target_doctype: doctype,
      input,
      options: { render: false },
    });
    if (r.error) {
      console.error('✗', doctype, r.error?.message || r.error);
      return null;
    }
    return r;
  };

  const publish = async (r) => {
    if (!r) return;
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    if (r.error) console.error('✗ publish', r.error?.message || r.error);
  };

  const authorName = globalThis.pb?.authStore?.model?.name
    || globalThis.pb?.authStore?.model?.email
    || 'Admin';

  console.log('seeding channels...');

  // ── Channel 1 ───────────────────────────────────────────────
  const ch1 = await run('Channel', {
    title:       'Exponanta Community',
    slug:        'exponanta',
    description: 'Updates and discussions from the Exponanta team.',
    is_public:   1,
    author_name: authorName,
  });
  const ch1Name = ch1?.target?.data?.[0]?.name;
  console.log('+ Channel', ch1Name);

  const p1 = await run('Post', {
    title:       'Welcome to Exponanta Channels',
    body: `## Welcome! 👋

This is the first post in the **Exponanta Community** channel.

Here you will find platform updates, community news, and open discussions.

> "The best communities are built on trust and shared purpose."

Feel free to introduce yourself in the comments!`,
    parent:      ch1Name,
    tags:        'welcome,community',
    author_name: authorName,
  });
  await publish(p1);
  console.log('+ Post (published)', p1?.target?.data?.[0]?.name);

  const p2 = await run('Post', {
    title:       'How Structured Referral Networking Works',
    body: `## The Problem with Traditional Networking

Most networking is transactional. You collect cards, connect on LinkedIn, then nothing happens.

Structured referral networking adds **accountability and intent** to every introduction.

### The Exponanta approach

1. **Define what you need** — be specific
2. **Match with intent** — based on actual need, not keyword overlap
3. **Close the loop** — every referral has a tracked status

Members using structured referrals report **3-5x higher conversion** from introduction to meaningful conversation.`,
    parent:      ch1Name,
    tags:        'networking,referrals,guide',
    author_name: authorName,
  });
  await publish(p2);
  console.log('+ Post (published)', p2?.target?.data?.[0]?.name);

  // ── Channel 2 ───────────────────────────────────────────────
  const ch2 = await run('Channel', {
    title:       'CFE Boston Events',
    slug:        'cfe-events',
    description: 'Events, recaps and announcements from the Center for Entrepreneurship.',
    is_public:   1,
    author_name: authorName,
  });
  const ch2Name = ch2?.target?.data?.[0]?.name;
  console.log('+ Channel', ch2Name);

  const p3 = await run('Post', {
    title:       'ScaleUp Spring 2026 — Applications Open',
    body: `## Apply Now

The CFE ScaleUp program is accepting applications for the **Spring 2026 cohort**.

### What you get

- 9 months of structured mentorship
- Weekly workshops on growth, finance, and operations
- Access to the CFE investor and partner network

### Eligibility

- Revenue-generating business
- Boston/Cambridge area preferred
- Committed founding team

**Applications close March 31, 2026.**

[Apply at cfeglobal.org/scaleup](https://cfeglobal.org/scaleup)`,
    parent:      ch2Name,
    tags:        'scaleup,applications,2026',
    author_name: authorName,
  });
  await publish(p3);
  console.log('+ Post (published)', p3?.target?.data?.[0]?.name);

  const p4 = await run('Post', {
    title:       'CFE at 23 Years — What We Have Learned',
    body: `## From 2002 to Today

The Center for Entrepreneurship was founded in 2002 with a simple mission: help entrepreneurs build real businesses.

### By the numbers (2002-2025)

| Metric | Total |
|--------|-------|
| Events hosted | 8,450+ |
| People reached | 354,000+ |
| Programs delivered | 200+ |

### What has not changed

The core belief that **entrepreneurship is a practice, not a talent**.

### What is next

We are building Exponanta to make the CFE model scalable beyond Boston.`,
    parent:      ch2Name,
    tags:        'cfe,history,boston',
    author_name: authorName,
  });
  await publish(p4);
  console.log('+ Post (published)', p4?.target?.data?.[0]?.name);

  console.log('✅ seed complete —', ch1Name, ch2Name);

})();
