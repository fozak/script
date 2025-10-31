// pb-components.js - React Components v 15 works 

// ============================================================================
// INITIALIZE COMPONENTS NAMESPACE
// ============================================================================

pb.components = pb.components || {};

// ============================================================================
// DOCLINK COMPONENT - Uses pb.nav for navigation
// ============================================================================

pb.components.DocLink = function ({ doctype, name, children, className = "" }) {
  const { createElement: e } = React;

  return e(
    "a",
    {
      href: "#",
      className: `${pb.BS.text.primary} hover:underline ${className}`,
      onClick: (ev) => {
        ev.preventDefault();
        pb.nav.item(name, doctype);
      },
      onAuxClick: (ev) => {
        if (ev.button === 1) {
          ev.preventDefault();
          pb.nav.item(name, doctype);
        }
      },
    },
    children
  );
};

// ============================================================================
// BASE TABLE COMPONENT
// ============================================================================

pb.components.BaseTable = function({ 
  data = [],
  columns = [],
  loading = false,
  error = null,
  showPagination = true,
  showSearch = true,
  showSelection = false,
  onRowClick = null,
  headerContent = null,
  footerContent = null
}) {
  const { createElement: e, useState } = React;
  const { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel, 
    getFilteredRowModel, 
    getPaginationRowModel, 
    flexRender 
  } = window.TanStackTable;
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    enableRowSelection: showSelection,
    initialState: { pagination: { pageSize: 20 } }
  });

  // Loading state
  if (loading) {
    return e('div', { 
      className: `${pb.BS.display.flex} ${pb.BS.justify.center} ${pb.BS.align.center} ${pb.BS.spacing.p4}` 
    },
      e('div', { className: pb.BS.spinner })
    );
  }

  // Error state
  if (error) {
    return e('div', { className: pb.BS.alert.danger },
      e('strong', {}, 'Error: '),
      error
    );
  }

  // Empty state
  if (data.length === 0) {
    return e('div', { className: pb.BS.card.base },
      e('div', { className: `${pb.BS.card.body} ${pb.BS.text.center} ${pb.BS.text.muted}` },
        'No records found'
      )
    );
  }

  return e('div', { className: pb.BS.card.base }, [
    // Header
    headerContent && e('div', { 
      key: 'header', 
      className: `${pb.BS.card.header} ${pb.BS.display.flex} ${pb.BS.justify.between} ${pb.BS.align.center}` 
    }, headerContent),
    
    // Search
    showSearch && e('div', { 
      key: 'search', 
      className: `${pb.BS.card.body} ${pb.BS.border.bottom}` 
    },
      e('input', {
        type: 'text',
        className: `${pb.BS.input.base} ${pb.BS.input.sm}`,
        placeholder: 'Search all columns...',
        value: globalFilter || '',
        onChange: ev => setGlobalFilter(ev.target.value)
      })
    ),

    // Table
    e('div', { key: 'table', className: pb.BS.table.responsive },
      e('table', { className: `${pb.BS.table.base} ${pb.BS.table.striped} ${pb.BS.spacing.mb0}` }, [
        // Header
        e('thead', { key: 'head', className: pb.BS.table.head },
          table.getHeaderGroups().map(hg =>
            e('tr', { key: hg.id },
              hg.headers.map(h =>
                e('th', {
                  key: h.id,
                  className: pb.BS.util.cursor.pointer,
                  onClick: h.column.getToggleSortingHandler(),
                  style: { cursor: 'pointer', userSelect: 'none' }
                }, [
                  flexRender(h.column.columnDef.header, h.getContext()),
                  e('span', { key: 'sort', className: pb.BS.spacing.ml1 },
                    h.column.getIsSorted() === 'asc' ? '↑' :
                    h.column.getIsSorted() === 'desc' ? '↓' : ''
                  )
                ])
              )
            )
          )
        ),
        // Body
        e('tbody', { key: 'body' },
          table.getRowModel().rows.map(row =>
            e('tr', {
              key: row.id,
              className: `${row.getIsSelected() ? pb.BS.table.active : ''} ${onRowClick ? pb.BS.util.cursor.pointer : ''}`,
              onClick: onRowClick ? () => onRowClick(row.original) : undefined,
              style: onRowClick ? { cursor: 'pointer' } : {}
            },
              row.getVisibleCells().map(cell =>
                e('td', { key: cell.id },
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                )
              )
            )
          )
        )
      ])
    ),

    // Footer
    footerContent && e('div', { 
      key: 'footer', 
      className: `${pb.BS.card.footer} ${pb.BS.bg.light} ${pb.BS.text.muted}` 
    }, footerContent),

    // Pagination
    showPagination && e('div', { 
      key: 'pagination', 
      className: `${pb.BS.card.footer} ${pb.BS.display.flex} ${pb.BS.justify.between} ${pb.BS.align.center}` 
    }, [
      e('small', { key: 'info', className: pb.BS.text.muted },
        `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} of ${data.length}`
      ),
      e('div', { key: 'controls', className: 'btn-group btn-group-sm' }, [
        e('button', {
          key: 'first',
          onClick: () => table.setPageIndex(0),
          disabled: !table.getCanPreviousPage(),
          className: pb.BS.button.secondary
        }, '⏮'),
        e('button', {
          key: 'prev',
          onClick: () => table.previousPage(),
          disabled: !table.getCanPreviousPage(),
          className: pb.BS.button.secondary
        }, '←'),
        e('button', { 
          key: 'page', 
          className: `${pb.BS.button.secondary} disabled`,
          disabled: true
        }, `Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`),
        e('button', {
          key: 'next',
          onClick: () => table.nextPage(),
          disabled: !table.getCanNextPage(),
          className: pb.BS.button.secondary
        }, '→'),
        e('button', {
          key: 'last',
          onClick: () => table.setPageIndex(table.getPageCount() - 1),
          disabled: !table.getCanNextPage(),
          className: pb.BS.button.secondary
        }, '⏭')
      ])
    ])
  ]);
};


