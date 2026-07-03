# strategic approach v3

┌─────────────────────────────────────────────────────────────────┐
│  CW Notebook                                                    │
└─────────────────────────────────────────────────────────────────┘

┌── INTENT ───────────────────────────────────────────────────────┐
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  extend deadlines for all pending tasks by 30 days     │     │     
│  └────────────────────────────────────────────────────────┘     │
│                                              [▶ figure it out]  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼  AI builds plan
          │
┌── PLAN ─────────────────────────────────────────────────────────┐
│                                                                  │
│  I will:                                                         │
│  1. find all Tasks where status = Pending          (3 found)    │
│  2. add 30 days to exp_end_date on each                         │
│  3. save back to Task                                            │
│                                                                  │
│  Does this look right?                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ ☑ taskx3b  Spread Test Task   exp_end_date 2026-07-31│      │
│  │ ☑ taskx4c  Buy Milk           exp_end_date 2026-08-01│      │
│  │ ☑ taskx5d  Call Client        exp_end_date —         │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  [✎ adjust]          [✔ looks good — show me changes]           │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼  dry run
          │
┌── WHAT WILL CHANGE ─────────────────────────────────────────────┐
│                                                                  │
│  record          field         before       after               │
│  ────────────────────────────────────────────────────────────   │
│  Spread Test..   exp_end_date  2026-07-31   2026-08-30          │
│  Buy Milk        exp_end_date  2026-08-01   2026-08-31          │
│  Call Client     exp_end_date  —            2026-08-02          │
│                                                                  │
│  3 records · 1 field each                                        │
│                                                                  │
│  [✎ adjust]              [✔ run it]                              │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼  execute
          │
┌── DONE ─────────────────────────────────────────────────────────┐
│                                                                  │
│  ✔ 3 records updated · 1 field each · 0.4s                      │
│                                                                  │
│  record          field         before       after               │
│  ────────────────────────────────────────────────────────────   │
│  Spread Test..   exp_end_date  2026-07-31   2026-08-30  ✔       │
│  Buy Milk        exp_end_date  2026-08-01   2026-08-31  ✔       │
│  Call Client     exp_end_date  —            2026-08-02  ✔       │
│                                                                  │
│  [↩ undo all]   [↩ undo selected]   [run again]                 │
│                                                                  │
│  ── saved as ──────────────────────────────────────────────     │
│  "extend-deadlines-pending-tasks"              [reuse] [share]  │
└─────────────────────────────────────────────────────────────────┘


── adjust flow (when user clicks [✎ adjust]) ────────────────────

┌── ADJUST ───────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  extend deadlines for all pending tasks by 30 days     │    │
│  │  but only for tasks assigned to me                     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                              [▶ re-figure it]   │
│                                                                  │
│  or adjust directly:                                             │
│                                                                  │
│  filter    [status = Pending  ×]  [assigned_to = me  ×]  [+]  │
│  action    add 30 days to exp_end_date                          │
│  target    Task                                                  │
└─────────────────────────────────────────────────────────────────┘


── saved notebook (reuse flow) ──────────────────────────────────

┌── MY NOTEBOOKS ─────────────────────────────────────────────────┐
│                                                                  │
│  extend-deadlines-pending-tasks          last run: 2 min ago    │
│  enrich-task-labels                      last run: yesterday    │
│  bulk-assign-project                     never run              │
│                                                                  │
│  [+ new notebook]                                               │
└─────────────────────────────────────────────────────────────────┘





# interesting summary - the markdown ITSELF 

# prototype v2. 

┌─────────────────────────────────────────────────────────────────┐
│  CW Notebook  /  chain-test                          [▶ Run]    │
│  last run: 2 min ago · 3 records · 0.6s                         │
└─────────────────────────────────────────────────────────────────┘

┌── SCOPE ────────────────────────────────────────────────────────┐
│  Target    Task  ·  status = Pending              [edit filter] │

  ┌─────────────────────────────────────────────────────────┐
  │  Write with AI...                               [▶ ]    │
  └─────────────────────────────────────────────────────────┘


