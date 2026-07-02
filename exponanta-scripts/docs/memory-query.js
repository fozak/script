const doctype = "Task";

const schema = await coworker.run({
  operation: "select",
  doctype: "Schema",
  query: {
    where: { _schema_doctype: doctype },
    take: 1,
  },
  view: "form",
  options: { includeSchema: false, skipController: true, adapter: "memory" },
});

const schemas = await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  options: { adapter: "memory" },
});

coworker.getSchema = async function (doctype) {
  // Check cache first
  if (this._schemaCache.has(doctype)) {
    return this._schemaCache.get(doctype);
  }

  try {
    const result = await this.run({
      operation: "select",
      doctype: "Schema",
      query: {
        where: { _schema_doctype: doctype },
        take: 1,
      },
      component: null,
      container: null,
      options: { includeSchema: false, skipController: true },
    });

    if (
      !result.success ||
      !result.output?.data ||
      result.output.data.length === 0
    ) {
      console.warn(`Schema not found for: ${doctype}`);
      return null;
    }

    const schema = result.output.data[0];
    this._schemaCache.set(doctype, schema);
    return schema;
  } catch (error) {
    console.error(`Error fetching schema for ${doctype}:`, error);
    return null;
  }
};
