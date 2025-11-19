// ============================================================
// COWORKER STYLES - Style Configuration
// ============================================================

window.CWStyles = {
  theme: 'light',
  
  switchTheme: function(theme) {
    this.theme = theme;
    document.body.dataset.theme = theme;
  },

  // Component-specific class groups
  form: {
    wrapper: 'cw-form',
    section: 'cw-form-section',
    sectionLabel: 'cw-form-section-label',
    row: 'cw-form-row',
    column: 'cw-form-col',
    fieldWrapper: 'cw-field-wrapper',
    label: 'cw-form-label'
  },

  field: {
    input: 'cw-field-input',
    select: 'cw-field-select',
    textarea: 'cw-field-textarea',
    link: 'cw-field-link',
    linkInput: 'cw-field-link-input',
    linkDropdown: 'cw-field-link-dropdown',
    html: 'cw-field-html'
  },

  grid: {
    wrapper: 'cw-grid',
    header: 'cw-grid-header',
    body: 'cw-grid-body',
    row: 'cw-grid-row',
    cell: 'cw-grid-cell',
    toolbar: 'cw-grid-toolbar'
  },

  chat: {
    wrapper: 'cw-chat',
    messages: 'cw-chat-messages',
    message: 'cw-chat-message',
    messageUser: 'cw-chat-message-user',
    messageAI: 'cw-chat-message-ai',
    input: 'cw-chat-input',
    inputWrapper: 'cw-chat-input-wrapper'
  },

  // Bootstrap-like utilities
  input: {
    base: 'cw-input',
    sm: 'cw-input-sm',
    lg: 'cw-input-lg',
    bold: 'cw-font-bold',
    readOnly: 'cw-input-readonly'
  },

  button: {
    primary: 'cw-btn cw-btn-primary cw-btn-sm',
    secondary: 'cw-btn cw-btn-secondary cw-btn-sm',
    danger: 'cw-btn cw-btn-danger cw-btn-sm',
    success: 'cw-btn cw-btn-success cw-btn-sm',
    warning: 'cw-btn cw-btn-warning cw-btn-sm',
    info: 'cw-btn cw-btn-info cw-btn-sm',
    light: 'cw-btn cw-btn-light cw-btn-sm',
    dark: 'cw-btn cw-btn-dark cw-btn-sm',
    link: 'cw-btn cw-btn-link cw-btn-sm',
    xs: 'cw-btn cw-btn-xs'
  },

  table: {
    base: 'cw-table',
    striped: 'cw-table-striped',
    bordered: 'cw-table-bordered',
    borderless: 'cw-table-borderless',
    responsive: 'cw-table-responsive',
    head: 'cw-thead-dark',
    headLight: 'cw-thead-light'
  },

  badge: {
    primary: 'cw-badge-primary',
    secondary: 'cw-badge-secondary',
    success: 'cw-badge-success',
    danger: 'cw-badge-danger',
    warning: 'cw-badge-warning',
    info: 'cw-badge-info',
    light: 'cw-badge-light',
    dark: 'cw-badge-dark',
    pill: 'cw-badge-pill'
  },

  alert: {
    primary: 'cw-alert cw-alert-primary',
    secondary: 'cw-alert cw-alert-secondary',
    success: 'cw-alert cw-alert-success',
    danger: 'cw-alert cw-alert-danger',
    warning: 'cw-alert cw-alert-warning',
    info: 'cw-alert cw-alert-info',
    light: 'cw-alert cw-alert-light',
    dark: 'cw-alert cw-alert-dark',
    dismissible: 'cw-alert-dismissible'
  },

  text: {
    left: 'cw-text-left',
    center: 'cw-text-center',
    right: 'cw-text-right',
    muted: 'cw-text-muted',
    primary: 'cw-text-primary',
    secondary: 'cw-text-secondary',
    success: 'cw-text-success',
    danger: 'cw-text-danger',
    warning: 'cw-text-warning',
    info: 'cw-text-info',
    small: 'cw-small',
    bold: 'cw-font-bold',
    italic: 'cw-italic',
    monospace: 'cw-monospace'
  },

  spacing: {
    m0: 'cw-m-0', m1: 'cw-m-1', m2: 'cw-m-2', m3: 'cw-m-3', m4: 'cw-m-4', m5: 'cw-m-5',
    mt0: 'cw-mt-0', mt1: 'cw-mt-1', mt2: 'cw-mt-2', mt3: 'cw-mt-3',
    mb0: 'cw-mb-0', mb1: 'cw-mb-1', mb2: 'cw-mb-2', mb3: 'cw-mb-3',
    p0: 'cw-p-0', p1: 'cw-p-1', p2: 'cw-p-2', p3: 'cw-p-3', p4: 'cw-p-4', p5: 'cw-p-5',
    pt0: 'cw-pt-0', pt1: 'cw-pt-1', pt2: 'cw-pt-2', pt3: 'cw-pt-3',
    pb0: 'cw-pb-0', pb1: 'cw-pb-1', pb2: 'cw-pb-2', pb3: 'cw-pb-3'
  },

  display: {
    none: 'cw-d-none',
    block: 'cw-d-block',
    flex: 'cw-d-flex',
    inlineFlex: 'cw-d-inline-flex'
  },

  flex: {
    row: 'cw-flex-row',
    column: 'cw-flex-column',
    wrap: 'cw-flex-wrap',
    nowrap: 'cw-flex-nowrap'
  },

  justify: {
    start: 'cw-justify-start',
    end: 'cw-justify-end',
    center: 'cw-justify-center',
    between: 'cw-justify-between',
    around: 'cw-justify-around'
  },

  align: {
    start: 'cw-align-start',
    end: 'cw-align-end',
    center: 'cw-align-center',
    stretch: 'cw-align-stretch'
  }
};