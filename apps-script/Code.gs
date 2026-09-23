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
    PARTICIPATION: 'Participation',
    ANNADAN: 'Annadan',
    CONFIG: 'Config',
    STALLS: 'Stall Registration',
    PRASAD: 'Prasad Registration',
    SARI: 'Sari Registration',
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
 * Creates the Ganpati cultural activities registration form and links responses
 * to this project's spreadsheet. Run once from the Apps Script editor.
 */
function createGanpatiCulturalActivitiesForm() {
  const properties = PropertiesService.getScriptProperties();
  const existingFormId = properties.getProperty('GANPATI_FORM_ID');
  if (existingFormId) {
    const existingForm = FormApp.openById(existingFormId);
    Logger.log('Ganpati registration form already exists.');
    Logger.log('Edit URL: ' + existingForm.getEditUrl());
    Logger.log('Participant URL: ' + existingForm.getPublishedUrl());
    return {
      id: existingForm.getId(),
      editUrl: existingForm.getEditUrl(),
      publishedUrl: existingForm.getPublishedUrl()
    };
  }

  const form = FormApp.create('Ganpati Cultural Activities Registration');
  form.setDescription(
    'Register participants for Nyati Elan Cultural Forum Ganpati cultural activities. ' +
    'Please submit one response per participant.'
  );
  form.setConfirmationMessage(
    'Thank you! Your participation has been registered for the Ganpati cultural activities.'
  );
  form.setCollectEmail(false);

  form.addTextItem()
    .setTitle('Participant Name')
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('Age Group')
    .setChoiceValues([
      'Below 5 years',
      '5-8 years',
      '9-12 years',
      '13-17 years',
      '18-35 years',
      '36-59 years',
      '60 years and above'
    ])
    .setRequired(true);
  form.addTextItem()
    .setTitle('Building and Flat Number')
    .setHelpText('Example: B1-402')
    .setRequired(true);
  form.addTextItem()
    .setTitle('Mobile Number')
    .setHelpText('WhatsApp number preferred')
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle('Cultural Activity')
    .setChoiceValues([
      'Fancy Dress',
      'Singing',
      'Dancing',
      'Nyati Got Talent'
    ])
    .setHelpText('Select all activities in which the participant wants to participate.')
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Special Notes or Performance Details')
    .setRequired(false);

  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  properties.setProperty('GANPATI_FORM_ID', form.getId());

  Logger.log('Ganpati registration form created.');
  Logger.log('Edit URL: ' + form.getEditUrl());
  Logger.log('Participant URL: ' + form.getPublishedUrl());
  return {
    id: form.getId(),
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl()
  };
}

/**
 * Updates the existing Ganpati form with activity-specific registration fields.
 * Run this once after the form has been created.
 */
