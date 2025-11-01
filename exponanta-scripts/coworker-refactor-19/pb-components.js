// pb-components.js - Refactored v2.0 for currentRun-centric UI
// ============================================================================

pb.components = pb.components || {};

// ============================================================================
// DOCLINK COMPONENT - Refactored v2.0 with currentRun / nav safety
// ============================================================================

pb.components.DocLink = function ({ doctype, name, children, className = "" }) {
  const { createElement: e } = React;
  const displayText = children || name || "(unnamed)";

  const handleClick = (ev) => {
    ev.preventDefault();
    if (typeof nav !== "undefined" && nav.item) nav.item(name, doctype);
    else console.error("❌ nav.item not available");
  };

  const handleAuxClick = (ev) => {
    if (ev.button === 1) {
      ev.preventDefault();
      if (typeof nav !== "undefined" && nav.item) nav.item(name, doctype);
    }
  };

  return e(
    "a",
    {
      href: "#",
      className: `${pb.BS.text.primary} hover:underline ${className}`,
      onClick: handleClick,
      onAuxClick: handleAuxClick,
      title: name,
    },
    displayText
  );
};



// field renererd 


// ============================================================================
// FIELD RENDERER COMPONENT - Replaces pb.renderField HTML strings
// Add this BEFORE MainGrid
// ============================================================================