│                                                                 │
│  ┌─────────────────────────────────────────────┐               │
│  │ ☑ taskx3b  Spread Test Task   Pending       │               │
│  │ ☑ taskx4c  Buy Milk           Pending       │               │
│  │ ☑ taskx5d  Call Client        Pending       │               │
│  │                                             │               │
│  │ [☑ all]  [☐ none]   3 of 3 selected        │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌── PIPELINE ─────────────────────────────────────────────────────┐
│                                                                  │
│  [1]  select Task          ● done      [↕] [✎] [×]            │
│        status = Pending · 3 records                             │
│        ▼                                                         │
│  [2]  enrich-task          ● done      [↕] [✎] [×]            │
│  ╔══════════════════════════════════════════════════╗           │
│  ║  doc.label = doc.subject.toLowerCase()           ║           │
│  ╚══════════════════════════════════════════════════╝           │
│        ▼                                                         │
│  [3]  add-random-title     ● done      [↕] [✎] [×]            │
│  ╔══════════════════════════════════════════════════╗           │
│  ║  doc.subject = doc.subject + '-' + rand(5)       ║           │
│  ╚══════════════════════════════════════════════════╝           │
│        ▼                                                         │
│  [4]  update Task          ○ pending   [↕] [✎] [×]            │
│        writes: label, subject                                    │
│                                                                  │
│  [+ add cell]                                                    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌── DRY RUN PREVIEW ──────────────────────────────────────── ⚠ ──┐
│  no records written · preview only                               │
│                                                                  │
│  record          field     before              after             │
│  ─────────────────────────────────────────────────────────────  │
│  Spread Test..   label     null            →   spread test task  │
│  Spread Test..   subject   Spread Test..   →   Spread Test-gwpn6│
│  Buy Milk        label     null            →   buy milk          │
│  Buy Milk        subject   Buy Milk        →   Buy Milk-xqe32   │
│  Call Client     label     null            →   call client       │
│  Call Client     subject   Call Client     →   Call Client-abc99 │
│                                                                  │
│  3 records · 2 fields each                                       │
│                                                                  │
│              [cancel]  [✔ confirm & run]                         │
└─────────────────────────────────────────────────────────────────┘


── after run ─────────────────────────────────────────────────────

┌── RESULTS ──────────────────────────────────────────────────────┐
│  ✔ completed · 3 updated · 0 failed · 2 fields · 0.6s           │
│                                                                  │
│  record          field     before              after             │
│  ─────────────────────────────────────────────────────────────  │
│  Spread Test..   label     null            →   spread test task  │
│  Spread Test..   subject   Spread Test..   →   Spread Test-gwpn6│
│  Buy Milk        label     null            →   buy milk          │
│  Buy Milk        subject   Buy Milk        →   Buy Milk-xqe32   │
│  Call Client     label     null            →   call client       │
│  Call Client     subject   Call Client     →   Call Client-abc99 │
│                                                                  │
│  [↩ revert all]  [revert selected]  [view in Task list]         │
└─────────────────────────────────────────────────────────────────┘


── key UX fixes vs previous ──────────────────────────────────────

  SCOPE     user can check/uncheck records before running
            edit filter inline — no need to open Run template

  PIPELINE  each cell is expandable — click to see/edit code
            [↕] reorder  [✎] edit inline  [×] remove
            [+ add cell] adds select, script, or update cell

  GATE      dry run is NOT a separate button
            ▶ Run always shows dry run first
            confirm & run is the only path to execution
            cancel returns to pipeline — no accidental runs

  RESULTS   revert is per-record or all
            view in Task list links to filtered grid

<!---

Three strategic barriers:

1. No way to edit the pipeline without leaving the page
The UI shows the pipeline as read-only cards. User sees enrich-task, add-random-title — but can't click into a cell to see what the script does, edit it, or swap it for another. To change anything they'd need to find the Run record in a separate list, open it, edit the steps JSON manually.
The notebook metaphor promises "I can work here" but delivers "I can only observe here." The gap between observation and authoring kills adoption for non-developers. A Jupyter user expects to click a cell and type.

2. Dry run and Run are disconnected actions — no confirmation gate
Currently:
dry run button → shows panel
run button     → executes immediately
Nothing prevents user from clicking ▶ Run without ever seeing the dry run. And after dry run there's no "looks good → confirm → execute" flow. Two separate buttons with no enforced sequence means the safety net is optional and will be skipped under time pressure.
The strategic issue: dry run provides zero protection if it's not in the execution path.

3. No scope control — user can't answer "which records exactly"
The target shows Task · status = open · 3 records as a static label. User can't:

change the filter before running
exclude specific records
run on a subset (1 of 3, not all 3)

For an office user the most common question before running a bulk operation is "wait, does this include X?" With no way to adjust scope without editing the underlying Run template record, every scope change is a developer task. This makes the notebook a read-only tool for non-technical users rather than a self-service one.
-->

