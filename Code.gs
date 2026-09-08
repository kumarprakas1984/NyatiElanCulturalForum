/**
 * ===================================================================================
 * Nyati Elan Cultural Forum - Backend API (Google Apps Script)
 * ===================================================================================
 * Configured for Google Sheet ID: 1KGn8SoJ0J_MdattvHbSkD09N-jDLsWFMQ-Fy6-cLqT0
 * Tabs: Residents, Expenses, Events, Summary, Admins
 */

const CONFIG = {
  SPREADSHEET_ID: '1KGn8SoJ0J_MdattvHbSkD09N-jDLsWFMQ-Fy6-cLqT0',
  SHEETS: {
    RESIDENTS: 'Residents',
    EXPENSES: 'Expenses',
    EVENTS: 'Events',
    SUMMARY: 'Summary',
    ADMINS: 'Admins'
  },
  // ===================================================================================
  // AUTOMATED WHATSAPP DISPATCH (Send from ONE central society number via API)
  // ===================================================================================
  WHATSAPP_AUTOMATION: {
    // Set to true once you have connected your single official WhatsApp number
    ENABLED: false,
    
    // Choose your gateway provider: 'ULTRAMSG' (easiest QR-link) or 'META' (Meta Cloud API)
    PROVIDER: 'ULTRAMSG', 
    
    // 1. UltraMsg Settings (https://ultramsg.com) - Scan QR from official phone to connect:
    ULTRAMSG_INSTANCE_ID: 'instanceXXXXX',
    ULTRAMSG_TOKEN: 'your_ultramsg_token',
    
    // 2. Meta WhatsApp Cloud API Settings (https://developers.facebook.com):
    META_PHONE_NUMBER_ID: '',
    META_ACCESS_TOKEN: ''
  }
};

/**
 * Quick Test function to run directly in the Apps Script Editor.
 * Running this will prompt you to authorize permissions for the new Google Sheet
 * and print all loaded admin emails and row counts to the Execution Log.
 */
function testFetch() {
  Logger.log("Starting test fetch for Spreadsheet ID: " + CONFIG.SPREADSHEET_ID);
  const result = fetchAllSheetData();
  Logger.log("==========================================");
  Logger.log("TEST FETCH SUCCESSFUL!");
  Logger.log("Residents loaded: " + (result.residents ? (result.residents.length - 1) : 0));
  Logger.log("Expenses loaded: " + (result.expenses ? (result.expenses.length - 1) : 0));
  Logger.log("Events loaded: " + (result.events ? (result.events.length - 1) : 0));
  Logger.log("Summary: " + JSON.stringify(result.summary));
  Logger.log("Admin Emails Found: " + JSON.stringify(result.admins));
  Logger.log("==========================================");
  return result;
}

/**
 * Handles HTTP GET requests (e.g., ?action=getAllData)
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';

    if (action === 'getAllData') {
      const data = fetchAllSheetData();
      return createJsonResponse({ status: 'success', data: data });
    }

    if (action === 'ping') {
      return createJsonResponse({ 
        status: 'success', 
        message: 'Backend is connected and active!', 
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({ status: 'error', message: `Unknown action: ${action}` });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handles HTTP POST requests (e.g., action: 'updateSheet' or 'getAllData')
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: 'error', message: 'No POST data received.' });
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;

    if (action === 'getAllData') {
      const data = fetchAllSheetData();
      return createJsonResponse({ status: 'success', data: data });
    }

    if (action === 'updateSheet') {
      const payload = request.payload;
      const resultMessage = saveOrUpdateResident(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    if (action === 'saveExpense' || action === 'addExpense') {
      const payload = request.payload;
      const resultMessage = saveOrUpdateExpense(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    return createJsonResponse({ status: 'error', message: `Unknown POST action: ${action}` });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Fetches data from all sheets: Residents, Expenses, Events, Summary, Admins
 * Features case-insensitive and whitespace-tolerant tab matching.
 */
