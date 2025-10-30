//v9 formfield https://claude.ai/chat/fea446a7-9a56-48f0-86bc-0bebbceddb8e

// ============================================================================
// POCKETBASE CLIENT INITIALIZATION
// ============================================================================

window.pb = window.pb || new PocketBase("http://143.198.29.88:8090/");
// DISABLE auto-cancellation properly in UMD build
window.pb.autoCancellation(false);


// Global config
window.MAIN_COLLECTION = window.MAIN_COLLECTION || 'item';
//window.currentUser = null;  // Initialize global user state
window.currentUser = pb.authStore.model;


// Connect function (keeps your functions intact)
async function connectToPocketBase() {
  const statusDiv = document.getElementById('status');
  try {
    // Test connection
    await pb.collection('item').getList(1, 1);

    statusDiv.textContent = 'Connected';
    statusDiv.className = 'mt-2 p-2 rounded text-sm bg-green-100 text-green-800';

    await loadRenderCode();
    setupSearch();

  } catch (error) {
    statusDiv.textContent = 'Failed to connect';
    statusDiv.className = 'mt-2 p-2 rounded text-sm bg-red-100 text-red-800';
  }
}


// ============================================================================
// Styles
// ============================================================================

  
  pb.BS = {
    // Form Controls
    input: {
      base: 'form-control',
      sm: 'form-control-sm',
      lg: 'form-control-lg',
      bold: 'font-weight-bold',
      readOnly: 'form-control-plaintext'
    },
    
    // Buttons
    button: {
      primary: 'btn btn-primary btn-sm',
      secondary: 'btn btn-secondary btn-sm',
      danger: 'btn btn-danger btn-sm',
      success: 'btn btn-success btn-sm',
      warning: 'btn btn-warning btn-sm',
      info: 'btn btn-info btn-sm',
      light: 'btn btn-light btn-sm',
      dark: 'btn btn-dark btn-sm',
      link: 'btn btn-link btn-sm',
      xs: 'btn btn-sm px-2 py-1'
    },
    
    // Tables
    table: {
      base: 'table table-sm table-hover',
      striped: 'table-striped',
      bordered: 'table-bordered',
      borderless: 'table-borderless',
      responsive: 'table-responsive',
      head: 'thead-dark',
      headLight: 'thead-light',
      active: 'table-active',
      primary: 'table-primary',
      secondary: 'table-secondary',
      success: 'table-success',
      danger: 'table-danger',
      warning: 'table-warning',
      info: 'table-info'
    },
    
    // Grid/Columns (Bootstrap 4)
    col: {
      auto: 'col',
      full: 'col-12',
      half: 'col-6',
      third: 'col-4',
      twoThirds: 'col-8',
      quarter: 'col-3',
      threeQuarters: 'col-9',
      // Responsive columns
      sm6: 'col-sm-6',
      sm4: 'col-sm-4',
      md4: 'col-md-4',
      md6: 'col-md-6',
      lg3: 'col-lg-3',
      lg4: 'col-lg-4',
      lg6: 'col-lg-6'
    },
    
    // Badges
    badge: {
      primary: 'badge badge-primary',
      secondary: 'badge badge-secondary',
      success: 'badge badge-success',
      danger: 'badge badge-danger',
      warning: 'badge badge-warning',
      info: 'badge badge-info',
      light: 'badge badge-light',
      dark: 'badge badge-dark',
      pill: 'badge-pill'
    },
    
    // Alerts
    alert: {
      primary: 'alert alert-primary',
      secondary: 'alert alert-secondary',
      success: 'alert alert-success',
      danger: 'alert alert-danger',
      warning: 'alert alert-warning',
      info: 'alert alert-info',
      light: 'alert alert-light',
      dark: 'alert alert-dark',
      dismissible: 'alert-dismissible fade show'
    },
    
    // Text utilities
    text: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
      muted: 'text-muted',
      primary: 'text-primary',
      secondary: 'text-secondary',
      success: 'text-success',
      danger: 'text-danger',
      warning: 'text-warning',
      info: 'text-info',
      light: 'text-light',
      dark: 'text-dark',
      white: 'text-white',
      // Sizes
      small: 'small',
      lead: 'lead',
      // Decorations
      lowercase: 'text-lowercase',
      uppercase: 'text-uppercase',
      capitalize: 'text-capitalize',
      // Weights
      bold: 'font-weight-bold',
      bolder: 'font-weight-bolder',
      normal: 'font-weight-normal',
      light: 'font-weight-light',
      lighter: 'font-weight-lighter',
      italic: 'font-italic',
      monospace: 'text-monospace'
    },
    
    // Background colors
    bg: {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      success: 'bg-success',
      danger: 'bg-danger',
      warning: 'bg-warning',
      info: 'bg-info',
      light: 'bg-light',
      dark: 'bg-dark',
      white: 'bg-white',
      transparent: 'bg-transparent'
    },
    
    // Display utilities
    display: {
      none: 'd-none',
      inline: 'd-inline',
      inlineBlock: 'd-inline-block',
      block: 'd-block',
      table: 'd-table',
      tableCell: 'd-table-cell',
      tableRow: 'd-table-row',
      flex: 'd-flex',
      inlineFlex: 'd-inline-flex',
      // Responsive display
      smNone: 'd-none d-sm-block',
      mdNone: 'd-none d-md-block',
      lgNone: 'd-none d-lg-block',
      smBlock: 'd-sm-block',
      mdBlock: 'd-md-block',
      lgBlock: 'd-lg-block'
    },
    
    // Flexbox utilities
    flex: {
      row: 'flex-row',
      rowReverse: 'flex-row-reverse',
      column: 'flex-column',
      columnReverse: 'flex-column-reverse',
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      wrapReverse: 'flex-wrap-reverse',
      fill: 'flex-fill',
      grow0: 'flex-grow-0',
      grow1: 'flex-grow-1',
      shrink0: 'flex-shrink-0',
      shrink1: 'flex-shrink-1'
    },
    
    // Justify content
    justify: {
      start: 'justify-content-start',
      end: 'justify-content-end',
      center: 'justify-content-center',
      between: 'justify-content-between',
      around: 'justify-content-around'
    },
    
    // Align items
    align: {
      start: 'align-items-start',
      end: 'align-items-end',
      center: 'align-items-center',
      baseline: 'align-items-baseline',
      stretch: 'align-items-stretch'
    },
    
    // Spacing (Bootstrap 4 scale: 0-5)
    spacing: {
      // Margin
      m0: 'm-0', m1: 'm-1', m2: 'm-2', m3: 'm-3', m4: 'm-4', m5: 'm-5',
      mt0: 'mt-0', mt1: 'mt-1', mt2: 'mt-2', mt3: 'mt-3', mt4: 'mt-4', mt5: 'mt-5',
      mb0: 'mb-0', mb1: 'mb-1', mb2: 'mb-2', mb3: 'mb-3', mb4: 'mb-4', mb5: 'mb-5',
      ml0: 'ml-0', ml1: 'ml-1', ml2: 'ml-2', ml3: 'ml-3', ml4: 'ml-4', ml5: 'ml-5',
      mr0: 'mr-0', mr1: 'mr-1', mr2: 'mr-2', mr3: 'mr-3', mr4: 'mr-4', mr5: 'mr-5',
      mx0: 'mx-0', mx1: 'mx-1', mx2: 'mx-2', mx3: 'mx-3', mx4: 'mx-4', mx5: 'mx-5',
      my0: 'my-0', my1: 'my-1', my2: 'my-2', my3: 'my-3', my4: 'my-4', my5: 'my-5',
      // Padding
      p0: 'p-0', p1: 'p-1', p2: 'p-2', p3: 'p-3', p4: 'p-4', p5: 'p-5',
      pt0: 'pt-0', pt1: 'pt-1', pt2: 'pt-2', pt3: 'pt-3', pt4: 'pt-4', pt5: 'pt-5',
      pb0: 'pb-0', pb1: 'pb-1', pb2: 'pb-2', pb3: 'pb-3', pb4: 'pb-4', pb5: 'pb-5',
      pl0: 'pl-0', pl1: 'pl-1', pl2: 'pl-2', pl3: 'pl-3', pl4: 'pl-4', pl5: 'pl-5',
      pr0: 'pr-0', pr1: 'pr-1', pr2: 'pr-2', pr3: 'pr-3', pr4: 'pr-4', pr5: 'pr-5',
      px0: 'px-0', px1: 'px-1', px2: 'px-2', px3: 'px-3', px4: 'px-4', px5: 'px-5',
      py0: 'py-0', py1: 'py-1', py2: 'py-2', py3: 'py-3', py4: 'py-4', py5: 'py-5',
      // Auto margins
      mAuto: 'm-auto',
      mtAuto: 'mt-auto',
      mbAuto: 'mb-auto',
      mlAuto: 'ml-auto',
      mrAuto: 'mr-auto',
      mxAuto: 'mx-auto',
      myAuto: 'my-auto'
    },
    
    // Form groups and layout
    form: {
      group: 'form-group',
      row: 'form-row',
      inline: 'form-inline',
      label: 'form-label',
      text: 'form-text',
      check: 'form-check',
      checkInput: 'form-check-input',
      checkLabel: 'form-check-label',
      checkInline: 'form-check-inline'
    },
    
    // Cards
    card: {
      base: 'card',
      header: 'card-header',
      body: 'card-body',
      footer: 'card-footer',
      title: 'card-title',
      subtitle: 'card-subtitle',
      text: 'card-text',
      img: 'card-img',
      imgTop: 'card-img-top',
      imgBottom: 'card-img-bottom',
      imgOverlay: 'card-img-overlay'
    },
    
    // Borders
    border: {
      base: 'border',
      top: 'border-top',
      bottom: 'border-bottom',
      left: 'border-left',
      right: 'border-right',
      none: 'border-0',
      primary: 'border-primary',
      secondary: 'border-secondary',
      success: 'border-success',
      danger: 'border-danger',
      warning: 'border-warning',
      info: 'border-info',
      light: 'border-light',
      dark: 'border-dark',
      white: 'border-white'
    },
    
    // Rounded corners
    rounded: {
      base: 'rounded',
      top: 'rounded-top',
      bottom: 'rounded-bottom',
      left: 'rounded-left',
      right: 'rounded-right',
      circle: 'rounded-circle',
      pill: 'rounded-pill',
      none: 'rounded-0',
      sm: 'rounded-sm',
      lg: 'rounded-lg'
    },
    
    // Shadows
    shadow: {
      none: 'shadow-none',
      sm: 'shadow-sm',
      base: 'shadow',
      lg: 'shadow-lg'
    },
    
    // Spinner/Loading
    spinner: 'spinner-border spinner-border-sm',
    spinnerGrow: 'spinner-grow spinner-grow-sm',
    
    // Misc utilities
    util: {
      clearfix: 'clearfix',
      float: {
        left: 'float-left',
        right: 'float-right',
        none: 'float-none'
      },
      overflow: {
        auto: 'overflow-auto',
        hidden: 'overflow-hidden'
      },
      position: {
        static: 'position-static',
        relative: 'position-relative',
        absolute: 'position-absolute',
        fixed: 'position-fixed',
        sticky: 'position-sticky'
      },
      cursor: {
        pointer: 'cursor-pointer'
      },
      userSelect: {
        none: 'user-select-none'
      },
      stretched: 'stretched-link',
      truncate: 'text-truncate',
      visible: 'visible',
      invisible: 'invisible',
      screenReader: 'sr-only'
    }
  };

 


  // ============================================================================

  pb.getSelectBadgeColor = function(value) {
    if (!value) return 'secondary';
    
    const lowerValue = value.toLowerCase();
    
    // Status mappings to Bootstrap badge colors
    if (['draft', 'pending', 'open'].includes(lowerValue)) return 'warning';
    if (['submitted', 'approved', 'completed', 'active'].includes(lowerValue)) return 'success';
    if (['cancelled', 'rejected', 'closed', 'inactive'].includes(lowerValue)) return 'danger';
    if (['hold', 'suspended'].includes(lowerValue)) return 'info';
    
    return 'primary';
  };