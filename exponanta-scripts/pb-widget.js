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
      /*
 */
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