pb.components.FieldRenderer = function({ field, value, row }) {
  const { createElement: e } = React;
  
  if (value == null || value === '') return '';
  
  // Handle Link fields - use DocLink component
  if (field.fieldtype === 'Link' && value) {
    const refDoctype = field.options?.ref || field.options;
    return e(pb.components.DocLink, { 
      doctype: refDoctype, 
      name: value 
    }, value);
  }
  
  // Handle Select fields with badges
  if (field.fieldtype === 'Select' && value) {
    const badgeColors = {
      'Open': 'primary',
      'Closed': 'secondary', 
      'In Progress': 'warning',
      'Completed': 'success',
      'Pending': 'info',
      'High': 'danger',
      'Medium': 'warning',
      'Low': 'info'
    };
    const color = badgeColors[value] || 'secondary';
    return e('span', { className: `badge bg-${color}` }, value);
  }
  
  // Handle Date
  if (field.fieldtype === 'Date' && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  
  // Handle Datetime
  if (field.fieldtype === 'Datetime' && value) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }
  
  // Handle Check (boolean)
  if (field.fieldtype === 'Check') {
    return value ? '✓' : '✗';
  }
  
  // Handle Currency
  if (field.fieldtype === 'Currency' && value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
  
  // Handle Int/Float
  if ((field.fieldtype === 'Int' || field.fieldtype === 'Float') && value) {
    return new Intl.NumberFormat('en-US').format(value);
  }
  
  // Default: display as string
  return String(value);
};

// ============================================================================
// MAIN GRID - Updated to use FieldRenderer
// ============================================================================

pb.components.MainGrid = function ({ doctype }) {
  const { createElement: e, useState, useEffect } = React;
  const [currentRun, setCurrentRun] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Subscribe to CoworkerState safely
  useEffect(() => {
    if (typeof CoworkerState === 'undefined') {
      console.error('❌ CoworkerState not loaded');
      return;
    }
    const unsubscribe = CoworkerState.subscribe((snapshot) => {
      setCurrentRun(snapshot.currentRun);
      setIsLoading(snapshot.isLoading);
    });
    return unsubscribe;
  }, []);

  // Navigate to doctype if not current
  useEffect(() => {
    if (typeof CoworkerState === 'undefined' || typeof nav === 'undefined') return;
    const current = CoworkerState.getCurrent();
    if (!current || current.params?.doctype !== doctype) {
      nav.list(doctype);
    }
  }, [doctype]);

  if (isLoading) {
    return e("div", { className: "p-4 text-center" }, "Loading...");
  }

  if (!currentRun) {
    return e("div", { className: "p-4" }, "No data");
  }

  const { data, schema } = currentRun;

  if (!schema) {
    return e("div", { className: "p-4 text-danger" }, "Schema not found");
  }

  if (!data || data.length === 0) {
    return e(
      "div",
      { className: "alert alert-info m-3" },
      `No ${doctype} records found. Use search above to find items.`
    );
  }

  const columns = Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    cell: ({ getValue, row }) => {
      const value = getValue();

      // Skip null/undefined
      if (value == null) return '';

      // Name field always gets DocLink
      if (key === "name") {
        return e(
          pb.components.DocLink,
          { doctype: row.original.doctype, name: value },
          value
        );
      }

      // Check if schema marks this field as a reference
      const schemaField = schema.fields?.find(f => f.fieldname === key);
      if (schemaField) {
        // ✅ Use FieldRenderer component instead of pb.renderField
        return e(pb.components.FieldRenderer, {
          field: schemaField,
          value: value,
          row: row.original
        });
      }

      // No schema? just show the raw value
      return value;
    }
  }));

  return e(
    "div",
    { className: "p-4" },
    [
      e("h2", { key: "title", className: "text-2xl font-bold mb-4" }, doctype),
      e(pb.components.BaseTable, { key: "table", data, columns })
    ]
  );
};
// ============================================================================
// UNIVERSAL SEARCH INPUT - Refactored for pb-components.js
// ============================================================================
pb.components.UniversalSearchInput = function () {
  const { createElement: e, useState, useEffect, useRef } = React;
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Load doctypes once globally
  useEffect(() => {
    if (window.__DISCOVERED_DOCTYPES) {
      setDoctypes(window.__DISCOVERED_DOCTYPES);
      return;
    }

    coworker
      .run({
        operation: "select",
        doctype: "All",
        input: {},
        options: { includeSchema: false },
      })
      .then((result) => {
        if (result.success && Array.isArray(result.output?.data)) {
          const uniqueDoctypes = [
            ...new Set(
              result.output.data
                .filter((item) => item?.doctype)
                .map((item) => item.doctype)
            ),
          ].sort();

          console.log("✅ Discovered doctypes:", uniqueDoctypes);
          window.__DISCOVERED_DOCTYPES = uniqueDoctypes;
          setDoctypes(uniqueDoctypes);
        }
      })
      .catch((err) => console.error("Failed to load doctypes:", err));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Perform search across doctypes
  const performSearch = async (text) => {
    if (text.length < 2 || doctypes.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const allResults = await Promise.all(
        doctypes.map(async (doctype) => {
          try {
            const result = await coworker.run({
              operation: "select",
              doctype,
              input: {
                where: { name: { contains: text } },
                take: 5,
              },
              options: { includeSchema: false },
            });
            return result.success && Array.isArray(result.output?.data)
              ? result.output.data
              : [];
          } catch {
            return [];
          }
        })
      );

      // Flatten and filter invalid entries
      setResults(allResults.flat().filter((r) => r?.name && r?.doctype));
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText, doctypes]);

  // Handle result click safely
  const handleResultClick = (result) => {
    if (!result?.name || !result?.doctype) return;
    nav.item(result.name, result.doctype);
    setShowDropdown(false);
    setSearchText("");
  };

  return e(
    "div",
    {
      ref: searchRef,
      className: "position-relative",
      style: { minWidth: "300px", maxWidth: "400px" },
    },
    [
      e("input", {
        key: "input",
        type: "text",
        className: "form-control form-control-sm",
        placeholder: `🔍 Search ${doctypes.length} types...`,
        value: searchText,
        onChange: (ev) => setSearchText(ev.target.value),
        onFocus: () => searchText.length >= 2 && setShowDropdown(true),
        disabled: doctypes.length === 0,
      }),

      showDropdown &&
        e(
          "div",
          {
            key: "dropdown",
            className:
              "position-absolute w-100 mt-1 bg-white border rounded shadow-lg",
            style: { maxHeight: "300px", overflowY: "auto", zIndex: 1050 },
          },
          [
            isSearching &&
              e(
                "div",
                {
                  key: "loading",
                  className: "p-2 text-center text-muted small",
                },
                "Searching..."
              ),

            !isSearching &&
              results.length === 0 &&
              searchText.length >= 2 &&
              e(
                "div",
                { key: "empty", className: "p-2 text-center text-muted small" },
                "No results found"
              ),

            !isSearching &&
              results.length > 0 &&
              e(
                "div",
                { key: "results" },
                results.map((result, idx) =>
                  e(
                    "div",
                    {
                      key: `${result.doctype}-${result.name}-${idx}`,
                      className: "px-3 py-2 border-bottom",
                      style: { cursor: "pointer" },
                      onClick: () => handleResultClick(result),
                      onMouseEnter: (ev) =>
                        (ev.currentTarget.style.backgroundColor = "#f8f9fa"),
                      onMouseLeave: (ev) =>
                        (ev.currentTarget.style.backgroundColor = "white"),
                    },
                    [
                      e(
                        "div",
                        { key: "name", className: "fw-bold small" },
                        result.name
                      ),
                      e(
                        "small",
                        { key: "meta", className: "text-muted" },
                        `${result.doctype}${
                          result.status ? ` • ${result.status}` : ""
                        }`
                      ),
                    ]
                  )
                )
              ),
          ]
        ),
    ]
  );
};




// ============================================================================
// BASE TABLE COMPONENT
// ============================================================================

pb.components.BaseTable = function ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  showPagination = true,
  showSearch = true,
  showSelection = false,
  onRowClick = null,
  headerContent = null,
  footerContent = null,
}) {
  const { createElement: e, useState } = React;
  const {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
  } = window.TanStackTable;

  const [globalFilter, setGlobalFilter] = useState("");
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
    initialState: { pagination: { pageSize: 20 } },
  });

  if (loading)
    return e(
      "div",
      {
        className: `${pb.BS.display.flex} ${pb.BS.justify.center} ${pb.BS.align.center} ${pb.BS.spacing.p4}`,
      },
      e("div", { className: pb.BS.spinner })
    );
  if (error)
    return e(
      "div",
      { className: pb.BS.alert.danger },
      e("strong", {}, "Error: "),
      error
    );
  if (data.length === 0)
    return e(
      "div",
      { className: pb.BS.card.base },
      e(
        "div",
        {
          className: `${pb.BS.card.body} ${pb.BS.text.center} ${pb.BS.text.muted}`,
        },
        "No records found"
      )
    );

  return e("div", { className: pb.BS.card.base }, [
    headerContent &&
      e(
        "div",
        {
          key: "header",
          className: `${pb.BS.card.header} ${pb.BS.display.flex} ${pb.BS.justify.between} ${pb.BS.align.center}`,
        },
        headerContent
      ),
    showSearch &&
      e(
        "div",
        {
          key: "search",
          className: `${pb.BS.card.body} ${pb.BS.border.bottom}`,
        },
        e("input", {
          type: "text",
          className: `${pb.BS.input.base} ${pb.BS.input.sm}`,
          placeholder: "Search all columns...",
          value: globalFilter || "",
          onChange: (ev) => setGlobalFilter(ev.target.value),
        })
      ),
    e(
      "div",
      { key: "table", className: pb.BS.table.responsive },
      e(
        "table",
        {
          className: `${pb.BS.table.base} ${pb.BS.table.striped} ${pb.BS.spacing.mb0}`,
        },
        [
          e(
            "thead",
            { key: "head", className: pb.BS.table.head },
            table.getHeaderGroups().map((hg) =>
              e(
                "tr",
                { key: hg.id },
                hg.headers.map((h) =>
                  e(
                    "th",
                    {
                      key: h.id,
                      className: pb.BS.util.cursor.pointer,
                      onClick: h.column.getToggleSortingHandler(),
                      style: { cursor: "pointer", userSelect: "none" },
                    },
                    [
                      flexRender(h.column.columnDef.header, h.getContext()),
                      e(
                        "span",
                        { key: "sort", className: pb.BS.spacing.ml1 },
                        h.column.getIsSorted() === "asc"
                          ? "↑"
                          : h.column.getIsSorted() === "desc"
                          ? "↓"
                          : ""
                      ),
                    ]
                  )
                )
              )
            )
          ),
          e(
            "tbody",
            { key: "body" },
            table.getRowModel().rows.map((row) =>
              e(
                "tr",
                {
                  key: row.id,
                  className: `${
                    row.getIsSelected() ? pb.BS.table.active : ""
                  } ${onRowClick ? pb.BS.util.cursor.pointer : ""}`,
                  onClick: onRowClick
                    ? () => onRowClick(row.original)
                    : undefined,
                  style: onRowClick ? { cursor: "pointer" } : {},
                },
                row
                  .getVisibleCells()
                  .map((cell) =>
                    e(
                      "td",
                      { key: cell.id },
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )
                  )
              )
            )
          ),
        ]
      )
    ),
    footerContent &&
      e(
        "div",
        {
          key: "footer",
          className: `${pb.BS.card.footer} ${pb.BS.bg.light} ${pb.BS.text.muted}`,
        },
        footerContent
      ),
    showPagination &&
      e(
        "div",
        {
          key: "pagination",
          className: `${pb.BS.card.footer} ${pb.BS.display.flex} ${pb.BS.justify.between} ${pb.BS.align.center}`,
        },
        [
          e(
            "small",
            { key: "info", className: pb.BS.text.muted },
            `Showing ${
              table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              1
            } to ${Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              data.length
            )} of ${data.length}`
          ),
          e("div", { key: "controls", className: "btn-group btn-group-sm" }, [
            e(
              "button",
              {
                key: "first",
                onClick: () => table.setPageIndex(0),
                disabled: !table.getCanPreviousPage(),
                className: pb.BS.button.secondary,
              },
              "⏮"
            ),
            e(
              "button",
              {
                key: "prev",
                onClick: () => table.previousPage(),
                disabled: !table.getCanPreviousPage(),
                className: pb.BS.button.secondary,
              },
              "←"
            ),
            e(
              "button",
              {
                key: "page",
                className: `${pb.BS.button.secondary} disabled`,
                disabled: true,
              },
              `Page ${
                table.getState().pagination.pageIndex + 1
              } of ${table.getPageCount()}`
            ),
            e(
              "button",
              {
                key: "next",
                onClick: () => table.nextPage(),
                disabled: !table.getCanNextPage(),
                className: pb.BS.button.secondary,
              },
              "→"
            ),
            e(
              "button",
              {
                key: "last",
                onClick: () => table.setPageIndex(table.getPageCount() - 1),
                disabled: !table.getCanNextPage(),
                className: pb.BS.button.secondary,
              },
              "⏭"
            ),
          ]),
        ]
      ),
  ]);
};

