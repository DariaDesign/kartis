// Paste into the Google Sheet: Extensions → Apps Script. Then Deploy → New deployment → Web app,
// "Execute as: Me", "Who has access: Anyone". Copy the /exec URL into Vercel as SHEETS_WEBHOOK_URL.
// Set SECRET below to any long random text and put the same text into Vercel as SHEETS_SECRET.
const SECRET = 'CHANGE-ME-to-a-long-random-text';

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  if (data.secret !== SECRET) return ContentService.createTextOutput('forbidden');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(['Date', 'Email', 'Language', 'Source']);
  const email = String(data.email || '').toLowerCase();
  const existing = sheet.getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1).getValues().flat();
  if (existing.indexOf(email) === -1) sheet.appendRow([new Date(), email, data.lang || '', data.source || '']);
  return ContentService.createTextOutput('ok');
}
