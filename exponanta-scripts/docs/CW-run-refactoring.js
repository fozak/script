//version with autosave and create/update operation

if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      const opConfig = CW._config.operations?.[run_doc.operation] || {};
      if (opConfig.type === "read" || opConfig.type === "auth") {
        await CW._handlers[run_doc.operation]?.(run_doc);
      } else {
        // thisi line 457 data change — create or update line
        const schema = CW.Schema?.[run_doc.target_doctype];
        const autosave = run_doc.autosave ?? schema?.autosave ?? 1; //const autosave = schema?._autosave ?? 1;
        if (autosave !== 0) {
          //added
          run_doc.operation = doc.name ? "update" : "create";

          

          // PHASE 1 — transform adapters (non-db)
          for (const a of CW._getAdapters(run_doc)) {
            if (run_doc.error) break;
            if (CW._config.adapters.registry?.[a]?.type !== "db") {
              await globalThis.Adapters[a]?.[run_doc.operation]?.(run_doc);
            }
          }

          if (!run_doc.error) {
            // ADAPTER PASS — log → merge → clear
            await CW._logChanges(run_doc);
            CW._mergeInput(run_doc);
            CW._clearInput(run_doc);

            // PHASE 2 — persist adapters (db only)
            CW._preflight(run_doc);
            if (!run_doc.error) {
              CW._stripVirtual(run_doc);
              for (const a of CW._getAdapters(run_doc)) {
                if (run_doc.error) break;
                if (CW._config.adapters.registry?.[a]?.type === "db") {
                  await globalThis.Adapters[a]?.[run_doc.operation]?.(run_doc);
                }
              }
            }
          }

          if (
            !run_doc.error &&
            run_doc.operation === "create" &&
            run_doc.target?.data?.[0]?.name
          ) {
            run_doc.query = Object.assign({}, run_doc.query, {
              where: { name: run_doc.target.data[0].name },
            });
          }
        }
      }
    }