// ============================================================================
// FIELD RENDERER COMPONENT - Replaces pb.renderField HTML strings
// Add this BEFORE MainGrid
// ============================================================================

pb.components.FieldRenderer = function({ field, value, row }) {
  const { createElement: e } = React;
  
  if (value == null || value === '') return '';
  
  // Handle Link fields - use DocLink component
  if (field.fieldtype === 'Link' && value) {
    const refDoctype = field.options?.ref || field.options;
    return e(pb.components.DocLink, { 
      doctype: refDoctype, 
      name: value 
    }, value);
  }
  
  // Handle Select fields with badges
  if (field.fieldtype === 'Select' && value) {
    const badgeColors = {
      'Open': 'primary',
      'Closed': 'secondary', 
      'In Progress': 'warning',
      'Completed': 'success',
      'Pending': 'info',
      'High': 'danger',
      'Medium': 'warning',
      'Low': 'info'
    };
    const color = badgeColors[value] || 'secondary';
    return e('span', { className: `badge bg-${color}` }, value);
  }
  
  // Handle Date
  if (field.fieldtype === 'Date' && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  
  // Handle Datetime
  if (field.fieldtype === 'Datetime' && value) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }
  
  // Handle Check (boolean)
  if (field.fieldtype === 'Check') {
    return value ? '✓' : '✗';
  }
  
  // Handle Currency
  if (field.fieldtype === 'Currency' && value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
  
  // Handle Int/Float
  if ((field.fieldtype === 'Int' || field.fieldtype === 'Float') && value) {
    return new Intl.NumberFormat('en-US').format(value);
  }
  
  // Default: display as string
  return String(value);
};

// ============================================================================
// MAIN GRID - Updated to use FieldRenderer
// ============================================================================

pb.components.MainGrid = function ({ doctype }) {
  const { createElement: e, useState, useEffect } = React;
  const [currentRun, setCurrentRun] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Subscribe to CoworkerState safely
  useEffect(() => {
    if (typeof CoworkerState === 'undefined') {
      console.error('❌ CoworkerState not loaded');
      return;
    }
    const unsubscribe = CoworkerState.subscribe((snapshot) => {
      setCurrentRun(snapshot.currentRun);
      setIsLoading(snapshot.isLoading);
    });
    return unsubscribe;
  }, []);

  // Navigate to doctype if not current
  useEffect(() => {
    if (typeof CoworkerState === 'undefined' || typeof nav === 'undefined') return;
    const current = CoworkerState.getCurrent();
    if (!current || current.params?.doctype !== doctype) {
      nav.list(doctype);
    }
  }, [doctype]);

  if (isLoading) {
    return e("div", { className: "p-4 text-center" }, "Loading...");
  }

  if (!currentRun) {
    return e("div", { className: "p-4" }, "No data");
  }

  const { data, schema } = currentRun;

  if (!schema) {
    return e("div", { className: "p-4 text-danger" }, "Schema not found");
  }

  if (!data || data.length === 0) {
    return e(
      "div",
      { className: "alert alert-info m-3" },
      `No ${doctype} records found. Use search above to find items.`
    );
  }

  const columns = Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    cell: ({ getValue, row }) => {
      const value = getValue();

      // Skip null/undefined
      if (value == null) return '';

      // Name field always gets DocLink
      if (key === "name") {
        return e(
          pb.components.DocLink,
          { doctype: row.original.doctype, name: value },
          value
        );
      }

      // Check if schema marks this field as a reference
      const schemaField = schema.fields?.find(f => f.fieldname === key);
      if (schemaField) {
        // ✅ Use FieldRenderer component instead of pb.renderField
        return e(pb.components.FieldRenderer, {
          field: schemaField,
          value: value,
          row: row.original
        });
      }

      // No schema? just show the raw value
      return value;
    }
  }));

  return e(
    "div",
    { className: "p-4" },
    [
      e("h2", { key: "title", className: "text-2xl font-bold mb-4" }, doctype),
      e(pb.components.BaseTable, { key: "table", data, columns })
    ]
  );
};
// ============================================================================
// DIALOG OVERLAY COMPONENT - Subscribes to CoworkerState activeDialogs
// ============================================================================

