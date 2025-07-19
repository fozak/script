//Autosaving form data with dynamic fields in PocketBase
//https://chatgpt.com/c/6879445b-6560-8007-90dd-8880568c938f


(function () {
  if (typeof pb === 'undefined') {
    console.error('PocketBase instance (pb) not found. Make sure PocketBase is initialized.');
    return;
  }

  if (typeof selectedTarget === 'undefined' || !selectedTarget) {
    console.error('selectedTarget not found. Make sure a record is selected.');
    return;
  }

  const cssLinks = [
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css'
  ];
  cssLinks.forEach(href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  });

  class UniversalFrappeForm {
    constructor(container, record) {
      this.container = container;
      this.record = record;
      this.schema = null;
      this.formData = record.data ? { ...record.data } : {};
      this.originalData = { ...this.formData };
      this.hasChanges = false;
      this.fieldElements = {};
      this.init();
    }

    async init() {
      try {
        await this.loadSchema();
        await this.render();
      } catch (error) {
        console.error('Failed to initialize form:', error);
        this.showError(`Failed to load form: ${error.message}`);
      }
    }

    async loadSchema() {
      const doctype = this.record.doctype;
      try {
        if (this.record.meta && this.record.meta.schema) {
          const schemaRecords = await pb.collection('item').getList(1, 1, {
            filter: `name = "${this.record.meta.schema}"`
          });
          if (schemaRecords.items.length > 0) {
            this.schema = schemaRecords.items[0].data;
            return;
          }
        }
        const schemaRecords = await pb.collection('item').getList(1, 1, {
          filter: `doctype = "Schema" && data.name = "${doctype}"`
        });
        if (schemaRecords.items.length > 0) {
          this.schema = schemaRecords.items[0].data;
          return;
        }
        throw new Error(`No schema found for doctype: ${doctype}`);
      } catch (error) {
        throw new Error(`Error loading schema: ${error.message}`);
      }
    }

    getFieldType(fieldDef) {
      const fieldtype = fieldDef.fieldtype;
      switch (fieldtype) {
        case 'Data':
        case 'Link':
        case 'Dynamic Link':
          return 'select';
        case 'Int':
        case 'Float':
        case 'Currency':
        case 'Percent':
          return 'number';
        case 'Date':
          return 'date';
        case 'Datetime':
          return 'datetime-local';
        case 'Time':
          return 'time';
        case 'Check':
          return 'checkbox';
        case 'Select':
          return 'select';
        case 'Text':
        case 'Small Text':
        case 'Text Editor':
        case 'Code':
          return 'textarea';
        case 'Color':
          return 'color';
        case 'Password':
          return 'password';
        default:
          return 'text';
      }
    }

    getTitleField(doctype) {
      return this.schema?.title_field || 'subject';
    }

    async createFieldElement(fieldDef) {
      const fieldType = this.getFieldType(fieldDef);
      const fieldName = fieldDef.fieldname;
      const fieldValue = this.formData[fieldName] || '';
      let element;

      if (fieldDef.fieldtype === 'Link' || fieldDef.fieldtype === 'Dynamic Link') {
        element = document.createElement('select');
        element.className = 'form-control';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.innerText = '-- Select --';
        element.appendChild(emptyOption);

        let targetDoctype = null;
        if (fieldDef.fieldtype === 'Link') {
          targetDoctype = fieldDef.options;
        } else if (fieldDef.fieldtype === 'Dynamic Link') {
          const dynamicField = fieldDef.options;
          targetDoctype = this.formData[dynamicField];

          const updateDynamicOptions = async () => {
            if (!targetDoctype) return;
            element.innerHTML = '';
            element.appendChild(emptyOption);
            try {
              const records = await pb.collection('item').getFullList({
                filter: `doctype = "${targetDoctype}"`
              });
              records.forEach(record => {
                const option = document.createElement('option');
                option.value = record.name;
                const title = record.data[this.getTitleField(targetDoctype)] || record.name;
                option.innerText = title;
                if (this.formData[fieldName] === record.name) option.selected = true;
                element.appendChild(option);
              });
            } catch (error) {
              console.error(`Error fetching ${targetDoctype} records:`, error);
            }
          };

          if (!targetDoctype) {
            const option = document.createElement('option');
            option.disabled = true;
            option.innerText = 'Select ' + dynamicField + ' first';
            element.appendChild(option);
            return { element, input: element };
          } else {
            await updateDynamicOptions();

            // Bind change listener to source field for dynamic updates
            const sourceField = this.fieldElements[dynamicField];
            if (sourceField) {
              sourceField.addEventListener('change', async () => {
                this.formData[dynamicField] = sourceField.value;
                targetDoctype = sourceField.value; // update targetDoctype for this call
                await updateDynamicOptions();
              });
            }
          }
        }

        if (targetDoctype && fieldDef.fieldtype === 'Link') {
          try {
            const records = await pb.collection('item').getFullList({
              filter: `doctype = "${targetDoctype}"`
            });
            records.forEach(record => {
              const option = document.createElement('option');
              option.value = record.name;
              const title = record.data[this.getTitleField(targetDoctype)] || record.name;
              option.innerText = title;
              if (fieldValue === record.name) option.selected = true;
              element.appendChild(option);
            });
          } catch (error) {
            console.error(`Error fetching ${targetDoctype} records:`, error);
          }
        }
      } else {
        element = document.createElement('input');
        element.type = fieldType;
        element.className = 'form-control';
        element.value = fieldValue;
      }

      element.addEventListener('change', (e) => {
        this.handleFieldChange(fieldName, e.target.value, fieldDef);
      });

      this.fieldElements[fieldName] = element;
      return { element, input: element };
    }

    handleFieldChange(fieldName, value, fieldDef) {
      let convertedValue = value;
      switch (fieldDef.fieldtype) {
        case 'Int':
          convertedValue = value === '' ? null : parseInt(value);
          break;
        case 'Float':
        case 'Currency':
        case 'Percent':
          convertedValue = value === '' ? null : parseFloat(value);
          break;
        case 'Check':
          convertedValue = value ? 1 : 0;
          break;
      }
      this.formData[fieldName] = convertedValue;
      this.checkForChanges();
    }

    checkForChanges() {
      this.hasChanges = JSON.stringify(this.formData) !== JSON.stringify(this.originalData);
    }

    showError(message) {
      console.error(message);
    }

    async render() {
      this.container.innerHTML = '';
      const formLayout = document.createElement('div');
      formLayout.className = 'form-layout';
      this.container.appendChild(formLayout);

      const fieldOrder = this.schema.field_order || [];
      const fieldsMap = {};
      this.schema.fields.forEach(field => {
        fieldsMap[field.fieldname] = field;
      });

      for (const fieldName of fieldOrder) {
        const fieldDef = fieldsMap[fieldName];
        if (!fieldDef) continue;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group mb-3';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.innerText = fieldDef.label;
        formGroup.appendChild(label);

        const fieldResult = await this.createFieldElement(fieldDef);
        formGroup.appendChild(fieldResult.element);

        this.fieldElements[fieldName] = fieldResult.input;

        formLayout.appendChild(formGroup);
      }
    }
  }

  let container = document.getElementById('universal-form-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'universal-form-container';
    document.body.appendChild(container);
  }

  new UniversalFrappeForm(container, selectedTarget);
})();