// ============================================================================
// MAIN GRID - Subscribes to pb.navigation state
// ============================================================================

pb.components.MainGrid = function ({ doctype }) {
  const { createElement: e, useState, useEffect } = React;
  const [currentList, setCurrentList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = pb.navigation.subscribe((list, loading) => {
      setCurrentList(list);
      setIsLoading(loading);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const current = pb.navigation.getCurrent();
    if (!current || current.params.doctype !== doctype) {
      pb.nav.list(doctype);
    }
  }, [doctype]);

  if (isLoading) {
    return e("div", { className: "p-4" }, "Loading...");
  }

  if (!currentList || !currentList.data.length) {
    return e(
      "div",
      { className: "p-4 text-gray-500" },
      `No ${doctype} records found`
    );
  }

  const { data, schema } = currentList;

  if (!schema) {
    return e("div", { className: "p-4 text-red-500" }, "Schema not found");
  }

 const columns = Object.keys(data[0])
  .map((key) => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    cell: ({ getValue, row }) => {
      const value = getValue();
      
      // Name field gets DocLink
      if (key === "name") {
        return e(
          pb.components.DocLink,
          {
            doctype: row.original.doctype,
            name: value
          },
          value
        );
      }
      
      // Find schema field for rendering
      const schemaField = schema.fields.find(f => f.fieldname === key);
      if (schemaField) {
        const rendered = pb.renderField(schemaField, value, row.original);
        return e("span", {
          dangerouslySetInnerHTML: { __html: rendered }
        });
      }
      
      // No schema? Just show the value
      return value;
    }
  }));

return e(
  "div",
  { className: "p-4" },
  e("h2", { className: "text-2xl font-bold mb-4" }, doctype),
  e(pb.components.BaseTable, { data, columns })
);
};

// ============================================================================
// DIALOG OVERLAY COMPONENT - Subscribes to CoworkerState activeDialogs
// ============================================================================

