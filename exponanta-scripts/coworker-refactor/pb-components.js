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


/*basic OLD
pb.components.BaseTable = function ({ data, columns }) {
  const { createElement: e } = React;

  // Use window.ReactTable (the actual UMD export)
  const table = window.ReactTable.useReactTable({
    data,
    columns,
    getCoreRowModel: window.ReactTable.getCoreRowModel(),
  });

  return e(
    "table",
    { className: pb.BS.table.base },
    e(
      "thead",
      null,
      table.getHeaderGroups().map((headerGroup) =>
        e(
          "tr",
          { key: headerGroup.id },
          headerGroup.headers.map((header) =>
            e(
              "th",
              {
                key: header.id,
                className: pb.BS.table.th,
              },
              window.ReactTable.flexRender(
                header.column.columnDef.header,
                header.getContext()
              )
            )
          )
        )
      )
    ),
    e(
      "tbody",
      null,
      table.getRowModel().rows.map((row) =>
        e(
          "tr",
          { key: row.id },
          row.getVisibleCells().map((cell) =>
            e(
              "td",
              {
                key: cell.id,
                className: pb.BS.table.td,
              },
              window.ReactTable.flexRender(
                cell.column.columnDef.cell,
                cell.getContext()
              )
            )
          )
        )
      )
    )
  );
};

*/

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

console.log("✅ pb-components.js loaded");
