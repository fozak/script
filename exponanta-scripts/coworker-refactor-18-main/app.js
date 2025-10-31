// ============================================================================
// APP COMPONENT - Refactored to fully use currentRun
// ============================================================================
const App = function () {
  const { createElement: e, useState, useEffect } = React;
  const [currentRun, setCurrentRun] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState("list");
  const [showChatSidebar, setShowChatSidebar] = useState(false);

  // Subscribe to CoworkerState
  useEffect(() => {
    const unsubscribe = CoworkerState.subscribe((snapshot) => {
      setCurrentRun(snapshot.currentRun);
      setIsLoading(snapshot.isLoading);

      if (snapshot.currentRun?.data?.length) {
        const isSingleItem =
          snapshot.currentRun.data.length === 1 &&
          snapshot.currentRun.params?.query?.take === 1;

        setView(isSingleItem ? "form" : "list");
      } else {
        setView("list");
      }
    });

    return unsubscribe;
  }, []);

  // Loading view
  if (isLoading) {
    return e(
      "div",
      { className: "container mt-5 text-center" },
      e("div", { className: "spinner-border text-primary" }),
      e("p", { className: "mt-3" }, "Loading...")
    );
  }

  // Home view (no currentRun)
  if (!currentRun?.data?.length) {
    return e("div", { className: "container-fluid" }, [
      e(
        "nav",
        { key: "header", className: "navbar navbar-light bg-light mb-4" },
        e(
          "div",
          { className: "container-fluid d-flex justify-content-between align-items-center" },
          [
            e("span", { key: "brand", className: "navbar-brand" }, "🚀 Coworker App v2.0"),
            e(pb.components.UniversalSearchInput, { key: "search" }),
          ]
        )
      ),
      e(
        "div",
        { key: "content", className: "container mt-5" },
        e(
          "div",
          { className: "card" },
          e(
            "div",
            { className: "card-body text-center" },
            [
              e("h1", { key: "title", className: "mb-4" }, "Choose a DocType"),
              e("div", { key: "buttons", className: "btn-group" }, [
                e("button", { key: "task", className: "btn btn-primary", onClick: () => nav.list("Task") }, "📋 Tasks"),
                e("button", { key: "user", className: "btn btn-success", onClick: () => nav.list("User") }, "👤 Users"),
                e("button", { key: "customer", className: "btn btn-info", onClick: () => nav.list("Customer") }, "🏢 Customers"),
              ]),
            ]
          )
        )
      ),
      e(pb.components.DialogOverlay, { key: "dialogs" }),
    ]);
  }

  // Main view
  const currentItem = currentRun.data[0]; // Always safe
  const currentDoctype = currentRun.params?.doctype || "";

  return e("div", { className: "container-fluid" }, [
    // Header
    e(
      "nav",
      { key: "header", className: "navbar navbar-light bg-light mb-4" },
      e("div", { className: "container-fluid d-flex align-items-center" }, [
        // Breadcrumbs
        e("ol", { key: "breadcrumb", className: "breadcrumb mb-0 me-3" }, [
          e(
            "li",
            { key: "home", className: "breadcrumb-item" },
            e(
              "a",
              { href: "#", onClick: (ev) => { ev.preventDefault(); nav.home(); } },
              "Home"
            )
          ),
          currentDoctype &&
            e(
              "li",
              {
                key: "doctype",
                className: "breadcrumb-item" + (view === "list" ? " active" : ""),
              },
              view === "list"
                ? currentDoctype
                : e(
                    "a",
                    { href: "#", onClick: (ev) => { ev.preventDefault(); nav.list(currentDoctype); } },
                    currentDoctype
                  )
            ),
          view === "form" &&
            currentItem &&
            e("li", { key: "item", className: "breadcrumb-item active" }, currentItem.name),
        ]),

        // Universal search
        e("div", { key: "search", className: "flex-grow-1 mx-3" }, e(pb.components.UniversalSearchInput, {})),

        // Navigation buttons
        e("div", { key: "nav", className: "btn-group btn-group-sm" }, [
          e(
            "button",
            { key: "back", className: "btn btn-outline-secondary", onClick: () => nav.back(), disabled: !CoworkerState.canGoBack() },
            "⬅️"
          ),
          e(
            "button",
            { key: "refresh", className: "btn btn-outline-primary", onClick: () => nav.refresh() },
            "🔄"
          ),
          e(
            "button",
            {
              key: "chat",
              className: `btn ${showChatSidebar ? "btn-info" : "btn-outline-info"}`,
              onClick: () => setShowChatSidebar(!showChatSidebar),
            },
            `💬 ${showChatSidebar ? "→" : "←"}`
          ),
        ]),
      ])
    ),

    // Content
    e(
      "div",
      { key: "content", className: "row" },
      e(
        "div",
        { className: "col" },
        view === "list"
          ? e(pb.components.MainGrid, { doctype: currentDoctype })
          : e(
              "div",
              { className: "card m-3" },
              [
                e("div", { key: "header", className: "card-header" }, e("h3", {}, currentItem?.name || "Item View")),
                e("div", { key: "body", className: "card-body" }, [
                  e("pre", { key: "data", className: "bg-light p-3" }, JSON.stringify(currentItem, null, 2)),
                  e(
                    "button",
                    { key: "back", className: "btn btn-secondary mt-3", onClick: () => nav.list(currentDoctype) },
                    "⬅️ Back to List"
                  ),
                ]),
              ]
            )
      )
    ),

    // Dialog overlay
    e(pb.components.DialogOverlay, { key: "dialogs" }),

    // Chat sidebar
    e(pb.components.ChatSidebar, { key: "chat", isOpen: showChatSidebar, onToggle: () => setShowChatSidebar(!showChatSidebar) }),
  ]);
};


// ============================================================================
// END OF APP.JS
// ============================================================================
