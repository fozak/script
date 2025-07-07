// Self-contained PDF Annotation Widget - paste this entire code into your custom_code field
// Your client script only needs: widgetCode = cur_frm.doc.custom_code; eval(widgetCode);
(function() {
  // Widget configuration and data
  const WIDGET_CONFIG = {
    "data": {
      "selectedPdf": null,
      "pdfUrl": "",
      "annotations": [],
      "currentPage": 1,
      "totalPages": 0,
      "uploadedFiles": []
    }
  };

  // PDF upload utility function
  async function uploadPdf(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/method/upload_file", {
        method: "POST",
        headers: {
          "X-Frappe-CSRF-Token": frappe.csrf_token,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: formData
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const result = await res.json();
      
      if (result && result.message && result.message.file_url) {
        console.log("✅ Uploaded PDF URL:", result.message.file_url);
        return {
          url: result.message.file_url,
          name: file.name,
          size: file.size
        };
      } else {
        throw new Error("Unexpected response structure");
      }
    } catch (error) {
      console.error("❌ PDF upload failed:", error);
      throw error;
    }
  }

  // Load dependencies
  var loadScript = (src) => {
    return new Promise((resolve, reject) => {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  console.log('Loading PDF annotation widget dependencies...');
  
  Promise.all([
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js'),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js'),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  ]).then(() => {
    
    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Initialize or load existing data
    function getWidgetData() {
      try {
        let currentValue = cur_frm.get_field('custom_code').value;
        
        // Try to extract existing data from the current code
        let dataMatch = currentValue.match(/WIDGET_CONFIG\s*=\s*({[\s\S]*?});/);
        if (dataMatch) {
          let extractedConfig = eval('(' + dataMatch[1] + ')');
          return extractedConfig.data;
        }
      } catch (error) {
        console.log('Using default widget data');
      }
      return WIDGET_CONFIG.data;
    }
    
    // Save updated data back to custom_code
    function saveWidgetData(newData) {
      try {
        let currentCode = cur_frm.get_field('custom_code').value;
        
        // Create updated config
        let updatedConfig = {
          data: newData
        };
        
        // Replace the WIDGET_CONFIG data section in the code
        let newCode = currentCode.replace(
          /WIDGET_CONFIG\s*=\s*{[\s\S]*?};/,
          `WIDGET_CONFIG = ${JSON.stringify(updatedConfig, null, 4)};`
        );
        
        // Update the field
        cur_frm.set_value('custom_code', newCode);
        cur_frm.save();
        
        console.log('Widget data saved successfully');
        return true;
      } catch (error) {
        console.error('Failed to save widget data:', error);
        return false;
      }
    }
    
    // Add styles
    if (!document.getElementById('pdf-widget-styles')) {
      var style = document.createElement('style');
      style.id = 'pdf-widget-styles';
      style.textContent = `
        .pdf-annotation-widget {
          max-width: 1200px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 12px;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif;
        }
        .widget-header {
          background: #7c3aed;
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        .widget-header h2 {
          margin: 0;
          font-size: 24px;
        }
        .pdf-controls {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .file-picker {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .file-picker input[type="file"] {
          display: none;
        }
        .file-picker label {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .file-picker label:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .file-picker label.uploading {
          background: #f59e0b;
          cursor: not-allowed;
        }
        .pdf-selector {
          flex: 1;
          min-width: 200px;
        }
        .pdf-selector select {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
        }
        .btn-secondary {
          background: #6b7280;
          color: white;
        }
        .btn-success {
          background: #10b981;
          color: white;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .pdf-viewer-container {
          display: flex;
          gap: 20px;
          min-height: 600px;
        }
        .pdf-viewer {
          flex: 2;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
          position: relative;
          overflow: hidden;
        }
        .pdf-canvas-container {
          width: 100%;
          height: 100%;
          overflow: auto;
          position: relative;
        }
        .pdf-canvas {
          display: block;
          margin: 0 auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .pdf-navigation {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          align-items: center;
          background: rgba(0,0,0,0.8);
          padding: 10px;
          border-radius: 6px;
          color: white;
        }
        .page-info {
          font-size: 14px;
          font-weight: 600;
        }
        .annotation-panel {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          padding: 15px;
          overflow-y: auto;
          max-height: 600px;
        }
        .annotation-panel h3 {
          margin: 0 0 15px 0;
          color: #1f2937;
        }
        .annotation-form {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #f9fafb;
        }
        .annotation-form textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          resize: vertical;
          min-height: 80px;
          font-family: Arial, sans-serif;
        }
        .annotation-form .form-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 10px;
        }
        .annotation-form input[type="number"] {
          width: 80px;
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .annotation-list {
          max-height: 300px;
          overflow-y: auto;
        }
        .annotation-item {
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          margin-bottom: 10px;
          background: white;
        }
        .annotation-item .annotation-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 5px;
        }
        .annotation-item .page-badge {
          background: #2563eb;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .annotation-item .annotation-text {
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
        }
        .annotation-item .annotation-actions {
          margin-top: 8px;
          display: flex;
          gap: 5px;
        }
        .annotation-item .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }
        .loading-indicator {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          color: #6b7280;
        }
        .no-pdf-message {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: #6b7280;
          text-align: center;
        }
        .no-pdf-message h3 {
          margin-bottom: 10px;
          color: #374151;
        }
      `;
      document.head.appendChild(style);
    }
    
    // React Component
    const { useState, useEffect, useRef } = React;
    
    function PdfAnnotationWidget() {
      const [formData, setFormData] = useState(getWidgetData());
      const [isUploading, setIsUploading] = useState(false);
      const [isLoading, setIsLoading] = useState(false);
      const [pdfDoc, setPdfDoc] = useState(null);
      const [currentAnnotation, setCurrentAnnotation] = useState('');
      const [currentPage, setCurrentPage] = useState(1);
      const canvasRef = useRef(null);
      
      const loadPdf = async (url) => {
        setIsLoading(true);
        try {
          const loadingTask = pdfjsLib.getDocument(url);
          const pdf = await loadingTask.promise;
          setPdfDoc(pdf);
          setFormData(prev => ({
            ...prev,
            pdfUrl: url,
            totalPages: pdf.numPages,
            currentPage: 1
          }));
          setCurrentPage(1);
          await renderPage(pdf, 1);
        } catch (error) {
          console.error('Error loading PDF:', error);
          frappe.show_alert({
            message: 'Failed to load PDF',
            indicator: 'red'
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      const renderPage = async (pdf, pageNum) => {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        
        // Check if canvas is available
        if (!canvas) {
          console.error('Canvas element not found');
          return;
        }
        
        const context = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
      };
      
      const handleFileUpload = async (files) => {
        if (files.length === 0) return;
        
        setIsUploading(true);
        try {
          const uploadPromises = Array.from(files).map(file => uploadPdf(file));
          const uploadedFiles = await Promise.all(uploadPromises);
          
          setFormData(prev => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles, ...uploadedFiles]
          }));
          
          frappe.show_alert({
            message: `${files.length} PDF(s) uploaded successfully!`,
            indicator: 'green'
          });
          
          // Auto-load the first uploaded PDF
          if (uploadedFiles.length > 0) {
            await loadPdf(uploadedFiles[0].url);
          }
        } catch (error) {
          console.error('Upload error:', error);
          frappe.show_alert({
            message: 'Failed to upload PDF',
            indicator: 'red'
          });
        } finally {
          setIsUploading(false);
        }
      };
      
      const handlePdfSelect = async (url) => {
        if (url && url !== formData.pdfUrl) {
          await loadPdf(url);
        }
      };
      
      const changePage = async (newPage) => {
        if (pdfDoc && newPage >= 1 && newPage <= formData.totalPages) {
          setCurrentPage(newPage);
          setFormData(prev => ({
            ...prev,
            currentPage: newPage
          }));
          await renderPage(pdfDoc, newPage);
        }
      };
      
      const addAnnotation = () => {
        if (currentAnnotation.trim()) {
          const newAnnotation = {
            id: Date.now(),
            text: currentAnnotation,
            page: currentPage,
            timestamp: new Date().toISOString()
          };
          
          setFormData(prev => ({
            ...prev,
            annotations: [...prev.annotations, newAnnotation]
          }));
          
          setCurrentAnnotation('');
          
          frappe.show_alert({
            message: 'Annotation added!',
            indicator: 'green'
          });
        }
      };
      
      const removeAnnotation = (id) => {
        setFormData(prev => ({
          ...prev,
          annotations: prev.annotations.filter(ann => ann.id !== id)
        }));
      };
      
      const saveData = async () => {
        try {
          const success = saveWidgetData(formData);
          if (success) {
            frappe.show_alert({
              message: 'Data saved successfully!',
              indicator: 'green'
            });
          } else {
            frappe.show_alert({
              message: 'Error saving data',
              indicator: 'red'
            });
          }
        } catch (error) {
          console.error('Save error:', error);
          frappe.show_alert({
            message: 'Error saving data',
            indicator: 'red'
          });
        }
      };
      
      // Auto-load PDF if URL exists
useEffect(() => {
  if (formData.pdfUrl && !pdfDoc) {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        clearInterval(interval);
        loadPdf(formData.pdfUrl);
      }
    }, 100); // check every 100ms until canvas is mounted
    return () => clearInterval(interval);
  }
}, [formData.pdfUrl, pdfDoc]);

      
      return React.createElement('div', { className: 'pdf-annotation-widget' },
        React.createElement('div', { className: 'widget-header' },
          React.createElement('h2', null, 'PDF Annotation Tool')
        ),
        
        // PDF Controls
        React.createElement('div', { className: 'pdf-controls' },
          React.createElement('div', { className: 'file-picker' },
            React.createElement('input', {
              type: 'file',
              id: 'pdf-file-input',
              accept: '.pdf',
              multiple: true,
              onChange: (e) => handleFileUpload(e.target.files)
            }),
            React.createElement('label', {
              htmlFor: 'pdf-file-input',
              className: isUploading ? 'uploading' : ''
            }, isUploading ? 'Uploading...' : 'Upload PDF')
          ),
          
          React.createElement('div', { className: 'pdf-selector' },
            React.createElement('select', {
              value: formData.pdfUrl || '',
              onChange: (e) => handlePdfSelect(e.target.value)
            },
              React.createElement('option', { value: '' }, 'Select PDF to annotate...'),
              formData.uploadedFiles.map(file =>
                React.createElement('option', { key: file.url, value: file.url }, file.name)
              )
            )
          ),
          
          React.createElement('button', {
            className: 'btn btn-primary',
            onClick: saveData
          }, 'Save Annotations')
        ),
        
        // PDF Viewer and Annotation Panel
        React.createElement('div', { className: 'pdf-viewer-container' },
          React.createElement('div', { className: 'pdf-viewer' },
            isLoading ? React.createElement('div', { className: 'loading-indicator' },
              React.createElement('div', null, 'Loading PDF...')
            ) : !formData.pdfUrl ? React.createElement('div', { className: 'no-pdf-message' },
              React.createElement('h3', null, 'No PDF Selected'),
              React.createElement('p', null, 'Upload or select a PDF file to begin annotation')
            ) : React.createElement('div', { className: 'pdf-canvas-container' },
              React.createElement('canvas', { ref: canvasRef, className: 'pdf-canvas' }),
              pdfDoc && React.createElement('div', { className: 'pdf-navigation' },
                React.createElement('button', {
                  className: 'btn btn-secondary',
                  onClick: () => changePage(currentPage - 1),
                  disabled: currentPage <= 1
                }, 'Previous'),
                React.createElement('div', { className: 'page-info' },
                  `Page ${currentPage} of ${formData.totalPages}`
                ),
                React.createElement('button', {
                  className: 'btn btn-secondary',
                  onClick: () => changePage(currentPage + 1),
                  disabled: currentPage >= formData.totalPages
                }, 'Next')
              )
            )
          ),
          
          React.createElement('div', { className: 'annotation-panel' },
            React.createElement('h3', null, 'Annotations'),
            
            // Add annotation form
            React.createElement('div', { className: 'annotation-form' },
              React.createElement('textarea', {
                placeholder: 'Add your annotation here...',
                value: currentAnnotation,
                onChange: (e) => setCurrentAnnotation(e.target.value)
              }),
              React.createElement('div', { className: 'form-row' },
                React.createElement('span', null, `Page ${currentPage}`),
                React.createElement('button', {
                  className: 'btn btn-success',
                  onClick: addAnnotation,
                  disabled: !currentAnnotation.trim()
                }, 'Add Annotation')
              )
            ),
            
            // Annotations list
            React.createElement('div', { className: 'annotation-list' },
              formData.annotations.length === 0 ? React.createElement('p', null, 'No annotations yet') :
              formData.annotations.map(annotation =>
                React.createElement('div', { key: annotation.id, className: 'annotation-item' },
                  React.createElement('div', { className: 'annotation-header' },
                    React.createElement('span', { className: 'page-badge' }, `Page ${annotation.page}`),
                    React.createElement('small', null, new Date(annotation.timestamp).toLocaleString())
                  ),
                  React.createElement('div', { className: 'annotation-text' }, annotation.text),
                  React.createElement('div', { className: 'annotation-actions' },
                    React.createElement('button', {
                      className: 'btn btn-secondary btn-small',
                      onClick: () => changePage(annotation.page)
                    }, 'Go to Page'),
                    React.createElement('button', {
                      className: 'btn btn-danger btn-small',
                      onClick: () => removeAnnotation(annotation.id)
                    }, 'Remove')
                  )
                )
              )
            )
          )
        )
      );
    }
    
    // Create container and render
    let container = document.getElementById('pdf-annotation-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pdf-annotation-container';
      document.body.appendChild(container);
    }
    ReactDOM.render(React.createElement(PdfAnnotationWidget), container);
    
    console.log('PDF Annotation Widget loaded successfully!');
  
  }).catch(error => {
    console.error('Failed to load PDF widget dependencies:', error);
  });
})();