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
