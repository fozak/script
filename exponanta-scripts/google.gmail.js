/**
 * This script reads Gmail messages from the last 2 weeks,
 * adds only emails that are not already in the spreadsheet,
 * and appends the data to the end of the sheet.
 *
 * To use this script:
 *  1.  Create a new Google Sheet.  Note the spreadsheet ID (found in the URL).
 *  2.  Open the Script editor in the Google Sheet (Tools > Script editor).
 *  3.  Copy and paste this code into the script editor.
 *  4.  Modify the `SPREADSHEET_ID`, `SHEET_NAME`, `LABEL_TO_MONITOR` (optional),
 *      and `MAX_MESSAGES_TO_PROCESS` variables to match your needs.
 *  5.  Save the script (File > Save).
 *  6.  Set up a trigger:
 *      a.  In the script editor, click the clock icon (Triggers).
 *      b.  Click "+ Add Trigger".
 *      c.  Configure the trigger:
 *          - Choose which function to run: `processEmails`
 *          - Choose which deployment should run: `Head`
 *          - Select event source: `Time-driven`
 *          - Select event type:  Choose a time-based interval (e.g., "Minutes timer", "Hours timer").
 *          - Click Save.
 *  7.  The first time you run the script, you will be asked to authorize it. Grant all necessary permissions.
 */

// Configuration -  Customize these variables
const SPREADSHEET_ID = '14ETBP4i67uk71JfkHJ7tfqjRXQjM9e31Mx1yOHXwOus';  // Replace with your Sheet ID
const SHEET_NAME = 'gmail';                 // Replace with your sheet name
const LABEL_TO_MONITOR = '';                 // Optional: Gmail label to monitor
const MAX_MESSAGES_TO_PROCESS = 20;         // Maximum number of messages to process per trigger execution.  Increase or decrease as needed, taking the API rate limits into consideration.
const COLUMN_HEADERS = ['Timestamp', 'From', 'Subject', 'Text Content']; // Define headers for the spreadsheet.

/**
 * Processes Gmail messages from the last two weeks,
 * adds only new emails (not already in the sheet), and appends to the sheet.
 */
function processEmails() {
  try {
    // 1. Define the Search Parameters
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // Date two weeks prior
    const searchDate = Utilities.formatDate(twoWeeksAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd'); // Format to YYYY/MM/DD (Gmail search requirement)

    let searchString = `after:${searchDate}`; // Get emails after the date
    if (LABEL_TO_MONITOR) {
      searchString += ' label:' + LABEL_TO_MONITOR; // Add label, if defined
    }
    const threads = GmailApp.search(searchString, 0, MAX_MESSAGES_TO_PROCESS);  // Apply the limits to keep API usage within limits

    if (!threads || threads.length === 0) {
      Logger.log('No new messages found in the last two weeks to process.');
      return; // Exit if no messages are found.
    }

    // 2. Get the Google Sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found.`);
    }

    // 3. Get the Existing Email Subjects (for duplicate checking)
    const existingSubjects = getExistingSubjects(sheet); // Function retrieves subjects

    // 4. Process Each Thread
    let newEmailsCount = 0;
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      const messages = thread.getMessages();

      // 5. Process Each Message within the Thread
      for (let j = 0; j < messages.length; j++) {
        const message = messages[j];
        const subject = message.getSubject();

        // 6. Check for Duplicates (Subject)
        if (!existingSubjects.has(subject)) {
          // 7. Extract Message Data
          const timestamp = message.getDate();
          const from = message.getFrom();
          const textContent = message.getPlainBody();

          // 8. Prepare Data and Append to Sheet
          const data = [timestamp, from, subject, textContent];

          try {
            sheet.appendRow(data);
            newEmailsCount++; // Keep track of how many new emails were added
          } catch (writeError) {
            Logger.log(`Error writing data for message from ${from}: ${writeError}`);
          }
        } else {
          Logger.log(`Skipping duplicate email with subject: ${subject}`); // Log when the email is skipped
        }
      }
      thread.markRead();  // Mark the thread as read
    }
    Logger.log(`Processed ${threads.length} threads.  Added ${newEmailsCount} new emails to sheet.`);

  } catch (error) {
    Logger.log('An error occurred: ' + error);
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: 'Gmail to Sheet Script Error',
      body: 'An error occurred while processing Gmail messages:\n' + error,
    });
  }
}

/**
 * Retrieves a set of existing email subjects from the Google Sheet.
 * This helps avoid adding duplicate entries.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The Google Sheet object.
 * @returns {Set<string>} A set containing the subjects of emails already in the sheet.
 */
function getExistingSubjects(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { // If no data exists (only headers), return an empty set
    return new Set();
  }
  const subjectColumn = 3; // Subject column (starting from 1, with the first column as timestamp)
  const data = sheet.getRange(2, subjectColumn + 1, lastRow - 1, 1).getValues(); // Get subject column values starting from row 2 (skipping headers)

  const existingSubjects = new Set(); // Use a Set for efficient lookup (checking if an element already exists)

  for (let i = 0; i < data.length; i++) {
    if (data[i][0]) { // Check that the data is defined
        existingSubjects.add(String(data[i][0]).trim());  // Add it to the set. Trim whitespace.
    }

  }

  return existingSubjects;
}