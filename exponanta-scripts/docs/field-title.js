 goingn into my top level title field 

12 results - 3 files

CW-config.js:
  227      {
  228    name: "title",
  229    fetch: true,
  230    hidden: 0,
  231    in_list_view: 1,
  232    fieldtype: "Data",
  233    onCreate: (run_doc) => {
  234      const doc = run_doc.target?.data?.[0];
  235      if (!doc) return;
  236      const s = CW.Schema?.[run_doc.target_doctype];
  237:     const titleFieldName = s?.title_field || "title";
  238:     if (titleFieldName === "title") return;
  239:     doc.title = doc[titleFieldName] ?? doc.title;
  240    },
  241  },
  242      {
  243        name: "name",
  244        fetch: true,
  245        hidden: 0,
  246        in_list_view: 1,
  247        fieldtype: "Data",
  248        onCreate: (run_doc) => {
  249          const doc = run_doc.target?.data?.[0];

CW-run.js:
  751      if (schema && !sel) {
  752        const viewFieldFlag = `in_${activeView}_view`;
  753        const hasViewFields = schema.fields.some((f) => f[viewFieldFlag]);
  754        const shouldFilter = activeView === "list" || hasViewFields;
  755  
  756        if (shouldFilter) {
  757          const flagToUse = hasViewFields ? viewFieldFlag : "in_list_view";
  758          const viewFields = schema.fields
  759            .filter((f) => f[flagToUse])
  760            .map((f) => f.fieldname);
  761:         const titleField = schema.title_field ? [schema.title_field] : [];
  762:         const fields = [...new Set([...titleField, ...viewFields])];
  763          run_doc.target.data = run_doc.target.data.map((item) => {
  764            const filtered = {};
  765            fields.forEach((f) => {
  766              if (f in item) filtered[f] = item[f];
  767            });
  768            return filtered;
  769          });
  770        }
  771      } else if (sel && Array.isArray(sel)) {
  772:       const titleField = schema?.title_field ? [schema.title_field] : [];
  773        const systemFields = CW.defaultFields || [];
  774:       const allFields = [...new Set([...systemFields, ...titleField, ...sel])];
  775        run_doc.target.data = run_doc.target.data.map((item) => {
  776          const filtered = {};
  777          allFields.forEach((f) => {
  778            if (f in item) filtered[f] = item[f];
  779          });
  780          return filtered;
  781        });
  782      }
  783  
  784      // expand child fields for form view — after data is ready

CW-utils.js:
  685            : "=";
  686          filters.push(`${path} ${op} "${val}"`);
  687          continue;
  688        }
  689      }
  690      text.push(part);
  691    }
  692  
  693    if (text.length) {
  694      const textTerm = text.join(" ");
  695:     const titleField = schema?.title_field || "name";
  696  
  697      // title_field always first
  698:     const titlePath = CW._config.LevelFields.has(titleField)
  699:       ? titleField
  700:       : `data.${titleField}`;
  701  
  702      // all search_index fields
  703      const searchFields = (schema?.fields || []).filter(
  704:       (f) => f.search_index && f.fieldname !== titleField,
  705      );
  706  
  707      const searchParts = [
  708        `${titlePath} ~ "${textTerm}"`,
  709        ...searchFields.map((f) => {
  710          const path = CW._config.topLevelFields.has(f.fieldname)
  711            ? f.fieldname
  712            : `data.${f.fieldname}`;
  713          return `${path} ~ "${textTerm}"`;
  714        }),
Show less
The flow for title top-level field with Task (title_field: "subject"):

On create:

input: { subject: 'Test Task' }
  → _mergeInput → doc.subject = 'Test Task'
  → _preflight → systemFields onCreate
    → title onCreate:
        titleFieldName = schema.title_field = 'subject'
        titleFieldName !== 'title' → doc.title = doc['subject'] = 'Test Task'
  → _splitRecord:
        title in topLevelFields → top.title = 'Test Task'
        subject not in topLevelFields → data.subject = 'Test Task'
  → D1 INSERT: title column = 'Test Task', data blob has subject
On select list view:

_handlers.select filters to in_list_view fields + title_field
  titleField = schema.title_field = 'subject'
  fields = [...titleField, ...viewFields] = ['subject', 'name', 'status', ...]
  subject included in filtered result ✅
The issue — title is in topLevelFields but Task's display field is subject. So:

D1 title column stores the value for fast search/sort
data.subject stores the same value in blob
_mergeRecord copies title from top-level column into flat doc
Result has both title and subject with same value
This is intentional — title column is the universal search/sort field across all doctypes, while subject is the Task-specific field name.