function fetchAllSheetData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // 1. Fetch Residents Data
  const residentSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.RESIDENTS);
  const residentValues = residentSheet ? residentSheet.getDataRange().getDisplayValues() : [];

  // 2. Fetch Expenses Data
  const expenseSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.EXPENSES);
  const expenseValues = expenseSheet ? expenseSheet.getDataRange().getDisplayValues() : [];

  // 3. Fetch Events Data
  const eventSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.EVENTS);
  const eventValues = eventSheet ? eventSheet.getDataRange().getDisplayValues() : [];

  // 4. Fetch Summary Data (returns all rows and columns for full parsing)
  const summarySheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.SUMMARY);
  const summaryValues = summarySheet ? summarySheet.getDataRange().getDisplayValues() : [];

  // 5. Fetch Admins Data (extracts all emails from all cells/columns in Admins sheet)
  const adminSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ADMINS) || getSheetCaseInsensitive(ss, 'Admin');
  let adminEmails = [];
  if (adminSheet) {
    const adminValues = adminSheet.getDataRange().getDisplayValues();
    adminValues.forEach(function(row) {
      row.forEach(function(cell) {
        if (!cell) return;
        const text = cell.toString().trim().toLowerCase();
        // Regex to extract valid email addresses from cell text
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
          matches.forEach(function(email) {
            if (adminEmails.indexOf(email) === -1) {
              adminEmails.push(email);
            }
          });
        }
      });
    });
  }

  return {
    residents: residentValues,
    expenses: expenseValues,
    events: eventValues,
    summary: summaryValues,
    admins: adminEmails
  };
}

/**
 * Saves or updates a resident record in the Residents sheet dynamically
 * mapped to actual column headers (preserving 2025, 2024, etc.).
 */
function saveOrUpdateResident(payload) {
  if (!payload || !payload.building || !payload.flat) {
    throw new Error('Building and Flat number are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.RESIDENTS, [
    'Building', 'Flat Number', 'Resident Name', 'Mobile Number', 'Status', 'Amount', '2025', 'Date', 'Volunteer', 'Comment', 'Payment Mode'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  // Find column indices (0-based)
  const colBuilding = headers.indexOf('building');
  const colFlat = headers.findIndex(function(h) { return h.indexOf('flat') !== -1; });
  const colName = headers.findIndex(function(h) { return h.indexOf('name') !== -1 || h.indexOf('resident') !== -1; });
  const colPhone = headers.findIndex(function(h) { return h.indexOf('phone') !== -1 || h.indexOf('mobile') !== -1 || h.indexOf('contact') !== -1; });
  const colStatus = headers.indexOf('status');
  const colAmount = headers.indexOf('amount');
  const colDate = headers.indexOf('date');
  const colVolunteer = headers.findIndex(function(h) { return h.indexOf('volunteer') !== -1 || h.indexOf('recorded') !== -1; });
  const colComment = headers.findIndex(function(h) { return h.indexOf('comment') !== -1 || h.indexOf('note') !== -1; });
  let colPaymentMode = headers.findIndex(function(h) { return h.indexOf('payment mode') !== -1 || h.indexOf('mode') !== -1 || h.indexOf('method') !== -1; });

  // If Payment Mode header doesn't exist, append it as a new column
  if (colPaymentMode === -1) {
    const newColIndex = lastCol + 1;
    sheet.getRange(1, newColIndex).setValue('Payment Mode');
    headers.push('payment mode');
    colPaymentMode = newColIndex - 1;
  }

  const data = sheet.getDataRange().getValues();
  const targetBuilding = String(payload.building).trim().toUpperCase();
  const targetFlat = String(payload.flat).trim();

  let targetRowIndex = -1;

  // Search for existing resident by Building and Flat (starting from row index 1 to skip header)
  for (let i = 1; i < data.length; i++) {
    const currentBuilding = colBuilding !== -1 ? String(data[i][colBuilding]).trim().toUpperCase() : '';
    const currentFlat = colFlat !== -1 ? String(data[i][colFlat]).trim() : '';
    if (currentBuilding === targetBuilding && currentFlat === targetFlat) {
      targetRowIndex = i + 1; // 1-based index for SpreadsheetApp
      break;
    }
  }

  const numCols = Math.max(headers.length, sheet.getLastColumn());

  if (targetRowIndex > 0) {
    // Read existing row values to preserve historical columns like 2025, 2024, etc.
    const existingRow = sheet.getRange(targetRowIndex, 1, 1, numCols).getValues()[0];
    
    // Prepare full timestamp with date & time
    let paymentTimestamp = payload.date;
    if (paymentTimestamp) {
      paymentTimestamp = String(paymentTimestamp).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(paymentTimestamp) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(paymentTimestamp)) {
        const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'hh:mm:ss a');
        paymentTimestamp = paymentTimestamp + ' ' + timeStr;
      }
    } else {
      paymentTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd hh:mm:ss a');
    }

    if (colName !== -1 && payload.name !== undefined) existingRow[colName] = payload.name;
    if (colPhone !== -1 && payload.phone !== undefined) existingRow[colPhone] = payload.phone;
    if (colStatus !== -1 && payload.status !== undefined) existingRow[colStatus] = payload.status;
    if (colAmount !== -1 && payload.amount !== undefined) existingRow[colAmount] = payload.amount ? Number(payload.amount) : 0;
    if (colDate !== -1) existingRow[colDate] = paymentTimestamp;
    if (colVolunteer !== -1) existingRow[colVolunteer] = payload.recordedBy || Session.getActiveUser().getEmail() || 'Admin';
    if (colComment !== -1 && payload.comments !== undefined) existingRow[colComment] = payload.comments;
    if (colPaymentMode !== -1 && payload.paymentMode !== undefined) existingRow[colPaymentMode] = payload.paymentMode;

    sheet.getRange(targetRowIndex, 1, 1, existingRow.length).setValues([existingRow]);

    // Dispatch automated WhatsApp receipt from single number if configured
    if (payload.status === 'Paid') {
      sendAutomatedWhatsAppReceipt(payload, paymentTimestamp);
    }

    return `Updated details for ${payload.building}-${payload.flat}`;
  } else {
    // Prepare full timestamp with date & time
    let paymentTimestamp = payload.date;
    if (paymentTimestamp) {
      paymentTimestamp = String(paymentTimestamp).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(paymentTimestamp) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(paymentTimestamp)) {
        const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'hh:mm:ss a');
        paymentTimestamp = paymentTimestamp + ' ' + timeStr;
      }
    } else {
      paymentTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd hh:mm:ss a');
    }

    // Create new row array matching sheet columns
    const newRow = new Array(numCols).fill('');
    if (colBuilding !== -1) newRow[colBuilding] = payload.building;
    if (colFlat !== -1) newRow[colFlat] = payload.flat;
    if (colName !== -1) newRow[colName] = payload.name || '';
    if (colPhone !== -1) newRow[colPhone] = payload.phone || '';
    if (colStatus !== -1) newRow[colStatus] = payload.status || 'Unpaid';
    if (colAmount !== -1) newRow[colAmount] = payload.amount ? Number(payload.amount) : 0;
    if (colDate !== -1) newRow[colDate] = paymentTimestamp;
    if (colVolunteer !== -1) newRow[colVolunteer] = payload.recordedBy || Session.getActiveUser().getEmail() || 'Admin';
    if (colComment !== -1) newRow[colComment] = payload.comments || '';
    if (colPaymentMode !== -1) newRow[colPaymentMode] = payload.paymentMode || 'UPI';

    sheet.appendRow(newRow);

    // Dispatch automated WhatsApp receipt from single number if configured
    if (payload.status === 'Paid') {
      sendAutomatedWhatsAppReceipt(payload, paymentTimestamp);
    }

    return `Added new record for ${payload.building}-${payload.flat}`;
  }
}

