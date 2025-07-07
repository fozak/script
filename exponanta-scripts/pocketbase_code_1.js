// PocketBase Vehicle Inspection Widget - Store this in pb.collection('code').create({code: "...", done: false, user: pb.authStore.model.id})
(function() {
  // Widget configuration and data
  const WIDGET_CONFIG = {
    "data": {
      "customerInfo": {
        "name": "",
        "phone": "",
        "email": ""
      },
      "vehicleInfo": {
        "year": "1989",
        "make": "Toyota",
        "model": "Camry2",
        "vin": "",
        "mileage": ""
      },
      "inspectionItems": {
        "engine": {
          "oilLevel": {
            "status": "attention",
            "comment": "needs replacement",
            "photos": []
          },
          "coolantLevel": {
            "status": "attention",
            "comment": "",
            "photos": []
          },
          "airFilter": {
            "status": "good",
            "comment": "",
            "photos": []
          }
        },
        "brakes": {
          "frontPads": {
            "status": "attention",
            "comment": "Brake pads need replacement",
            "photos": []
          },
          "rearPads": {
            "status": "good",
            "comment": "",
            "photos": []
          },
          "fluidLevel": {
            "status": "attention",
            "comment": "Low level",
            "photos": []
          }
        }
      },
      "recommendations": []
    }
  };

  // PocketBase instance should be available globally
  if (typeof pb === 'undefined') {
    console.error('PocketBase instance (pb) not found. Make sure PocketBase is initialized.');
    return;
  }

  // File validation utility
  function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File "${file.name}" has invalid type. Only JPEG, PNG, GIF, and WebP images are allowed.`);
    }
    
    return true;
  }

  // Photo upload utility function for PocketBase
  async function uploadPhoto(file) {
    try {
      // Validate file before upload
      validateFile(file);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to PocketBase files collection
      const record = await pb.collection('files').create(formData);
      
      // Return the file URL - adjust this based on your PocketBase setup
      const fileUrl = pb.files.getUrl(record, record.file);
      console.log("✅ Uploaded File URL:", fileUrl);
      return {
        url: fileUrl,
        recordId: record.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };
    } catch (error) {
      console.error("❌ Upload failed:", error);
      throw error;
    }
  }

  // Load dependencies
  var loadScript = (src) => {
    return new Promise((resolve) => {
      // Check if script already exists
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  };

  console.log('Loading widget dependencies...');
  
  Promise.all([
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js'),
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js')
  ]).then(() => {
    
    // Data management functions for PocketBase - Single Collection Storage
    let currentRecordId = null;
    
    // Load existing data from PocketBase 'code' collection
    async function loadWidgetData() {
      try {
        const records = await pb.collection('code').getList(1, 1, {
          filter: `user = "${pb.authStore.model.id}" && done = false`,
          sort: '-created'
        });
        
        if (records.items.length > 0) {
          currentRecordId = records.items[0].id;
          const record = records.items[0];
          
          // Parse data from the record
          let parsedData = WIDGET_CONFIG.data;
          try {
            if (record.data) {
              parsedData = JSON.parse(record.data);
            }
          } catch (parseError) {
            console.warn('Failed to parse stored data, using default:', parseError);
          }
          
          return {
            data: parsedData,
            fileData: record.file_data || {},
            metadata: {
              created: record.created,
              updated: record.updated,
              recordId: record.id
            }
          };
        }
      } catch (error) {
        console.log('No existing widget data found, using default:', error);
      }
      
      return {
        data: WIDGET_CONFIG.data,
        fileData: {},
        metadata: null
      };
    }
    
    // Save data to PocketBase 'code' collection
    async function saveWidgetData(data, fileData = {}) {
      try {
        const dataToSave = {
          code: `// Vehicle Inspection Data - ${new Date().toISOString()}`,
          data: JSON.stringify(data),
          file_data: JSON.stringify(fileData),
          done: false,
          user: pb.authStore.model.id
        };
        
        if (currentRecordId) {
          await pb.collection('code').update(currentRecordId, dataToSave);
        } else {
          const record = await pb.collection('code').create(dataToSave);
          currentRecordId = record.id;
        }
        
        console.log('Widget data saved successfully to code collection');
        return true;
      } catch (error) {
        console.error('Failed to save widget data:', error);
        return false;
      }
    }
    
    // Add styles
    if (!document.getElementById('widget-styles')) {
      var style = document.createElement('style');
      style.id = 'widget-styles';
      style.textContent = `
        .inspection-widget{max-width:800px;margin:20px auto;padding:20px;border:1px solid #ddd;border-radius:12px;background:white;box-shadow:0 4px 20px rgba(0,0,0,0.1);font-family:Arial,sans-serif}
        .widget-header{background:#2563eb;color:white;padding:20px;border-radius:8px;margin-bottom:20px;text-align:center}
        .widget-header h2{margin:0;font-size:24px}
        .section{margin-bottom:20px;padding:15px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb}
        .section-title{font-weight:bold;font-size:16px;color:#1f2937;margin-bottom:15px;padding-bottom:8px;border-bottom:2px solid #e5e7eb}
        .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
        .form-group{margin-bottom:10px}
        .form-group label{display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px}
        .form-group input,.form-group textarea,.form-group select{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;box-sizing:border-box;transition:border-color 0.2s}
        .form-group input:focus,.form-group textarea:focus,.form-group select:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
        .btn{padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-weight:600;transition:all 0.2s}
        .btn-primary{background:#2563eb;color:white}
        .btn-secondary{background:#6b7280;color:white}
        .btn-success{background:#10b981;color:white}
        .btn-danger{background:#ef4444;color:white}
        .btn:hover{opacity:0.9;transform:translateY(-1px)}
        .btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .data-display{background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;padding:15px;margin:10px 0}
        .data-display pre{margin:0;font-size:12px;white-space:pre-wrap}
        .inspection-item{border:1px solid #e5e7eb;border-radius:8px;padding:15px;margin-bottom:15px;background:white}
        .inspection-controls{display:flex;gap:10px;align-items:center;margin-bottom:10px}
        .inspection-controls select{flex:0 0 120px}
        .inspection-controls input{flex:1}
        .photo-section{margin-top:10px}
        .photo-upload{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .photo-upload input[type="file"]{display:none}
        .photo-upload label{background:#f3f4f6;border:2px dashed #d1d5db;padding:20px;text-align:center;border-radius:8px;cursor:pointer;transition:all 0.2s;flex:1}
        .photo-upload label:hover{background:#e5e7eb;border-color:#9ca3af}
        .photo-upload label.uploading{background:#fef3c7;border-color:#f59e0b;color:#92400e}
        .photo-upload label.error{background:#fef2f2;border-color:#ef4444;color:#dc2626}
        .photo-gallery{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
        .photo-item{position:relative;display:inline-block}
        .photo-item img{width:100px;height:100px;object-fit:cover;border-radius:6px;border:2px solid #e5e7eb}
        .photo-item .remove-btn{position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .photo-item .remove-btn:hover{background:#dc2626}
        .loading{text-align:center;padding:20px;color:#6b7280}
        .error-message{background:#fef2f2;color:#dc2626;padding:10px;border-radius:6px;margin:10px 0;font-size:14px}
        .success-message{background:#f0fdf4;color:#15803d;padding:10px;border-radius:6px;margin:10px 0;font-size:14px}
        .file-validation-info{font-size:12px;color:#6b7280;margin-top:5px}
      `;
      document.head.appendChild(style);
    }
    
    // React Component
    const { useState, useEffect } = React;
    
    function VehicleInspectionWidget() {
      const [formData, setFormData] = useState(WIDGET_CONFIG.data);
      const [fileData, setFileData] = useState({});
      const [isSaving, setIsSaving] = useState(false);
      const [isLoading, setIsLoading] = useState(true);
      const [showData, setShowData] = useState(false);
      const [uploadingPhotos, setUploadingPhotos] = useState({});
      const [errorMessage, setErrorMessage] = useState('');
      const [successMessage, setSuccessMessage] = useState('');
      const [metadata, setMetadata] = useState(null);
      
      // Load data on component mount
      useEffect(() => {
        loadWidgetData().then(result => {
          setFormData(result.data);
          setFileData(result.fileData);
          setMetadata(result.metadata);
          setIsLoading(false);
        }).catch(error => {
          console.error('Failed to load widget data:', error);
          setErrorMessage('Failed to load widget data');
          setIsLoading(false);
        });
      }, []);
      
      // Clear messages after 5 seconds
      useEffect(() => {
        if (errorMessage || successMessage) {
          const timer = setTimeout(() => {
            setErrorMessage('');
            setSuccessMessage('');
          }, 5000);
          return () => clearTimeout(timer);
        }
      }, [errorMessage, successMessage]);
      
      const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        }));
      };
      
      const handlePhotoUpload = async (category, item, files) => {
        const uploadKey = `${category}-${item}`;
        setUploadingPhotos(prev => ({ ...prev, [uploadKey]: true }));
        setErrorMessage('');
        
        try {
          const uploadPromises = Array.from(files).map(async (file) => {
            try {
              return await uploadPhoto(file);
            } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              throw error;
            }
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          const uploadedUrls = uploadResults.map(result => result.url);
          
          // Update form data
          setFormData(prev => ({
            ...prev,
            inspectionItems: {
              ...prev.inspectionItems,
              [category]: {
                ...prev.inspectionItems[category],
                [item]: {
                  ...prev.inspectionItems[category][item],
                  photos: [...prev.inspectionItems[category][item].photos, ...uploadedUrls]
                }
              }
            }
          }));
          
          // Update file data for tracking
          setFileData(prev => ({
            ...prev,
            [`${category}-${item}`]: [
              ...(prev[`${category}-${item}`] || []),
              ...uploadResults
            ]
          }));
          
          setSuccessMessage(`${files.length} photo(s) uploaded successfully!`);
        } catch (error) {
          console.error('Photo upload error:', error);
          setErrorMessage(`Failed to upload photos: ${error.message}`);
        } finally {
          setUploadingPhotos(prev => ({ ...prev, [uploadKey]: false }));
        }
      };
      
      const removePhoto = (category, item, photoIndex) => {
        setFormData(prev => ({
          ...prev,
          inspectionItems: {
            ...prev.inspectionItems,
            [category]: {
              ...prev.inspectionItems[category],
              [item]: {
                ...prev.inspectionItems[category][item],
                photos: prev.inspectionItems[category][item].photos.filter((_, index) => index !== photoIndex)
              }
            }
          }
        }));
        
        // Also remove from file data tracking
        setFileData(prev => {
          const key = `${category}-${item}`;
          if (prev[key] && prev[key][photoIndex]) {
            return {
              ...prev,
              [key]: prev[key].filter((_, index) => index !== photoIndex)
            };
          }
          return prev;
        });
      };
      
      const handleSubmit = async () => {
        setIsSaving(true);
        setErrorMessage('');
        try {
          const success = await saveWidgetData(formData, fileData);
          if (success) {
            setSuccessMessage('Data saved successfully!');
          } else {
            setErrorMessage('Error saving data');
          }
        } catch (error) {
          console.error('Save error:', error);
          setErrorMessage('Error saving data');
        }
        setIsSaving(false);
      };
      
      const handleReset = () => {
        setFormData(WIDGET_CONFIG.data);
        setFileData({});
        setErrorMessage('');
        setSuccessMessage('');
      };
      
      const renderInspectionCategory = (categoryName, categoryData) => {
        return React.createElement('div', { className: 'section' },
          React.createElement('div', { className: 'section-title' },
            categoryName.charAt(0).toUpperCase() + categoryName.slice(1) + ' Inspection'
          ),
          Object.keys(categoryData).map(item => {
            const uploadKey = `${categoryName}-${item}`;
            const isUploading = uploadingPhotos[uploadKey];
            
            return React.createElement('div', { key: item, className: 'inspection-item' },
              React.createElement('label', { style: { fontWeight: 'bold', marginBottom: '10px', display: 'block' } },
                item.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
              ),
              
              // Status and comment controls
              React.createElement('div', { className: 'inspection-controls' },
                React.createElement('select', {
                  value: categoryData[item].status,
                  onChange: (e) => setFormData(prev => ({
                    ...prev,
                    inspectionItems: {
                      ...prev.inspectionItems,
                      [categoryName]: {
                        ...prev.inspectionItems[categoryName],
                        [item]: {
                          ...prev.inspectionItems[categoryName][item],
                          status: e.target.value
                        }
                      }
                    }
                  }))
                },
                  React.createElement('option', { value: 'good' }, 'Good'),
                  React.createElement('option', { value: 'attention' }, 'Attention'),
                  React.createElement('option', { value: 'urgent' }, 'Urgent')
                ),
                React.createElement('input', {
                  type: 'text',
                  placeholder: 'Comment...',
                  value: categoryData[item].comment,
                  onChange: (e) => setFormData(prev => ({
                    ...prev,
                    inspectionItems: {
                      ...prev.inspectionItems,
                      [categoryName]: {
                        ...prev.inspectionItems[categoryName],
                        [item]: {
                          ...prev.inspectionItems[categoryName][item],
                          comment: e.target.value
                        }
                      }
                    }
                  }))
                })
              ),
              
              // Photo upload section
              React.createElement('div', { className: 'photo-section' },
                React.createElement('div', { className: 'photo-upload' },
                  React.createElement('input', {
                    type: 'file',
                    id: `photo-${categoryName}-${item}`,
                    accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
                    multiple: true,
                    onChange: (e) => {
                      if (e.target.files.length > 0) {
                        handlePhotoUpload(categoryName, item, e.target.files);
                      }
                    }
                  }),
                  React.createElement('label', {
                    htmlFor: `photo-${categoryName}-${item}`,
                    className: isUploading ? 'uploading' : ''
                  }, isUploading ? 'Uploading...' : 'Click to upload photos'),
                  React.createElement('div', { className: 'file-validation-info' },
                    'Accepted: JPEG, PNG, GIF, WebP | Max size: 10MB per file'
                  )
                ),
                
                // Photo gallery
                categoryData[item].photos.length > 0 && React.createElement('div', { className: 'photo-gallery' },
                  categoryData[item].photos.map((photoUrl, photoIndex) =>
                    React.createElement('div', { key: photoIndex, className: 'photo-item' },
                      React.createElement('img', {
                        src: photoUrl,
                        alt: `${item} photo ${photoIndex + 1}`,
                        onError: (e) => {
                          e.target.style.border = '2px solid #ef4444';
                          e.target.alt = 'Failed to load image';
                        }
                      }),
                      React.createElement('button', {
                        className: 'remove-btn',
                        onClick: () => removePhoto(categoryName, item, photoIndex),
                        title: 'Remove photo'
                      }, '×')
                    )
                  )
                )
              )
            );
          })
        );
      };
      
      if (isLoading) {
        return React.createElement('div', { className: 'loading' }, 'Loading widget data...');
      }
      
      return React.createElement('div', { className: 'inspection-widget' },
        React.createElement('div', { className: 'widget-header' },
          React.createElement('h2', null, 'Vehicle Inspection Form'),
          metadata && React.createElement('div', { style: { fontSize: '14px', marginTop: '10px' } },
            `Record ID: ${metadata.recordId} | Updated: ${new Date(metadata.updated).toLocaleString()}`
          )
        ),
        
        // Error/Success Messages
        errorMessage && React.createElement('div', { className: 'error-message' }, errorMessage),
        successMessage && React.createElement('div', { className: 'success-message' }, successMessage),
        
        // Customer Info Section
        React.createElement('div', { className: 'section' },
          React.createElement('div', { className: 'section-title' }, 'Customer Information'),
          React.createElement('div', { className: 'form-grid' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Name'),
              React.createElement('input', {
                type: 'text',
                value: formData.customerInfo.name,
                onChange: (e) => handleInputChange('customerInfo', 'name', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Phone'),
              React.createElement('input', {
                type: 'text',
                value: formData.customerInfo.phone,
                onChange: (e) => handleInputChange('customerInfo', 'phone', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Email'),
              React.createElement('input', {
                type: 'email',
                value: formData.customerInfo.email,
                onChange: (e) => handleInputChange('customerInfo', 'email', e.target.value)
              })
            )
          )
        ),
        
        // Vehicle Info Section
        React.createElement('div', { className: 'section' },
          React.createElement('div', { className: 'section-title' }, 'Vehicle Information'),
          React.createElement('div', { className: 'form-grid' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Year'),
              React.createElement('input', {
                type: 'text',
                value: formData.vehicleInfo.year,
                onChange: (e) => handleInputChange('vehicleInfo', 'year', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Make'),
              React.createElement('input', {
                type: 'text',
                value: formData.vehicleInfo.make,
                onChange: (e) => handleInputChange('vehicleInfo', 'make', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Model'),
              React.createElement('input', {
                type: 'text',
                value: formData.vehicleInfo.model,
                onChange: (e) => handleInputChange('vehicleInfo', 'model', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'VIN'),
              React.createElement('input', {
                type: 'text',
                value: formData.vehicleInfo.vin,
                onChange: (e) => handleInputChange('vehicleInfo', 'vin', e.target.value)
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Mileage'),
              React.createElement('input', {
                type: 'text',
                value: formData.vehicleInfo.mileage,
                onChange: (e) => handleInputChange('vehicleInfo', 'mileage', e.target.value)
              })
            )
          )
        ),
        
        // Inspection Items Sections
        renderInspectionCategory('engine', formData.inspectionItems.engine),
        renderInspectionCategory('brakes', formData.inspectionItems.brakes),
        
        // Action Buttons
        React.createElement('div', {
          style: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '2px solid #e5e7eb'
          }
        },
          React.createElement('button', {
            className: 'btn btn-primary',
            onClick: handleSubmit,
            disabled: isSaving
          }, isSaving ? 'Saving...' : 'Save Data'),
          
          React.createElement('button', {
            className: 'btn btn-secondary',
            onClick: handleReset
          }, 'Reset Form'),
          
          React.createElement('button', {
            className: 'btn btn-success',
            onClick: () => setShowData(!showData)
          }, showData ? 'Hide Data' : 'Show Data')
        ),
        
        // Data Display (for debugging)
        showData && React.createElement('div', { className: 'data-display' },
          React.createElement('h4', null, 'Current Form Data:'),
          React.createElement('pre', null, JSON.stringify(formData, null, 2)),
          React.createElement('h4', null, 'File Data:'),
          React.createElement('pre', null, JSON.stringify(fileData, null, 2))
        )
      );
    }
    
    // Create container and render
    let container = document.getElementById('inspection-widget-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inspection-widget-container';
      document.body.appendChild(container);
    }
    ReactDOM.render(React.createElement(VehicleInspectionWidget), container);
    
    console.log('PocketBase widget loaded successfully!');
    
  }).catch(error => {
    console.error('Failed to load widget dependencies:', error);
  });
})();