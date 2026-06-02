https://claude.ai/chat/153978d1-4979-453f-9919-6814548d48b1


Good question. Key patterns worth stealing:

1. Aider's dirty-file isolation
Aider commits dirty files before touching them so its changes are always in a clean diff. You already have this in step 1. The refinement aider adds — it uses a separate commit message prefix so you can filter its commits:
aider: pre-job snapshot
aider: shrink jpgs > 100KB
Queryable: git log --grep="aider:" shows only agent commits.

2. Cursor/Copilot — checkpoint commits
They commit at each meaningful sub-step, not just before/after. So if a job processes 50 files and fails at file 30, you have a checkpoint at file 20 to roll back to. Your current pattern is one commit per full job — fine for small jobs, risky for long ones.
js// commit every N files as checkpoint
if (found % 10 === 0) {
  await git.add({ fs, dir, filepath: '.' })
  await git.commit({ ...author, message: `checkpoint: ${found} files processed` })
}

3. Claude Code — structured commit messages
Claude Code uses conventional commits format:
feat(images): shrink jpgs to <100KB
fix(events): recompress oversized event photos  
chore(assets): batch optimize 11 images
Gives you free changelog generation later: git log --pretty="%s" | grep "^feat".

4. Devin — branch per task
Devin creates a new branch for each job, does all work there, then merges. Safe because main is never touched mid-job:
jsawait git.branch({ fs, dir, ref: 'job/shrink-images', checkout: true })
// ... do work ...
await git.merge({ fs, dir, theirs: 'job/shrink-images' })
await git.deleteBranch({ fs, dir, ref: 'job/shrink-images' })
Overkill for single-file jobs but good for multi-step destructive operations.

5. GitHub Copilot Workspace — intent in commit
They log the original prompt/intent as the commit body, not just the first line:
script: shrink jpgs > 100KB

intent: reduce page load time for nesen.org
files:  11 JPGs processed
before: 4.5MB total
after:  1.0MB total
tool:   OffscreenCanvas quality reduction
git log --format="%B" gives you a full audit trail of what you wanted vs what happened.

6. What none of them do well — rollback UX
They all commit but none give you a clean "undo last job" button. Easy to add:
js// undo last job — reset to pre-job commit
const log = await git.log({ fs, dir, depth: 2 })
const preJobSha = log[1].oid  // commit before last
await git.checkout({ fs, dir, ref: preJobSha, force: true })
That's genuinely useful for your image processing case — if a shrink went too aggressive, one click restores all originals.

The biggest practical upgrade for your runner would be #5 + rollback — richer commit body with before/after stats, and an undo button that resets to the pre-job commit.