<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CW Notebook</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/css/tabler.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css" />
  <style>
    .pill { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; letter-spacing: .03em; }
    .pill-select { background: rgba(88,166,255,.15); color: #58a6ff; }
    .pill-script { background: rgba(227,160,8,.15); color: #e3a008; }
    .pill-update { background: rgba(64,201,122,.15); color: #40c97a; }
    .pill-records { background: rgba(88,166,255,.15); color: #58a6ff; }
    .will-change { color: #e3a008; font-weight: 600; }
    .from-val { color: var(--tblr-secondary); text-decoration: line-through; font-size: 11px; }
    .to-val { color: #40c97a; font-weight: 600; }
    .section-label { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--tblr-secondary); margin-bottom: 6px; }
    .cell-connector { height: 18px; display: flex; align-items: center; justify-content: center; position: relative; }
    .cell-connector::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--tblr-border-color); }
    .cell-connector i { position: relative; z-index: 1; background: var(--tblr-body-bg); padding: 0 4px; font-size: 13px; color: var(--tblr-secondary); }
    .cell-num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .cell-num-done { background: rgba(64,201,122,.15); color: #40c97a; }
    .cell-num-pending { background: var(--tblr-bg-surface-secondary); color: var(--tblr-secondary); }
    .target-input { background: none; border: none; outline: none; color: var(--tblr-body-color); font-size: 14px; font-weight: 600; flex: 1; }
    .stat-inner { background: var(--tblr-bg-surface-secondary); border-radius: 6px; padding: 10px 14px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 11px; color: var(--tblr-secondary); margin-top: 2px; }
  </style>
</head>
<body class="antialiased">
<div class="page-wrapper">

  <div class="page-header d-print-none">
    <div class="container-xl">
      <div class="row g-2 align-items-center">
        <div class="col">
          <h2 class="page-title">CW Notebook — chain-test</h2>
        </div>
        <div class="col-auto">
          <span class="text-secondary" style="font-size:12px">last run: 2 min ago</span>
        </div>
      </div>
    </div>
  </div>

  <div class="page-body">
    <div class="container-xl">

      <div class="row g-2 mb-3">
        <div class="col-4">
          <div class="card card-sm">
            <div class="card-body">
              <div class="section-label">Concern 1</div>
              <div class="fw-bold" style="font-size:14px">What will change?</div>
              <div class="text-success mt-1" style="font-size:11px"><i class="ti ti-circle-check"></i> dry run mode</div>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card card-sm">
            <div class="card-body">
              <div class="section-label">Concern 2</div>
              <div class="fw-bold" style="font-size:14px">Which records?</div>
              <div class="text-success mt-1" style="font-size:11px"><i class="ti ti-circle-check"></i> live preview</div>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card card-sm">
            <div class="card-body">
              <div class="section-label">Concern 3</div>
              <div class="fw-bold" style="font-size:14px">Did it work?</div>
              <div class="text-success mt-1" style="font-size:11px"><i class="ti ti-circle-check"></i> results summary</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="section-label">Target — concern 2</div>
        <div class="card card-sm">
          <div class="card-body d-flex align-items-center gap-2 py-2">
            <i class="ti ti-database text-secondary"></i>
            <input class="target-input" type="text" value="Task  ·  status = open" readonly />
            <span class="pill pill-records">3 records</span>
            <button class="btn btn-sm" onclick="togglePreview()" style="border-color:var(--tblr-border-color)">
              <i class="ti ti-eye"></i> preview
            </button>
          </div>
        </div>

        <div id="preview-wrap" class="mt-2">
          <div class="card">
            <div class="table-responsive">
              <table class="table table-sm table-vcenter card-table mb-0">
                <thead>
                  <tr>
                    <th class="fw-bold">Name</th>
                    <th class="fw-bold">Subject</th>
                    <th class="fw-bold">Label <span style="color:#e3a008">(will change)</span></th>
                    <th class="fw-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-secondary">taskx3b</td>
                    <td>Spread Test Task</td>
                    <td class="will-change">→ spread test task</td>
                    <td><span class="pill pill-select">open</span></td>
                  </tr>
                  <tr>
                    <td class="text-secondary">taskx4c</td>
                    <td>Buy Milk</td>
                    <td class="will-change">→ buy milk</td>
                    <td><span class="pill pill-select">open</span></td>
                  </tr>
                  <tr>
                    <td class="text-secondary">taskx5d</td>
                    <td>Call Client</td>
                    <td class="will-change">→ call client</td>
                    <td><span class="pill pill-select">open</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="section-label">Pipeline</div>

        <div class="card card-sm">
          <div class="card-body d-flex align-items-center gap-2 py-2">
            <div class="cell-num cell-num-done">1</div>
            <span class="fw-bold" style="flex:1">select Task</span>
            <span class="pill pill-select">select</span>
          </div>
        </div>
        <div class="cell-connector"><i class="ti ti-arrow-down"></i></div>
        <div class="card card-sm">
          <div class="card-body d-flex align-items-center gap-2 py-2">
            <div class="cell-num cell-num-done">2</div>
            <span class="fw-bold" style="flex:1">enrich-task</span>
            <span class="pill pill-script">script</span>
          </div>
        </div>
        <div class="cell-connector"><i class="ti ti-arrow-down"></i></div>
        <div class="card card-sm">
          <div class="card-body d-flex align-items-center gap-2 py-2">
            <div class="cell-num cell-num-done">3</div>
            <span class="fw-bold" style="flex:1">add-random-title</span>
            <span class="pill pill-script">script</span>
          </div>
        </div>
        <div class="cell-connector"><i class="ti ti-arrow-down"></i></div>
        <div class="card card-sm">
          <div class="card-body d-flex align-items-center gap-2 py-2">
            <div class="cell-num cell-num-pending">4</div>
            <span class="fw-bold" style="flex:1">update Task</span>
            <span class="pill pill-update">update</span>
          </div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 mb-3">
        <button class="btn btn-sm btn-outline-warning" onclick="showDryRun()">
          <i class="ti ti-eye"></i> dry run
        </button>
        <button class="btn btn-sm btn-outline-success" onclick="showResults()">
          <i class="ti ti-player-play"></i> ▶ Run
        </button>
      </div>

      <div id="dry-panel" style="display:none" class="mb-3">
        <div class="alert alert-warning d-flex align-items-center gap-2 py-2 mb-2">
          <i class="ti ti-alert-triangle"></i>
          <span style="font-size:13px">dry run — no records will be written. preview only.</span>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title fw-bold">what would change</h3>
            <div class="card-options">
              <span class="text-secondary" style="font-size:11px">3 records · 2 fields each</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-vcenter card-table mb-0">
              <thead>
                <tr>
                  <th class="fw-bold">Record</th>
                  <th class="fw-bold">Field</th>
                  <th class="fw-bold">From</th>
                  <th class="fw-bold">To</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>taskx3b</td><td>label</td><td class="from-val">null</td><td class="to-val">spread test task</td></tr>
                <tr><td>taskx3b</td><td>subject</td><td class="from-val">Spread Test Task</td><td class="to-val">Spread Test Task-gwpn6</td></tr>
                <tr><td>taskx4c</td><td>label</td><td class="from-val">null</td><td class="to-val">buy milk</td></tr>
                <tr><td>taskx4c</td><td>subject</td><td class="from-val">Buy Milk</td><td class="to-val">Buy Milk-xqe32</td></tr>
                <tr><td>taskx5d</td><td>label</td><td class="from-val">null</td><td class="to-val">call client</td></tr>
                <tr><td>taskx5d</td><td>subject</td><td class="from-val">Call Client</td><td class="to-val">Call Client-abc99</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="results-panel" style="display:none" class="mb-3">
        <div class="section-label">Results — concern 3</div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title fw-bold">run completed</h3>
            <div class="card-options">
              <button class="btn btn-sm btn-outline-danger">
                <i class="ti ti-arrow-back-up"></i> revert
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-3">
                <div class="stat-inner">
                  <div class="stat-val text-success">3</div>
                  <div class="stat-lbl">updated</div>
                </div>
              </div>
              <div class="col-3">
                <div class="stat-inner">
                  <div class="stat-val text-danger">0</div>
                  <div class="stat-lbl">failed</div>
                </div>
              </div>
              <div class="col-3">
                <div class="stat-inner">
                  <div class="stat-val text-warning">2</div>
                  <div class="stat-lbl">fields changed</div>
                </div>
              </div>
              <div class="col-3">
                <div class="stat-inner">
                  <div class="stat-val">0.6s</div>
                  <div class="stat-lbl">duration</div>
                </div>
              </div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-vcenter card-table mb-0">
              <thead>
                <tr>
                  <th class="fw-bold">Record</th>
                  <th class="fw-bold">Field</th>
                  <th class="fw-bold">Before</th>
                  <th class="fw-bold">After</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>taskx3b · Spread Test Task</td><td>label</td><td class="from-val">null</td><td class="to-val">spread test task</td></tr>
                <tr><td>taskx3b · Spread Test Task</td><td>subject</td><td class="from-val">Spread Test Task</td><td class="to-val">Spread Test Task-gwpn6</td></tr>
                <tr><td>taskx4c · Buy Milk</td><td>label</td><td class="from-val">null</td><td class="to-val">buy milk</td></tr>
                <tr><td>taskx4c · Buy Milk</td><td>subject</td><td class="from-val">Buy Milk</td><td class="to-val">Buy Milk-xqe32</td></tr>
                <tr><td>taskx5d · Call Client</td><td>label</td><td class="from-val">null</td><td class="to-val">call client</td></tr>
                <tr><td>taskx5d · Call Client</td><td>subject</td><td class="from-val">Call Client</td><td class="to-val">Call Client-abc99</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>

</div>
<script>
function togglePreview() {
  const w = document.getElementById('preview-wrap');
  w.style.display = w.style.display === 'none' ? 'block' : 'none';
}
function showDryRun() {
  document.getElementById('dry-panel').style.display = 'block';
  document.getElementById('results-panel').style.display = 'none';
}
function showResults() {
  document.getElementById('results-panel').style.display = 'block';
  document.getElementById('dry-panel').style.display = 'none';
}
</script>
</body>
</html>