/**
 * Saves a new Expense record to the Expenses sheet with receipt photo link
 */
function saveOrUpdateExpense(payload) {
  if (!payload || !payload.item || !payload.total) {
    throw new Error('Expense item name and total amount are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.EXPENSES, [
    'Sr. No', 'Festival', 'Item', 'Total', 'Given', 'Pending', 'Volunteer', 'Receipt'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  // Find column indices (0-based)
  let colSr = headers.findIndex(function(h) { return h.indexOf('sr') !== -1 || h.indexOf('no') !== -1; });
  let colFestival = headers.findIndex(function(h) { return h.indexOf('festival') !== -1 || h.indexOf('celebration') !== -1; });
  let colItem = headers.findIndex(function(h) { return h.indexOf('item') !== -1 || h.indexOf('description') !== -1; });
  let colTotal = headers.findIndex(function(h) { return h === 'total' || h.indexOf('amount') !== -1; });
  let colGiven = headers.findIndex(function(h) { return h.indexOf('given') !== -1 || h.indexOf('paid') !== -1; });
  let colPending = headers.findIndex(function(h) { return h.indexOf('pending') !== -1 || h.indexOf('remaining') !== -1; });
  let colVolunteer = headers.findIndex(function(h) { return h.indexOf('volunteer') !== -1 || h.indexOf('recorded') !== -1; });
  let colReceipt = headers.findIndex(function(h) { return h.indexOf('receipt') !== -1 || h.indexOf('bill') !== -1 || h.indexOf('photo') !== -1 || h.indexOf('link') !== -1; });

  // If Receipt column doesn't exist, append it
  if (colReceipt === -1) {
    const newColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, newColIndex).setValue('Receipt');
    headers.push('receipt');
    colReceipt = newColIndex - 1;
  }

  const lastRow = sheet.getLastRow();
  const nextSrNo = Math.max(lastRow, 1);
  const totalCols = Math.max(headers.length, sheet.getLastColumn());
  const newRow = new Array(totalCols).fill('');

  if (colSr !== -1) newRow[colSr] = nextSrNo;
  if (colFestival !== -1) newRow[colFestival] = payload.festival || 'General';
  if (colItem !== -1) newRow[colItem] = payload.item;
  if (colTotal !== -1) newRow[colTotal] = Number(payload.total) || 0;
  if (colGiven !== -1) newRow[colGiven] = (payload.given !== undefined && payload.given !== '') ? Number(payload.given) : (Number(payload.total) || 0);
  if (colPending !== -1) newRow[colPending] = (payload.pending !== undefined && payload.pending !== '') ? Number(payload.pending) : 0;
  if (colVolunteer !== -1) newRow[colVolunteer] = payload.volunteer || payload.recordedBy || Session.getActiveUser().getEmail() || 'Admin';
  if (colReceipt !== -1 && payload.receiptUrl) newRow[colReceipt] = payload.receiptUrl;

  sheet.appendRow(newRow);
  return `Expense "${payload.item}" of ₹${payload.total} recorded successfully!`;
}

/**
 * Sends automated WhatsApp receipt directly from ONE single dedicated forum number via API
 */
function sendAutomatedWhatsAppReceipt(payload, timestamp) {
  try {
    if (!CONFIG.WHATSAPP_AUTOMATION || !CONFIG.WHATSAPP_AUTOMATION.ENABLED) {
      return; // Automated API is disabled
    }

    if (!payload.phone || !payload.amount || payload.status !== 'Paid') {
      return;
    }

    let cleanPhone = String(payload.phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const formattedAmount = '₹' + Number(payload.amount).toLocaleString('en-IN');
    const message = `*Nyati Elan Cultural Forum - Payment Receipt*\n\n` +
      `Dear *${payload.name || 'Resident'}*,\n\n` +
      `Thank you! We have received your payment for the community forum.\n\n` +
      `📋 *Transaction Details:*\n` +
      `• *Flat:* ${payload.building}-${payload.flat}\n` +
      `• *Amount:* ${formattedAmount}\n` +
      `• *Payment Mode:* ${payload.paymentMode || 'UPI'}\n` +
      `• *Date & Time:* ${timestamp || payload.date || 'Recorded'}\n` +
      `• *Status:* Confirmed (Paid)\n\n` +
      `Your contribution helps support vibrant community celebrations and initiatives.\n\n` +
      `Warm regards,\n` +
      `*Nyati Elan Cultural Forum Team*`;

    if (CONFIG.WHATSAPP_AUTOMATION.PROVIDER === 'ULTRAMSG') {
      const url = `https://api.ultramsg.com/${CONFIG.WHATSAPP_AUTOMATION.ULTRAMSG_INSTANCE_ID}/messages/chat`;
      const options = {
        method: 'post',
        payload: {
          token: CONFIG.WHATSAPP_AUTOMATION.ULTRAMSG_TOKEN,
          to: cleanPhone,
          body: message
        },
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch(url, options);
      Logger.log("Automated WhatsApp Dispatched to " + cleanPhone + ": " + response.getContentText());
    } else if (CONFIG.WHATSAPP_AUTOMATION.PROVIDER === 'META') {
      const url = `https://graph.facebook.com/v19.0/${CONFIG.WHATSAPP_AUTOMATION.META_PHONE_NUMBER_ID}/messages`;
      const options = {
        method: 'post',
        headers: {
          'Authorization': `Bearer ${CONFIG.WHATSAPP_AUTOMATION.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message }
        }),
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch(url, options);
      Logger.log("Automated Meta WhatsApp Dispatched: " + response.getContentText());
    }
  } catch (err) {
    Logger.log("Error in sendAutomatedWhatsAppReceipt: " + err.toString());
  }
}

/**
 * Utility helper to get sheet with case-insensitive and trimmed name matching
 */
function getSheetCaseInsensitive(ss, sheetName) {
  const sheets = ss.getSheets();
  const target = sheetName.trim().toLowerCase();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Utility helper to get sheet or create with initial headers if not existing
 */
function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  let sheet = getSheetCaseInsensitive(ss, sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.appendRow(defaultHeaders);
    }
  }
  return sheet;
}

/**
 * Helper to build JSON Response with appropriate MIME type
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