pb.components.DialogOverlay = function () {
  const { createElement: e, useState, useEffect } = React;
  const [activeDialogs, setActiveDialogs] = useState([]);

  // ✅ Subscribe to pre-computed activeDialogs with safety check
  useEffect(() => {
    if (typeof CoworkerState === "undefined") {
      console.error("❌ CoworkerState not loaded for DialogOverlay");
      return;
    }

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
        zIndex: 1050 + index,
      })
    )
  );
};

// ============================================================================
// DIALOG MODAL COMPONENT - Single dialog instance
// ============================================================================

pb.components.DialogModal = function ({ run, zIndex = 1050 }) {
  const { createElement: e, useState } = React;
  const [inputValue, setInputValue] = useState(run.output?.value || "");

  const handleClose = (confirmed, value = null) => {
    if (typeof CoworkerState === "undefined") {
      console.error("❌ CoworkerState not loaded for DialogModal");
      return;
    }

    CoworkerState._updateFromRun({
      ...run,
      status: "completed",
      output: {
        confirmed: confirmed,
        value: value !== null ? value : inputValue,
      },
    });
  };

  // Determine dialog type
  const type = run.input?.type || "confirm";
  const title = run.input?.title || "Dialog";
  const message = run.input?.message || "Confirm action?";
  const buttons = run.input?.buttons || ["Cancel", "Confirm"];
  const destructive = run.input?.destructive || false;

  return e(
    "div",
    {
      className: "modal d-block",
      style: {
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: zIndex,
      },
      onClick: (ev) => {
        if (ev.target.classList.contains("modal")) {
          handleClose(false);
        }
      },
    },
    e(
      "div",
      {
        className: "modal-dialog modal-dialog-centered",
        onClick: (ev) => ev.stopPropagation(),
      },
      e("div", { className: "modal-content" }, [
        // Header
        e("div", { key: "header", className: "modal-header" }, [
          e("h5", { key: "title", className: "modal-title" }, title),
          e("button", {
            key: "close",
            type: "button",
            className: "btn-close",
            "aria-label": "Close",
            onClick: () => handleClose(false),
          }),
        ]),

        // Body
        e("div", { key: "body", className: "modal-body" }, [
          e("p", { key: "message" }, message),

          // Input field for 'prompt' type
          type === "prompt" &&
            e("input", {
              key: "input",
              type: "text",
              className: "form-control mt-3",
              value: inputValue,
              onChange: (ev) => setInputValue(ev.target.value),
              placeholder: run.input?.placeholder || "Enter value...",
              autoFocus: true,
              onKeyPress: (ev) => {
                if (ev.key === "Enter") {
                  handleClose(true, inputValue);
                }
              },
            }),
        ]),

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
                  isDanger
                    ? "btn-danger"
                    : isPrimary
                    ? "btn-primary"
                    : "btn-secondary"
                }`,
                onClick: () => handleClose(isConfirm, inputValue),
              },
              btnText
            );
          })
        ),
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

  // ✅ Subscribe to pre-computed views with safety check
  useEffect(() => {
    if (typeof CoworkerState === "undefined") {
      console.error("❌ CoworkerState not loaded for ChatSidebar");
      return;
    }

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
      className:
        "position-fixed end-0 top-0 h-100 bg-white border-start shadow-lg",
      style: {
        width: "350px",
        zIndex: 1040,
        overflowY: "auto",
      },
    },
    [
      // Header
      e(
        "div",
        {
          key: "header",
          className:
            "d-flex justify-content-between align-items-center p-3 border-bottom bg-light",
        },
        [
          e("h5", { key: "title", className: "mb-0" }, "AI Pipelines"),
          e("button", {
            key: "close",
            className: "btn-close",
            onClick: onToggle,
          }),
        ]
      ),

      // Stats
      e("div", { key: "stats", className: "p-3 border-bottom bg-light" }, [
        e(
          "small",
          { key: "pipelines", className: "d-block text-muted" },
          `${pipelineCount} active pipeline${pipelineCount !== 1 ? "s" : ""}`
        ),
        e(
          "small",
          { key: "ai", className: "d-block text-muted" },
          `${aiCount} AI operation${aiCount !== 1 ? "s" : ""} running`
        ),
      ]),

      // Pipelines
      e(
        "div",
        { key: "content", className: "p-3" },
        pipelineCount === 0
          ? e(
              "div",
              { className: "text-muted text-center py-5" },
              "No active pipelines"
            )
          : Object.entries(activePipelines).map(([rootId, runs]) =>
              e(pb.components.PipelineCard, {
                key: rootId,
                rootId: rootId,
                runs: runs,
              })
            )
      ),
    ]
  );
};

// ============================================================================
// PIPELINE CARD COMPONENT - Shows chat messages or pipeline progress
// ============================================================================

pb.components.PipelineCard = function ({ rootId, runs }) {
  const { createElement: e } = React;

  const sortedRuns = runs.sort(
    (a, b) => new Date(a.created || 0) - new Date(b.created || 0)
  );

  // Check if this is a chat pipeline (has user/assistant roles)
  const isChat = sortedRuns.some(run => run.role === 'user' || run.role === 'assistant');

  if (isChat) {
    // ========================================================================
    // CHAT MESSAGE RENDERING
    // ========================================================================
    return e(
      "div",
      { className: "mb-3" },
      sortedRuns.map((run) => {
        const isUser = run.role === 'user';
        const isAI = run.role === 'assistant';
        
        // Get message text
        const text = isUser 
          ? run.input?.text || run.input || ''
          : run.output?.fullText || run.output?.tokens?.join('') || '';

        return e(
          "div",
          {
            key: run.id,
            className: `d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`
          },
          e(
            "div",
            {
              className: `p-3 rounded ${
                isUser 
                  ? 'bg-primary text-white' 
                  : 'bg-light border'
              }`,
              style: { 
                maxWidth: '80%',
                wordWrap: 'break-word'
              }
            },
            [
              // Message text
              e(
                "div",
                { key: "text", style: { whiteSpace: 'pre-wrap' } },
                text || (isAI ? 'Thinking...' : 'Message')
              ),
              
              // Streaming indicator for AI
              run.status === 'running' && isAI &&
                e(
                  "span",
                  { 
                    key: "typing",
                    className: "d-inline-block ms-2",
                    style: { animation: 'blink 1s infinite' }
                  },
                  '▊'
                ),
              
              // Timestamp
              e(
                "small",
                {
                  key: "time",
                  className: `d-block mt-1 ${isUser ? 'text-white-50' : 'text-muted'}`,
                  style: { fontSize: '0.7rem' }
                },
                new Date(run.created).toLocaleTimeString()
              )
            ]
          )
        );
      })
    );
  } else {
    // ========================================================================
    // PIPELINE PROGRESS RENDERING (Original)
    // ========================================================================
    return e("div", { className: "card mb-3" }, [
      e(
        "div",
        { key: "header", className: "card-header" },
        e(
          "small",
          { className: "text-muted" },
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
              className: `d-flex align-items-center mb-2 ${
                idx > 0 ? "ms-3" : ""
              }`,
            },
            [
              // Status icon
              e(
                "span",
                { key: "icon", className: "me-2" },
                run.status === "completed"
                  ? "✅"
                  : run.status === "running"
                  ? "⏳"
                  : run.status === "failed"
                  ? "❌"
                  : "⏸️"
              ),
              // Operation name
              e(
                "div",
                { key: "content", className: "flex-grow-1" },
                [
                  e(
                    "small",
                    { key: "op", className: "d-block fw-bold" },
                    run.operation
                  ),
                  run.output?.tokens &&
                    e(
                      "small",
                      { key: "tokens", className: "d-block text-muted" },
                      `${run.output.tokens.length} tokens`
                    ),
                  run.status === "running" &&
                    e(
                      "div",
                      {
                        key: "progress",
                        className: "progress mt-1",
                        style: { height: "3px" },
                      },
                      e("div", {
                        className:
                          "progress-bar progress-bar-striped progress-bar-animated",
                        style: { width: "100%" },
                      })
                    ),
                ]
              ),
            ]
          )
        )
      ),
    ]);
  }
};

// Add CSS for blinking cursor animation
if (!document.getElementById('chat-styles')) {
  const style = document.createElement('style');
  style.id = 'chat-styles';
  style.textContent = `
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

console.log("✅ PipelineCard updated for chat messages");