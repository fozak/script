/**
 * Faster version
 * Collects file data from Google Drive, including MD5 hash, and writes it to a Google Sheet.
 * Optimized for performance while still supporting subfolder traversal.
 */
function collectDriveFileData() {
    // Call the async function and handle any errors
    collectDriveFileDataAsync()
      .catch(error => {
        Logger.log(`Error in async execution: ${error}`);
      });
  }
  
  /**
   * Async version of the file collection function with performance optimizations.
   */
  async function collectDriveFileDataAsync() {
    // --- Configuration ---
    const SHEET_NAME = "Drive Files Data"; // Name of the sheet to write to
    const START_FOLDER_ID = "root"; // ID of the starting folder (or "root" for the entire drive)
    const MAX_FILES = 10000; // Maximum number of files to process
    
    // --- Performance tracking ---
    const startTime = new Date().getTime();
    let apiCallCount = 0;
    
    function logTime(label) {
      const currentTime = new Date().getTime();
      const elapsed = (currentTime - startTime) / 1000;
      Logger.log(`${elapsed}s: ${label}`);
    }
    
    // --- Main execution ---
    logTime("Starting file collection");
    
    // Get all folders first (to build a folder map)
    const folderMap = new Map(); // id -> {name, parentId}
    
    logTime("Getting folder structure");
    
    // Get all folders in the drive with a single query if possible
    let pageToken;
    do {
      apiCallCount++;
      const response = Drive.Files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'nextPageToken, files(id, name, parents)',
        pageSize: 1000,
        pageToken: pageToken
      });
      
      const folderList = response.files || [];
      for (const folder of folderList) {
        folderMap.set(folder.id, {
          name: folder.name,
          parentId: folder.parents && folder.parents.length > 0 ? folder.parents[0] : null
        });
      }
      
      pageToken = response.nextPageToken;
      logTime(`Fetched batch of ${folderList.length} folders. Total: ${folderMap.size}, API calls: ${apiCallCount}`);
    } while (pageToken);
    
    // Special handling for root folder
    if (!folderMap.has("root")) {
      folderMap.set("root", { name: "My Drive", parentId: null });
    }
    
    // Pre-compute folder paths
    const folderPaths = new Map(); // id -> full path
    
    function getFolderPath(folderId) {
      if (!folderId) return "";
      
      // Return cached path if available
      if (folderPaths.has(folderId)) {
        return folderPaths.get(folderId);
      }
      
      const folder = folderMap.get(folderId);
      if (!folder) return folderId; // Unknown folder
      
      let path;
      if (folder.parentId) {
        path = `${getFolderPath(folder.parentId)}/${folder.name}`;
      } else {
        path = folder.name;
      }
      
      // Cache the result
      folderPaths.set(folderId, path);
      return path;
    }
    
    // Compute all folder paths at once
    logTime("Computing folder paths");
    for (const folderId of folderMap.keys()) {
      getFolderPath(folderId);
    }
    logTime("Folder paths computed");
    
    // Now get all non-folder files
    logTime("Getting all files");
    
    let allFiles = [];
    pageToken = null;
    
    do {
      apiCallCount++;
      const response = Drive.Files.list({
        q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'nextPageToken, files(id, name, mimeType, size, parents, createdTime, modifiedTime, trashed, starred, md5Checksum)',
        pageSize: 1000,
        pageToken: pageToken
      });
      
      const fileList = response.files || [];
      
      // Add folder path to each file
      for (const file of fileList) {
        const parentId = file.parents && file.parents.length > 0 ? file.parents[0] : null;
        file.folderPath = parentId ? getFolderPath(parentId) : "Unknown";
      }
      
      allFiles = allFiles.concat(fileList);
      pageToken = response.nextPageToken;
      
      logTime(`Fetched batch of ${fileList.length} files. Total: ${allFiles.length}, API calls: ${apiCallCount}`);
      
      // Check if we've hit the maximum file limit
      if (allFiles.length >= MAX_FILES) {
        Logger.log(`Reached maximum file limit of ${MAX_FILES}`);
        break;
      }
    } while (pageToken);
    
    // Write to spreadsheet
    logTime("Writing to spreadsheet");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    
    // Clear existing data
    sheet.clearContents();
    
    // Write the header row
    const headers = [
      "File ID",
      "File Name",
      "Folder Path",
      "MIME Type",
      "Size (Bytes)",
      "Parents Folder IDs",
      "Created Time",
      "Modified Time",
      "Trashed",
      "Starred",
      "MD5 Checksum",
    ];
    
    // Prepare all data
    const dataToWrite = allFiles.map(file => [
      file.id,
      file.name,
      file.folderPath || '',
      file.mimeType,
      file.size || 0,
      file.parents ? file.parents.join(',') : '',
      file.createdTime,
      file.modifiedTime,
      file.trashed,
      file.starred,
      file.md5Checksum || ''
    ]);
    
    // Write headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Write data in a single batch if possible
    if (dataToWrite.length > 0) {
      try {
        // Try to write all at once
        sheet.getRange(2, 1, dataToWrite.length, dataToWrite[0].length).setValues(dataToWrite);
      } catch (e) {
        // If too large, fall back to batched writing
        Logger.log("Falling back to batched writing: " + e);
        const batchSize = 1000;
        for (let i = 0; i < dataToWrite.length; i += batchSize) {
          const batch = dataToWrite.slice(i, i + batchSize);
          sheet.getRange(2 + i, 1, batch.length, batch[0].length).setValues(batch);
        }
      }
    }
    
    // Calculate and log performance metrics
    const endTime = new Date().getTime();
    const totalTime = (endTime - startTime) / 1000;
    
    const message = `Successfully collected and wrote ${allFiles.length} files' data to the sheet "${SHEET_NAME}"`;
    Logger.log(message);
    Logger.log(`Total execution time: ${totalTime} seconds`);
    Logger.log(`Total API calls: ${apiCallCount}`);
    
    // Update spreadsheet with summary
    sheet.getRange(1, 13).setValue("Complete!");
    sheet.getRange(2, 13).setValue(`Execution time: ${totalTime}s`);
    sheet.getRange(3, 13).setValue(`API calls: ${apiCallCount}`);
    sheet.getRange(4, 13).setValue(`Files processed: ${allFiles.length}`);
  }