function updateGanpatiCulturalActivitiesForm() {
  const formId = '1-Y93jZD5qBvVl4WyL06T12buyXBRW6XrHCjXzRRTXhE';
  const form = FormApp.openById(formId);
  const itemTitles = form.getItems().map(function(item) {
    return item.getTitle();
  });

  if (itemTitles.indexOf('Dancing Participation Type') === -1) {
    form.addMultipleChoiceItem()
      .setTitle('Dancing Participation Type')
      .setChoiceValues(['Solo', 'Couple', 'Group'])
      .setHelpText('Select the format for the dancing performance.')
      .setRequired(false);
  }

  if (itemTitles.indexOf('Nyati Got Talent - Describe Your Talent') === -1) {
    form.addParagraphTextItem()
      .setTitle('Nyati Got Talent - Describe Your Talent')
      .setHelpText('Complete this only if Nyati Got Talent is selected above.')
      .setRequired(false);
  }

  PropertiesService.getScriptProperties().setProperty('GANPATI_FORM_ID', formId);
  Logger.log('Ganpati form updated with dancing format and talent description fields.');
  Logger.log('Edit URL: ' + form.getEditUrl());
  Logger.log('Participant URL: ' + form.getPublishedUrl());
  return {
    id: form.getId(),
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl()
  };
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

    // Lightweight, single-sheet reads for pages that only need one dataset —
    // avoids paying for the full 6-sheet fetchAllSheetData() read on every load.
    if (action === 'getParticipationData') {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const participationSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.PARTICIPATION);
      const participationValues = participationSheet ? participationSheet.getDataRange().getDisplayValues() : [];
      return createJsonResponse({ status: 'success', data: { participation: participationValues } });
    }

    if (action === 'getAnnadanData') {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const annadanSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ANNADAN);
      const annadanValues = annadanSheet ? annadanSheet.getDataRange().getDisplayValues() : [];
      return createJsonResponse({ status: 'success', data: { annadanItems: annadanValues } });
    }

    // Full donor-level Annadan pledges (Name, Mobile, Building, Flat, Item, Quantity) —
    // deliberately NOT part of getAnnadanData/getAllData (donations are anonymous to
    // the public). Only returned here after a server-side admin-email check.
    if (action === 'getAnnadanResponses') {
      const email = e && e.parameter && e.parameter.email;
      const rows = getAnnadanResponsesForAdmin(email);
      return createJsonResponse({ status: 'success', data: { annadanResponses: rows } });
    }

    // Generic admin check — returns only a boolean, no sensitive data. Used by
    // pages like participants.html to decide whether to show admin-only UI
    // (e.g. the bulk download containing mobile numbers) without needing a
    // dataset-specific endpoint just to check identity.
    if (action === 'checkAdmin') {
      const email = e && e.parameter && e.parameter.email;
      const isAdmin = isRegisteredAdminEmail(email);
      return createJsonResponse({ status: 'success', data: { isAdmin: isAdmin } });
    }

    // Lightweight read for the Stalls registration form — pulls only the
    // available stall dates (Config sheet rows where Item = STALL), not the
    // whole Config sheet or any other dataset.
    if (action === 'getStallData') {
      const stallDates = getStallDatesFromConfig();
      return createJsonResponse({ status: 'success', data: { stallDates: stallDates } });
    }

    // Prasad seva: date range (from Config) + per (date, period) registration
    // counts only — no names/mobiles exposed publicly.
    if (action === 'getPrasadData') {
      const data = getPrasadData();
      return createJsonResponse({ status: 'success', data: data });
    }

    // Sari seva: date range (from Config) + which (date, period) slots are
    // already claimed (boolean only, no sponsor identity) + the unlock time,
    // for UI purposes. The real enforcement happens in addSariRegistration.
    if (action === 'getSariData') {
      const data = getSariData();
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

    if (action === 'addParticipant' || action === 'saveParticipant') {
      const payload = request.payload;
      const resultMessage = saveParticipant(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    if (action === 'addAnnadanResponse' || action === 'donateAnnadan') {
      const payload = request.payload;
      const resultMessage = saveAnnadanResponse(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    if (action === 'addStallRegistration' || action === 'saveStallRegistration') {
      const payload = request.payload;
      const resultMessage = saveStallRegistration(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    if (action === 'addPrasadRegistration' || action === 'savePrasadRegistration') {
      const payload = request.payload;
      const resultMessage = savePrasadRegistration(payload);
      return createJsonResponse({ status: 'success', data: resultMessage });
    }

    if (action === 'addSariRegistration' || action === 'saveSariRegistration') {
      const payload = request.payload;
      const resultMessage = saveSariRegistration(payload);
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

  // 3b. Fetch Participation Data (one row per participant per event)
  const participationSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.PARTICIPATION);
  const participationValues = participationSheet ? participationSheet.getDataRange().getDisplayValues() : [];

  // 3c. Fetch Annadan requirements (pledge details are intentionally NOT exposed here —
  // donations are anonymous. Received/Still Needed totals are pre-aggregated server-side
  // by recalculateAnnadanTotals() whenever a pledge is saved.)
  const annadanSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ANNADAN);
  const annadanValues = annadanSheet ? annadanSheet.getDataRange().getDisplayValues() : [];

  // 4. Fetch Summary Data (returns all rows and columns for full parsing)
  const summarySheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.SUMMARY);
  const summaryValues = summarySheet ? summarySheet.getDataRange().getDisplayValues() : [];

  // 5. Fetch Admins Data. Region markers may be in the cell(s) immediately
  // to the right of each email (N = North, SE = South-East).
  const adminSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ADMINS) || getSheetCaseInsensitive(ss, 'Admin');
  let adminEmails = [];
  let adminRegions = {};
  if (adminSheet) {
    const adminValues = adminSheet.getDataRange().getDisplayValues();
    adminValues.forEach(function(row) {
      row.forEach(function(cell, cellIndex) {
        if (!cell) return;
        const text = cell.toString().trim().toLowerCase();
        // Regex to extract valid email addresses from cell text
        const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (matches) {
          const adjacentRegions = [];
          for (let regionIndex = cellIndex + 1; regionIndex < row.length; regionIndex++) {
            const region = normalizeAdminRegion(row[regionIndex]);
            if (!region) break;
            adjacentRegions.push(region);
          }
          const adjacentRegion = mergeAdminRegions(adjacentRegions);
          matches.forEach(function(email) {
            if (adminEmails.indexOf(email) === -1) {
              adminEmails.push(email);
            }
            if (adjacentRegion) {
              adminRegions[email] = mergeAdminRegions([adminRegions[email], adjacentRegion]);
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
    participation: participationValues,
    annadanItems: annadanValues,
    summary: summaryValues,
    admins: adminEmails,
    adminRegions: adminRegions
  };
}

/**
 * Normalizes an Admins-sheet region marker while treating unknown values as
 * unscoped so those admins retain the existing full-access behavior.
 */
function normalizeAdminRegion(value) {
  const region = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!region) return '';
  if (region === 'BOTH') return 'BOTH';
  const hasNorth = /(^|[,/|+&])(?:N|NORTH)(?=$|[,/|+&])/.test(region);
  const hasSouthEast = /(^|[,/|+&])(?:SE|SOUTH-EAST|SOUTHEAST)(?=$|[,/|+&])/.test(region);
  if (hasNorth && hasSouthEast) return 'BOTH';
  if (hasNorth) return 'N';
  if (hasSouthEast) return 'SE';
  return '';
}

function mergeAdminRegions(regions) {
  const hasNorth = regions.some(function(region) { return region === 'N' || region === 'BOTH'; });
  const hasSouthEast = regions.some(function(region) { return region === 'SE' || region === 'BOTH'; });
  if (hasNorth && hasSouthEast) return 'BOTH';
  if (hasNorth) return 'N';
  if (hasSouthEast) return 'SE';
  return '';
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

  // "Other" (vendor / non-resident) contributions always create a new row —
  // never matched against a prior entry, since the same vendor can give more than once
  // and each contribution should be its own record.
  if (targetBuilding !== 'OTHER') {
    // Search for existing resident by Building and Flat (starting from row index 1 to skip header)
    for (let i = 1; i < data.length; i++) {
      const currentBuilding = colBuilding !== -1 ? String(data[i][colBuilding]).trim().toUpperCase() : '';
      const currentFlat = colFlat !== -1 ? String(data[i][colFlat]).trim() : '';
      if (currentBuilding === targetBuilding && currentFlat === targetFlat) {
        targetRowIndex = i + 1; // 1-based index for SpreadsheetApp
        break;
      }
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
 * Saves a cultural-activity participation entry: one row per event the
 * participant registered for, into the Participation sheet
 * (Entry Date | Name | Building | Flat | Event | Song | Any Other Specific Req.).
 * Song is per-event since a participant's singing piece may differ from
 * their dance piece.
 */
function saveParticipant(payload) {
  if (!payload || !payload.name || !payload.building || !payload.flat || !payload.entries || !payload.entries.length) {
    throw new Error('Name, Building, Flat and at least one Event are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.PARTICIPATION, [
    'Entry Date', 'Name', 'Mobile', 'Building', 'Flat', 'Event', 'Song', 'Any Other Specific Req.'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  function findCol(tests) {
    return headers.findIndex(function(h) { return tests.some(function(t) { return h.indexOf(t) !== -1; }); });
  }

  const colDate = findCol(['entry date', 'date', 'timestamp']);
  const colName = findCol(['name']);
  let colMobile = findCol(['mobile', 'phone', 'contact']);
  const colBuilding = findCol(['building']);
  const colFlat = findCol(['flat']);
  const colEvent = findCol(['event']);
  const colSong = findCol(['song']);
  const colNotes = findCol(['any other', 'requirement', 'req', 'notes']);

  // Older Participation sheets (created before this field) won't have a Mobile column yet — add it.
  if (colMobile === -1) {
    const newColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, newColIndex).setValue('Mobile');
    headers.push('mobile');
    colMobile = newColIndex - 1;
  }

  const numCols = Math.max(headers.length, sheet.getLastColumn());
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  const rowsToAppend = payload.entries.map(function(entry) {
    const row = new Array(numCols).fill('');
    if (colDate !== -1) row[colDate] = timestamp;
    if (colName !== -1) row[colName] = payload.name;
    if (colMobile !== -1) row[colMobile] = payload.mobile || '';
    if (colBuilding !== -1) row[colBuilding] = payload.building;
    if (colFlat !== -1) row[colFlat] = payload.flat;
    if (colEvent !== -1) row[colEvent] = entry.event;
    if (colSong !== -1) row[colSong] = entry.song || '';
    if (colNotes !== -1) row[colNotes] = payload.notes || '';
    return row;
  });

  rowsToAppend.forEach(function(row) { sheet.appendRow(row); });

  return `Registered ${payload.name} for ${payload.entries.map(function(e) { return e.event; }).join(', ')}`;
}

/**
 * Finds the Annadan pledges sheet, tolerating a couple of likely name
 * variants (e.g. a "Response"/"Resonce" spelling difference) without
 * creating anything — used for read paths.
 */
function findAnnadanResponseSheet(ss) {
  const candidates = ['Annadan Response', 'Annadan Resonce', 'Annadan Responses'];
  for (let i = 0; i < candidates.length; i++) {
    const found = getSheetCaseInsensitive(ss, candidates[i]);
    if (found) return found;
  }
  return null;
}

/**
 * Server-side check that an email belongs to a registered admin (reads the
 * Admins sheet directly, the same source of truth app.html's admin list
 * comes from) — this is a real backend gate, not just a client-side hide.
 */
function isRegisteredAdminEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const adminSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ADMINS) || getSheetCaseInsensitive(ss, 'Admin');
  if (!adminSheet) return false;

  const adminValues = adminSheet.getDataRange().getDisplayValues();
  for (let i = 0; i < adminValues.length; i++) {
    for (let j = 0; j < adminValues[i].length; j++) {
      const cell = String(adminValues[i][j] || '').trim().toLowerCase();
      if (cell === normalizedEmail) return true;
    }
  }
  return false;
}

/**
 * Returns full Annadan pledge rows (donor name, mobile, building, flat, item,
 * quantity) — only after verifying the given email is a registered admin.
 * Throws otherwise, so the caller never silently gets partial/empty data
 * confused with "not authorized".
 */
function getAnnadanResponsesForAdmin(email) {
  if (!isRegisteredAdminEmail(email)) {
    throw new Error('Not authorized. Only registered admins can view Annadan donor details.');
  }
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const responseSheet = findAnnadanResponseSheet(ss);
  return responseSheet ? responseSheet.getDataRange().getDisplayValues() : [];
}


/**
 * Same lookup as findAnnadanResponseSheet, but creates the canonical
 * "Annadan Response" sheet (with the requested headers) if none exists yet.
 * Used only on the write path so read calls never mutate the spreadsheet.
 */
function getOrCreateAnnadanResponseSheet(ss) {
  const existing = findAnnadanResponseSheet(ss);
  if (existing) return existing;
  return getOrCreateSheet(ss, 'Annadan Response', [
    'Response Time', 'Name', 'Mobile', 'Building', 'Flat', 'Item', 'Quantity'
  ]);
}

/**
 * Saves a new Annadan donation pledge, then recalculates the
 * Quantity Received / Quantity Still Needed columns on the Annadan sheet.
 */
function saveAnnadanResponse(payload) {
  if (!payload || !payload.name || !payload.building || !payload.flat || !payload.item || !payload.quantity) {
    throw new Error('Name, Building, Flat, Item and Quantity are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateAnnadanResponseSheet(ss);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  function findCol(tests) {
    return headers.findIndex(function(h) { return tests.some(function(t) { return h.indexOf(t) !== -1; }); });
  }

  const colTime = findCol(['response time', 'timestamp', 'time']);
  const colName = findCol(['name']);
  const colMobile = findCol(['mobile', 'phone', 'contact']);
  const colBuilding = findCol(['building']);
  const colFlat = findCol(['flat']);
  const colItem = findCol(['item']);
  const colQty = findCol(['quantity', 'qty']);

  const numCols = Math.max(headers.length, sheet.getLastColumn());
  const row = new Array(numCols).fill('');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (colTime !== -1) row[colTime] = timestamp;
  if (colName !== -1) row[colName] = payload.name;
  if (colMobile !== -1) row[colMobile] = payload.mobile || '';
  if (colBuilding !== -1) row[colBuilding] = payload.building;
  if (colFlat !== -1) row[colFlat] = payload.flat;
  if (colItem !== -1) row[colItem] = payload.item;
  if (colQty !== -1) row[colQty] = Number(payload.quantity) || 0;

  sheet.appendRow(row);

  recalculateAnnadanTotals(ss);

  return `Thank you! Recorded ${payload.quantity} kg of ${payload.item} pledged by ${payload.name}`;
}

/**
 * Recomputes Quantity Received (sum of all pledges per item) and
 * Quantity Still Needed (Required minus Received, floored at 0) on the
 * Annadan sheet. Item column and Quantity Required are left untouched —
 * those stay admin-managed.
 */
function recalculateAnnadanTotals(ss) {
  ss = ss || SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const annadanSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.ANNADAN);
  if (!annadanSheet) return;

  const annadanValues = annadanSheet.getDataRange().getValues();
  if (annadanValues.length < 2) return;
  const annadanHeaders = annadanValues[0].map(function(h) { return String(h).trim().toLowerCase(); });

  const colItem = annadanHeaders.findIndex(function(h) { return h.indexOf('item') !== -1; });
  const colRequired = annadanHeaders.findIndex(function(h) { return h.indexOf('required') !== -1; });
  const colReceived = annadanHeaders.findIndex(function(h) { return h.indexOf('received') !== -1; });
  const colStillNeeded = annadanHeaders.findIndex(function(h) { return h.indexOf('still needed') !== -1 || h.indexOf('remaining') !== -1; });

  if (colItem === -1 || (colReceived === -1 && colStillNeeded === -1)) return;

  // Sum pledged quantities per item (case-insensitive, trimmed) from the responses sheet.
  const responseSheet = findAnnadanResponseSheet(ss);
  const totals = {};
  if (responseSheet) {
    const responseValues = responseSheet.getDataRange().getValues();
    if (responseValues.length > 1) {
      const responseHeaders = responseValues[0].map(function(h) { return String(h).trim().toLowerCase(); });
      const rColItem = responseHeaders.findIndex(function(h) { return h.indexOf('item') !== -1; });
      const rColQty = responseHeaders.findIndex(function(h) { return h.indexOf('quantity') !== -1 || h.indexOf('qty') !== -1; });
      if (rColItem !== -1 && rColQty !== -1) {
        for (let i = 1; i < responseValues.length; i++) {
          const itemKey = String(responseValues[i][rColItem] || '').trim().toLowerCase();
          if (!itemKey) continue;
          const qty = Number(responseValues[i][rColQty]) || 0;
          totals[itemKey] = (totals[itemKey] || 0) + qty;
        }
      }
    }
  }

  for (let i = 1; i < annadanValues.length; i++) {
    const itemKey = String(annadanValues[i][colItem] || '').trim().toLowerCase();
    if (!itemKey) continue;
    const required = colRequired !== -1 ? (Number(annadanValues[i][colRequired]) || 0) : 0;
    const received = totals[itemKey] || 0;
    const stillNeeded = Math.max(required - received, 0);
    if (colReceived !== -1) annadanSheet.getRange(i + 1, colReceived + 1).setValue(received);
    if (colStillNeeded !== -1) annadanSheet.getRange(i + 1, colStillNeeded + 1).setValue(stillNeeded);
  }
}

/**
 * Reads available stall dates from the Config sheet — rows where the Item
 * column equals "STALL" (case-insensitive); the Value column of each such
 * row is one available date. Multiple STALL rows = multiple available dates.
 */
function getStallDatesFromConfig() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const configSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.CONFIG);
  if (!configSheet) return [];

  const values = configSheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const colItem = headers.findIndex(function(h) { return h.indexOf('item') !== -1; });
  const colValue = headers.findIndex(function(h) { return h.indexOf('value') !== -1; });
  if (colItem === -1 || colValue === -1) return [];

  const dates = [];
  for (let i = 1; i < values.length; i++) {
    const item = String(values[i][colItem] || '').trim().toUpperCase();
    if (item === 'STALL') {
      const val = String(values[i][colValue] || '').trim();
      if (val) dates.push(val);
    }
  }
  // De-duplicate while preserving the order they appear in the sheet.
  return dates.filter(function(d, idx) { return dates.indexOf(d) === idx; });
}

/**
 * Saves a stall registration entry (name, mobile, stall date, resident/
 * outsider, category, items, tables, power request, estimated amount).
 */
function saveStallRegistration(payload) {
  if (!payload || !payload.name || !payload.mobile || !payload.stallDate || !payload.residentType || !payload.category || !payload.items || !payload.tables) {
    throw new Error('Name, Mobile, Stall Date, Resident/Outsider, Category, Items and Tables are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.STALLS, [
    'Entry Date', 'Name', 'Mobile', 'Stall Date', 'Resident or Outsider', 'Category',
    'Items', 'Tables Requested', '15A Power Requested', 'Estimated Amount (Rs.)'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  function findCol(tests) {
    return headers.findIndex(function(h) { return tests.some(function(t) { return h.indexOf(t) !== -1; }); });
  }

  const colDate = findCol(['entry date', 'timestamp']);
  const colName = findCol(['name']);
  const colMobile = findCol(['mobile', 'phone', 'contact']);
  const colStallDate = findCol(['stall date']);
  const colType = findCol(['resident', 'outsider', 'type']);
  const colCategory = findCol(['category']);
  const colItems = findCol(['items']);
  const colTables = findCol(['tables']);
  const colPower = findCol(['power']);
  const colAmount = findCol(['amount']);

  const numCols = Math.max(headers.length, sheet.getLastColumn());
  const row = new Array(numCols).fill('');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (colDate !== -1) row[colDate] = timestamp;
  if (colName !== -1) row[colName] = payload.name;
  if (colMobile !== -1) row[colMobile] = payload.mobile;
  if (colStallDate !== -1) row[colStallDate] = payload.stallDate;
  if (colType !== -1) row[colType] = payload.residentType;
  if (colCategory !== -1) row[colCategory] = payload.category;
  if (colItems !== -1) row[colItems] = payload.items;
  if (colTables !== -1) row[colTables] = Number(payload.tables) || 1;
  if (colPower !== -1) row[colPower] = payload.powerRequested ? 'Yes' : 'No';
  if (colAmount !== -1) row[colAmount] = Number(payload.estimatedAmount) || 0;

  sheet.appendRow(row);

  return `Stall registered for ${payload.name} on ${payload.stallDate}`;
}

// ===================================================================================
// Durga Puja seva: Prasad and Sari registration
// ===================================================================================

// Non-admin Sari registration doesn't open until this moment (IST). Admins can
// register earlier — enforced here on the backend, not just hidden in the UI.
const SARI_UNLOCK_TIMESTAMP = new Date('2026-10-04T00:00:01+05:30');

/**
 * Reads a single value from the Config sheet (Item/Value pairs) by exact
 * item name, using getValues() rather than getDisplayValues() so a real
 * Sheets date cell comes back as a native Date object for arithmetic.
 */
function getConfigValue(itemName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const configSheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.CONFIG);
  if (!configSheet) return null;

  const values = configSheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const colItem = headers.findIndex(function(h) { return h.indexOf('item') !== -1; });
  const colValue = headers.findIndex(function(h) { return h.indexOf('value') !== -1; });
  if (colItem === -1 || colValue === -1) return null;

  const target = String(itemName).trim().toLowerCase();
  for (let i = 1; i < values.length; i++) {
    const item = String(values[i][colItem] || '').trim().toLowerCase();
    if (item === target) return values[i][colValue];
  }
  return null;
}

function toDateObject(value) {
  if (value instanceof Date) return value;
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Canonical key format used both as the tile identifier and the value stored
// in the registration sheets, e.g. "2026-10-11".
function formatDateKey(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Builds the inclusive list of date keys between two Config-sheet date
 * values (e.g. "Prasad Start Date" / "Prasad End Date").
 */
function getDateRangeList(startItem, endItem) {
  const start = toDateObject(getConfigValue(startItem));
  const end = toDateObject(getConfigValue(endItem));
  if (!start || !end) return [];

  const dates = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= endDay) {
    dates.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Prasad seva: returns the configured date range plus a count of existing
 * registrations per (date, period) — counts only, no registrant identity.
 */
function getPrasadData() {
  const dates = getDateRangeList('Prasad Start Date', 'Prasad End Date');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.PRASAD);
  const counts = {};

  if (sheet) {
    const values = sheet.getDataRange().getDisplayValues();
    if (values.length > 1) {
      const headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
      const colDate = headers.findIndex(function(h) { return h.indexOf('prasad date') !== -1 || h.indexOf('date') !== -1; });
      const colPeriod = headers.findIndex(function(h) { return h.indexOf('period') !== -1; });
      for (let i = 1; i < values.length; i++) {
        const d = String(values[i][colDate] || '').trim();
        const p = String(values[i][colPeriod] || '').trim();
        if (!d || !p) continue;
        const key = d + '|' + p;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }

  return { dates: dates, counts: counts };
}

/**
 * Saves a Prasad seva registration — always appends (many people can sign up
 * for the same date/period), no uniqueness constraint.
 */
function savePrasadRegistration(payload) {
  if (!payload || !payload.name || !payload.mobile || !payload.building || !payload.flat || !payload.date || !payload.period) {
    throw new Error('Name, Mobile, Building, Flat, Date and Period are required.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.PRASAD, [
    'Entry Date', 'Name', 'Mobile', 'Building', 'Flat', 'Prasad Date', 'Period'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  function findCol(tests) {
    return headers.findIndex(function(h) { return tests.some(function(t) { return h.indexOf(t) !== -1; }); });
  }

  const colDate = findCol(['entry date', 'timestamp']);
  const colName = findCol(['name']);
  const colMobile = findCol(['mobile', 'phone', 'contact']);
  const colBuilding = findCol(['building']);
  const colFlat = findCol(['flat']);
  const colPrasadDate = findCol(['prasad date', 'date']);
  const colPeriod = findCol(['period']);

  const numCols = Math.max(headers.length, sheet.getLastColumn());
  const row = new Array(numCols).fill('');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (colDate !== -1) row[colDate] = timestamp;
  if (colName !== -1) row[colName] = payload.name;
  if (colMobile !== -1) row[colMobile] = payload.mobile;
  if (colBuilding !== -1) row[colBuilding] = payload.building;
  if (colFlat !== -1) row[colFlat] = payload.flat;
  if (colPrasadDate !== -1) row[colPrasadDate] = payload.date;
  if (colPeriod !== -1) row[colPeriod] = payload.period;

  sheet.appendRow(row);

  return `Registered ${payload.name} for Prasad seva on ${payload.date} (${payload.period})`;
}

/**
 * Sari seva: returns the configured date range, which (date, period) slots
 * are already claimed (boolean only — no sponsor identity), and the unlock
 * timestamp for the UI to display a countdown/lock message.
 */
function getSariData() {
  const dates = getDateRangeList('Sari Start Date', 'Sari End Date');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getSheetCaseInsensitive(ss, CONFIG.SHEETS.SARI);
  const claimed = {};

  if (sheet) {
    const values = sheet.getDataRange().getDisplayValues();
    if (values.length > 1) {
      const headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
      const colDate = headers.findIndex(function(h) { return h.indexOf('sari date') !== -1 || h.indexOf('date') !== -1; });
      const colPeriod = headers.findIndex(function(h) { return h.indexOf('period') !== -1; });
      for (let i = 1; i < values.length; i++) {
        const d = String(values[i][colDate] || '').trim();
        const p = String(values[i][colPeriod] || '').trim();
        if (!d || !p) continue;
        claimed[d + '|' + p] = true;
      }
    }
  }

  return { dates: dates, claimed: claimed, unlockAt: SARI_UNLOCK_TIMESTAMP.toISOString() };
}

/**
 * Saves a Sari sponsorship — enforces both the midnight time-lock (bypassed
 * only for a verified admin email) and the one-sponsor-per-slot rule, on the
 * backend, so neither can be bypassed via the browser.
 */
function saveSariRegistration(payload) {
  if (!payload || !payload.name || !payload.mobile || !payload.building || !payload.flat || !payload.date || !payload.period) {
    throw new Error('Name, Mobile, Building, Flat, Date and Period are required.');
  }

  const isAdmin = payload.adminEmail ? isRegisteredAdminEmail(payload.adminEmail) : false;
  if (!isAdmin && new Date() < SARI_UNLOCK_TIMESTAMP) {
    throw new Error('Sari registration opens on 4 Oct 2026 at midnight.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, CONFIG.SHEETS.SARI, [
    'Entry Date', 'Name', 'Mobile', 'Building', 'Flat', 'Sari Date', 'Period', 'Color'
  ]);

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) {
    return String(h).trim().toLowerCase();
  });

  function findCol(tests) {
    return headers.findIndex(function(h) { return tests.some(function(t) { return h.indexOf(t) !== -1; }); });
  }

  const colEntryDate = findCol(['entry date', 'timestamp']);
  const colName = findCol(['name']);
  const colMobile = findCol(['mobile', 'phone', 'contact']);
  const colBuilding = findCol(['building']);
  const colFlat = findCol(['flat']);
  const colSariDate = findCol(['sari date', 'date']);
  const colPeriod = findCol(['period']);
  const colColor = findCol(['color']);

  // Enforce "one entry per (date, period)" — reject if already claimed.
  const existingValues = sheet.getDataRange().getDisplayValues();
  if (existingValues.length > 1 && colSariDate !== -1 && colPeriod !== -1) {
    for (let i = 1; i < existingValues.length; i++) {
      const d = String(existingValues[i][colSariDate] || '').trim();
      const p = String(existingValues[i][colPeriod] || '').trim();
      if (d === payload.date && p === payload.period) {
        throw new Error('This slot has already been claimed by someone else.');
      }
    }
  }

  const numCols = Math.max(headers.length, sheet.getLastColumn());
  const row = new Array(numCols).fill('');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (colEntryDate !== -1) row[colEntryDate] = timestamp;
  if (colName !== -1) row[colName] = payload.name;
  if (colMobile !== -1) row[colMobile] = payload.mobile;
  if (colBuilding !== -1) row[colBuilding] = payload.building;
  if (colFlat !== -1) row[colFlat] = payload.flat;
  if (colSariDate !== -1) row[colSariDate] = payload.date;
  if (colPeriod !== -1) row[colPeriod] = payload.period;
  if (colColor !== -1) row[colColor] = payload.color || '';

  sheet.appendRow(row);

  return `Sari sponsorship registered for ${payload.date} (${payload.period})`;
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
