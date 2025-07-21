(function () {
  // PocketBase instance should be available globally
  if (typeof pb === 'undefined') {
    console.error('PocketBase instance (pb) not found. Make sure PocketBase is initialized.');
    return;
  }

  // Global variable to store the selected record data
  if (typeof selectedTarget === 'undefined' || !selectedTarget) {
    console.error('selectedTarget not found. Make sure a record is selected.');
    return;
  }

  console.log('Loading Universal Frappe Form Widget with Real-time Updates...');

  // Load CSS
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
      this.sections = {};
      this.fieldElements = {};
      this.currentRow = [];
      
      // Real-time subscription properties
      this.subscription = null;
      this.isExternalUpdate = false;
      this.conflictDetected = false;
      this.pendingExternalData = null;

      this.init();
    }

    async init() {
      try {
        await this.loadSchema();
        await this.render();
        await this.setupRealTimeSubscription();
      } catch (error) {
        console.error('Failed to initialize form:', error);
        this.showError(`Failed to load form: ${error.message}`);
      }
    }

    async setupRealTimeSubscription() {
      try {
        this.subscription = await pb.collection('item').subscribe(this.record.id, (e) => {
          this.handleRealTimeUpdate(e);
        });
        console.log(`Real-time subscription established for record: ${this.record.id}`);
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
      }
    }

    handleRealTimeUpdate(event) {
      if (this.isExternalUpdate) return;

      console.log('Real-time update received:', event);

      switch (event.action) {
        case 'update':
          this.handleExternalUpdate(event.record);
          break;
        case 'delete':
          this.handleRecordDeleted();
          break;
      }
    }

    handleExternalUpdate(updatedRecord) {
      const newData = updatedRecord.data || {};
      
      if (this.hasChanges) {
        this.conflictDetected = true;
        this.showConflictWarning(newData);
      } else {
        this.applyExternalUpdate(newData);
      }
    }

    applyExternalUpdate(newData) {
      this.isExternalUpdate = true;
      
      this.formData = { ...newData };
      this.originalData = { ...newData };
      this.record.data = { ...newData };
      selectedTarget.data = { ...newData };
      
      this.updateFormFields();
      this.checkForChanges();
      
      this.showMessage('Form updated with latest changes', 'info');
      this.isExternalUpdate = false;
    }

    updateFormFields() {
      Object.keys(this.fieldElements).forEach(fieldName => {
        const fieldElement = this.fieldElements[fieldName];
        const fieldDef = this.getFieldDefinition(fieldName);
        
        if (fieldElement && fieldDef) {
          const newValue = this.formatFieldValue(this.formData[fieldName], fieldDef);
          
          if (fieldElement.type === 'checkbox') {
            fieldElement.checked = newValue;
          } else {
            fieldElement.value = newValue;
          }
        }
      });
    }

    showConflictWarning(newData) {
      const existingAlerts = this.container.querySelectorAll('.alert-warning');
      existingAlerts.forEach(alert => alert.remove());

      const alert = document.createElement('div');
      alert.className = 'alert alert-warning alert-dismissible';
      alert.innerHTML = `
        <strong>Conflict Detected!</strong> This record has been modified by another user.
        <div class="mt-2">
          <button class="btn btn-sm btn-warning me-2" onclick="this.closest('.frappe-form').frappeForm.acceptExternal()">
            Accept External Changes
          </button>
          <button class="btn btn-sm btn-outline-warning me-2" onclick="this.closest('.frappe-form').frappeForm.showDiff()">
            Show Differences
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="this.closest('.alert').remove()">
            Dismiss
          </button>
        </div>
      `;

      const formBody = this.container.querySelector('.form-layout');
      formBody.insertBefore(alert, formBody.firstChild);
      this.pendingExternalData = newData;
      this.container.querySelector('.frappe-form').frappeForm = this;
    }

    acceptExternal() {
      if (this.pendingExternalData) {
        this.applyExternalUpdate(this.pendingExternalData);
        this.conflictDetected = false;
        this.pendingExternalData = null;
        
        const alert = this.container.querySelector('.alert-warning');
        if (alert) alert.remove();
      }
    }

    getFieldDefinition(fieldName) {
      return this.schema?.fields?.find(f => f.fieldname === fieldName);
    }

    handleRecordDeleted() {
      this.showError('This record has been deleted by another user.');
      const formElements = this.container.querySelectorAll('input, select, textarea, button');
      formElements.forEach(el => el.disabled = true);
    }

    destroy() {
      if (this.subscription) {
        pb.collection('item').unsubscribe(this.subscription);
        console.log('Real-time subscription cleaned up');
      }
    }

    // ALL YOUR EXISTING METHODS GO HERE (loadSchema, getFieldType, createFieldElement, etc.)
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

    getFieldOptions(fieldDef) {
      if (fieldDef.options && typeof fieldDef.options === 'string') {
        return fieldDef.options.split('\n').filter(option => option.trim());
      }
      return [];
    }

    isFieldHidden(fieldDef) {
      return fieldDef.hidden === 1 || 
             fieldDef.fieldtype === 'Section Break' ||
             fieldDef.fieldtype === 'Column Break';
    }

    isFieldReadOnly(fieldDef) {
      return fieldDef.read_only === 1;
    }

    isFieldRequired(fieldDef) {
      return fieldDef.reqd === 1;
    }

    isFieldBold(fieldDef) {
      return fieldDef.bold === 1;
    }

    formatFieldValue(value, fieldDef) {
      if (value === null || value === undefined) return '';
      const fieldtype = fieldDef.fieldtype;

      switch (fieldtype) {
        case 'Date':
          return new Date(value).toISOString().split('T')[0];
        case 'Datetime':
          return new Date(value).toISOString().slice(0, 16);
        case 'Check':
          return value ? true : false;
        case 'Float':
        case 'Currency':
        case 'Percent':
          return parseFloat(value) || 0;
        case 'Int':
          return parseInt(value) || 0;
        default:
          return value;
      }
    }

    getTitleField(doctype) {
      return this.schema?.title_field || 'subject';
    }

    async createFieldElement(fieldDef) {
      const fieldType = this.getFieldType(fieldDef);
      const fieldName = fieldDef.fieldname;
      const fieldValue = this.formatFieldValue(this.formData[fieldName], fieldDef);
      let element;

      if (fieldDef.fieldtype === 'Link') {
        element = document.createElement('select');
        element.className = 'form-control';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.innerText = '-- Select --';
        element.appendChild(emptyOption);

        if (fieldDef.options) {
          try {
            const records = await pb.collection('item').getFullList({
              filter: `doctype = "${fieldDef.options}"`
            });

            records.forEach(record => {
              const option = document.createElement('option');
              option.value = record.name;
              const title = record.data[this.getTitleField(fieldDef.options)] || record.name;
              option.innerText = title;
              if (fieldValue === record.name) option.selected = true;
              element.appendChild(option);
            });
          } catch (error) {
            console.error(`Error fetching ${fieldDef.options} records:`, error);
          }
        }
      } else if (fieldType === 'select') {
        element = document.createElement('select');
        element.className = 'form-control';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '';
        element.appendChild(emptyOption);

        const options = this.getFieldOptions(fieldDef);
        options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option;
          optionElement.textContent = option;
          if (fieldValue === option) optionElement.selected = true;
          element.appendChild(optionElement);
        });
      } else if (fieldType === 'textarea') {
        element = document.createElement('textarea');
        element.className = 'form-control';
        element.rows = fieldDef.fieldtype === 'Text Editor' ? 8 : 3;
        element.value = fieldValue;
      } else if (fieldType === 'checkbox') {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-check';

        element = document.createElement('input');
        element.type = 'checkbox';
        element.className = 'form-check-input';
        element.checked = fieldValue;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.textContent = fieldDef.label;

        wrapper.appendChild(element);
        wrapper.appendChild(label);
        return { element: wrapper, input: element };
      } else {
        element = document.createElement('input');
        element.type = fieldType;
        element.className = 'form-control';
        element.value = fieldValue;
      }

      if (this.isFieldReadOnly(fieldDef)) element.readOnly = true;
      if (this.isFieldBold(fieldDef)) element.style.fontWeight = 'bold';

      element.addEventListener('change', (e) => {
        this.handleFieldChange(fieldName, e.target.type === 'checkbox' ? e.target.checked : e.target.value, fieldDef);
      });

      return { element, input: element };
    }

    handleFieldChange(fieldName, value, fieldDef) {
      let convertedValue = value;
      switch (fieldDef.fieldtype) {
        case 'Int': convertedValue = value === '' ? null : parseInt(value); break;
        case 'Float':
        case 'Currency':
        case 'Percent':
          convertedValue = value === '' ? null : parseFloat(value); break;
        case 'Check': convertedValue = value ? 1 : 0; break;
      }
      this.formData[fieldName] = convertedValue;
      this.checkForChanges();
    }

    checkForChanges() {
      this.hasChanges = JSON.stringify(this.formData) !== JSON.stringify(this.originalData);
      this.updateActionButtons();
    }

    updateActionButtons() {
      const saveBtn = this.container.querySelector('#save-btn');
      const resetBtn = this.container.querySelector('#reset-btn');
      if (saveBtn) {
        saveBtn.disabled = !this.hasChanges;
        saveBtn.textContent = this.hasChanges ? 'Save' : 'Saved';
        saveBtn.className = `btn ${this.hasChanges ? 'btn-primary' : 'btn-secondary'}`;
      }
      if (resetBtn) resetBtn.disabled = !this.hasChanges;
    }

    showMessage(message, type = 'success') {
      const existingAlerts = this.container.querySelectorAll('.alert');
      existingAlerts.forEach(alert => alert.remove());

      const alert = document.createElement('div');
      alert.className = `alert alert-${type === 'error' ? 'danger' : type === 'info' ? 'info' : 'success'}`;
      alert.textContent = message;

      const formBody = this.container.querySelector('.form-layout');
      formBody.insertBefore(alert, formBody.firstChild);

      setTimeout(() => alert.remove(), 5000);
    }

    showError(message) {
      this.showMessage(message, 'error');
    }

    async handleSave() {
      const saveBtn = this.container.querySelector('#save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        this.isExternalUpdate = true;
        
        await pb.collection('item').update(this.record.id, { data: this.formData });
        this.record.data = { ...this.formData };
        this.originalData = { ...this.formData };
        selectedTarget.data = { ...this.formData };
        
        this.conflictDetected = false;
        this.pendingExternalData = null;
        
        this.showMessage('Document saved successfully!');
        this.checkForChanges();
        
        const alerts = this.container.querySelectorAll('.alert-warning');
        alerts.forEach(alert => alert.remove());
        
      } catch (error) {
        console.error('Save error:', error);
        this.showError(`Error saving document: ${error.message}`);
        this.updateActionButtons();
      } finally {
        this.isExternalUpdate = false;
      }
    }

    handleReset() {
      this.formData = { ...this.originalData };
      this.render();
    }

    async render() {
      if (!this.schema || !this.schema.fields) {
        this.showError('Invalid schema data');
        return;
      }

      this.container.innerHTML = `
        <div class="frappe-form">
          <div class="form-header">
            <h1>${this.schema.name || this.record.doctype} Form</h1>
            <div class="text-muted small">
              ID: ${this.record.id} | Name: ${this.record.name} | Type: ${this.record.doctype}
            </div>
          </div>
          <div class="form-layout"></div>
          <div class="form-footer">
            <button id="save-btn" class="btn btn-secondary" disabled>Saved</button>
            <button id="reset-btn" class="btn btn-secondary" disabled>Reset</button>
            <button id="toggle-json-btn" class="btn btn-secondary">Show JSON</button>
          </div>
          <div id="json-viewer" class="mt-3" style="display: none;">
            <div class="card"><div class="card-header">Document JSON Data</div>
              <div class="card-body">
                <pre class="mb-0"><code id="json-content"></code></pre>
              </div>
            </div>
          </div>
        </div>
      `;

      const formLayout = this.container.querySelector('.form-layout');
      const fieldOrder = this.schema.field_order || [];
      const fieldsMap = Object.fromEntries(this.schema.fields.map(f => [f.fieldname, f]));

      let currentSection = null;
      let currentRow = null;

      for (const fieldName of fieldOrder) {
        const fieldDef = fieldsMap[fieldName];
        if (!fieldDef || this.isFieldHidden(fieldDef)) continue;

        if (fieldDef.fieldtype === 'Section Break') {
          currentSection = document.createElement('div');
          currentSection.className = 'form-section border mb-3';

          const sectionBody = document.createElement('div');
          sectionBody.className = 'section-body p-3';
          currentSection.appendChild(sectionBody);
          formLayout.appendChild(currentSection);
          currentRow = null;

        } else if (fieldDef.fieldtype === 'Column Break') {
          currentRow = null;
        } else {
          if (!currentSection) {
            currentSection = document.createElement('div');
            currentSection.className = 'form-section border mb-3';
            const sectionBody = document.createElement('div');
            sectionBody.className = 'section-body p-3';
            currentSection.appendChild(sectionBody);
            formLayout.appendChild(currentSection);
          }

          const sectionBody = currentSection.querySelector('.section-body');
          if (!currentRow) {
            currentRow = document.createElement('div');
            currentRow.className = 'row';
            sectionBody.appendChild(currentRow);
          }

          const fieldCol = document.createElement('div');
          fieldCol.className = 'col-md-6 mb-3';

          const formGroup = document.createElement('div');
          formGroup.className = 'form-group mb-3';

          const label = document.createElement('label');
          label.className = 'control-label';
          label.textContent = fieldDef.label;
          if (this.isFieldRequired(fieldDef)) label.classList.add('reqd');

          const fieldResult = await this.createFieldElement(fieldDef);
          this.fieldElements[fieldDef.fieldname] = fieldResult.input;

          formGroup.appendChild(label);
          formGroup.appendChild(fieldResult.element);

          if (fieldDef.description) {
            const helpText = document.createElement('small');
            helpText.className = 'form-text text-muted';
            helpText.textContent = fieldDef.description;
            formGroup.appendChild(helpText);
          }

          fieldCol.appendChild(formGroup);
          currentRow.appendChild(fieldCol);
        }
      }

      this.container.querySelector('#save-btn').addEventListener('click', () => this.handleSave());
      this.container.querySelector('#reset-btn').addEventListener('click', () => this.handleReset());
      this.container.querySelector('#toggle-json-btn').addEventListener('click', () => {
        const viewer = this.container.querySelector('#json-viewer');
        const content = this.container.querySelector('#json-content');
        const toggle = this.container.querySelector('#toggle-json-btn');
        if (viewer.style.display === 'none') {
          content.textContent = JSON.stringify(this.formData, null, 2);
          viewer.style.display = 'block';
          toggle.textContent = 'Hide JSON';
        } else {
          viewer.style.display = 'none';
          toggle.textContent = 'Show JSON';
        }
      });

      this.checkForChanges();
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