pb.components.DialogOverlay = function () {
  const { createElement: e, useState, useEffect } = React;
  const [activeDialogs, setActiveDialogs] = useState([]);

  // ✅ Subscribe to pre-computed activeDialogs from CoworkerState v2.0
  useEffect(() => {
    const unsubscribe = CoworkerState.subscribe((snapshot) => {
      setActiveDialogs(snapshot.activeDialogs || []);
    });
    return unsubscribe;
  }, []);

  if (activeDialogs.length === 0) return null;

  // Render all active dialogs (can stack multiple)
  return e(
    "div",
    { className: "dialog-overlay-container" },
    activeDialogs.map((run, index) =>
      e(pb.components.DialogModal, {
        key: run.id,
        run: run,
        zIndex: 1050 + index // Stack multiple dialogs
      })
    )
  );
};

// ============================================================================
// DIALOG MODAL COMPONENT - Single dialog instance
// ============================================================================

pb.components.DialogModal = function ({ run, zIndex = 1050 }) {
  const { createElement: e, useState } = React;
  const [inputValue, setInputValue] = useState(run.output?.value || '');

  const handleClose = (confirmed, value = null) => {
    CoworkerState._updateFromRun({
      ...run,
      status: 'completed',
      output: {
        confirmed: confirmed,
        value: value !== null ? value : inputValue
      }
    });
  };

  // Determine dialog type
  const type = run.input?.type || 'confirm'; // confirm, alert, prompt
  const title = run.input?.title || 'Dialog';
  const message = run.input?.message || 'Confirm action?';
  const buttons = run.input?.buttons || ['Cancel', 'Confirm'];
  const destructive = run.input?.destructive || false;

  return e(
    "div",
    {
      className: "modal d-block",
      style: { 
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: zIndex
      },
      onClick: (ev) => {
        // Close on backdrop click (optional)
        if (ev.target.classList.contains('modal')) {
          handleClose(false);
        }
      }
    },
    e(
      "div",
      { 
        className: "modal-dialog modal-dialog-centered",
        onClick: (ev) => ev.stopPropagation() // Prevent close on modal click
      },
      e("div", { className: "modal-content" }, [
        // Header
        e(
          "div",
          { key: "header", className: "modal-header" },
          [
            e("h5", { key: "title", className: "modal-title" }, title),
            e(
              "button",
              {
                key: "close",
                type: "button",
                className: "btn-close",
                "aria-label": "Close",
                onClick: () => handleClose(false)
              }
            )
          ]
        ),

        // Body
        e(
          "div",
          { key: "body", className: "modal-body" },
          [
            e("p", { key: "message" }, message),
            
            // Input field for 'prompt' type
            type === 'prompt' && e("input", {
              key: "input",
              type: "text",
              className: "form-control mt-3",
              value: inputValue,
              onChange: (ev) => setInputValue(ev.target.value),
              placeholder: run.input?.placeholder || "Enter value...",
              autoFocus: true,
              onKeyPress: (ev) => {
                if (ev.key === 'Enter') {
                  handleClose(true, inputValue);
                }
              }
            })
          ]
        ),

        // Footer
        e(
          "div",
          { key: "footer", className: "modal-footer" },
          buttons.map((btnText, idx) => {
            const isConfirm = idx === buttons.length - 1;
            const isPrimary = isConfirm && !destructive;
            const isDanger = isConfirm && destructive;
            
            return e(
              "button",
              {
                key: idx,
                className: `btn ${
                  isDanger ? 'btn-danger' :
                  isPrimary ? 'btn-primary' :
                  'btn-secondary'
                }`,
                onClick: () => handleClose(isConfirm, inputValue)
              },
              btnText
            );
          })
        )
      ])
    )
  );
};

// ============================================================================
// AI CHAT SIDEBAR COMPONENT - Shows active AI pipelines
// ============================================================================

pb.components.ChatSidebar = function ({ isOpen = false, onToggle = null }) {
  const { createElement: e, useState, useEffect } = React;
  const [activePipelines, setActivePipelines] = useState({});
  const [activeAI, setActiveAI] = useState([]);

  // ✅ Subscribe to pre-computed views
  useEffect(() => {
    const unsubscribe = CoworkerState.subscribe((snapshot) => {
      setActivePipelines(snapshot.activePipelines || {});
      setActiveAI(snapshot.activeAI || []);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const pipelineCount = Object.keys(activePipelines).length;
  const aiCount = activeAI.length;

  return e(
    "div",
    {
      className: "position-fixed end-0 top-0 h-100 bg-white border-start shadow-lg",
      style: { 
        width: "350px", 
        zIndex: 1040,
        overflowY: "auto"
      }
    },
    [
      // Header
      e(
        "div",
        {
          key: "header",
          className: "d-flex justify-content-between align-items-center p-3 border-bottom bg-light"
        },
        [
          e("h5", { key: "title", className: "mb-0" }, "AI Pipelines"),
          e(
            "button",
            {
              key: "close",
              className: "btn-close",
              onClick: onToggle
            }
          )
        ]
      ),

      // Stats
      e(
        "div",
        { key: "stats", className: "p-3 border-bottom bg-light" },
        [
          e("small", { key: "pipelines", className: "d-block text-muted" }, 
            `${pipelineCount} active pipeline${pipelineCount !== 1 ? 's' : ''}`
          ),
          e("small", { key: "ai", className: "d-block text-muted" }, 
            `${aiCount} AI operation${aiCount !== 1 ? 's' : ''} running`
          )
        ]
      ),

      // Pipelines
      e(
        "div",
        { key: "content", className: "p-3" },
        pipelineCount === 0
          ? e("div", { className: "text-muted text-center py-5" }, "No active pipelines")
          : Object.entries(activePipelines).map(([rootId, runs]) =>
              e(pb.components.PipelineCard, {
                key: rootId,
                rootId: rootId,
                runs: runs
              })
            )
      )
    ]
  );
};

// ============================================================================
// PIPELINE CARD COMPONENT - Shows individual pipeline progress
// ============================================================================

pb.components.PipelineCard = function ({ rootId, runs }) {
  const { createElement: e } = React;

  const rootRun = runs[0]; // First run is the root
  const sortedRuns = runs.sort((a, b) => 
    new Date(a.created || 0) - new Date(b.created || 0)
  );

  return e(
    "div",
    { className: "card mb-3" },
    [
      e(
        "div",
        { key: "header", className: "card-header" },
        e("small", { className: "text-muted" }, 
          `Pipeline ${rootId.slice(0, 8)}...`
        )
      ),
      e(
        "div",
        { key: "body", className: "card-body p-2" },
        sortedRuns.map((run, idx) =>
          e(
            "div",
            {
              key: run.id,
              className: `d-flex align-items-center mb-2 ${idx > 0 ? 'ms-3' : ''}`
            },
            [
              // Status icon
              e(
                "span",
                { key: "icon", className: "me-2" },
                run.status === 'completed' ? '✅' :
                run.status === 'running' ? '⏳' :
                run.status === 'failed' ? '❌' : '⏸️'
              ),
              // Operation name
              e(
                "div",
                { key: "content", className: "flex-grow-1" },
                [
                  e("small", { key: "op", className: "d-block fw-bold" }, 
                    run.operation
                  ),
                  run.output?.tokens && e("small", { key: "tokens", className: "d-block text-muted" }, 
                    `${run.output.tokens.length} tokens`
                  ),
                  run.status === 'running' && e(
                    "div",
                    { key: "progress", className: "progress mt-1", style: { height: "3px" } },
                    e("div", {
                      className: "progress-bar progress-bar-striped progress-bar-animated",
                      style: { width: "100%" }
                    })
                  )
                ]
              )
            ]
          )
        )
      )
    ]
  );
};

console.log("✅ pb-components.js loaded");
