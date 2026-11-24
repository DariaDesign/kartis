// Paste into the Google Sheet "Kartis — AI waitlist": Extensions → Apps Script (project "Kartis waitlist").
// After a change: Deploy → Manage deployments → ✎ → Version: New version → Deploy (the /exec URL stays the same).
// SECRET must match SHEETS_SECRET in Vercel.
const SECRET = 'CHANGE-ME-to-the-same-secret-as-in-Vercel';
const AUTO_SHOW_NOTES = true;   // false: new notes wait until you tick "Show" in the Notes sheet

function out(text, json) {
  return ContentService.createTextOutput(text).setMimeType(json ? ContentService.MimeType.JSON : ContentService.MimeType.TEXT);
}
function sheetNamed(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
// A cell that starts with = + - @ would become a formula: keep it as text
function safe(v, max) { const s = String(v || '').slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }

const NOTE_HEADER = ['Date', 'Id', 'Text', 'Name', 'City', 'Country', 'Paper', 'Color', 'Font', 'Show', 'Client'];

function doPost(e) {
  const data = JSON.parse((e.postData && e.postData.contents) || '{}');
  if (data.secret !== SECRET) return out('forbidden');
  if (data.type === 'note') return addNote(data);
  // "Draft with AI" waiting list (first sheet)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(['Date', 'Email', 'Language', 'Source']);
  const email = String(data.email || '').toLowerCase();
  const existing = sheet.getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1).getValues().flat();
  if (existing.indexOf(email) === -1) sheet.appendRow([new Date(), email, data.lang || '', data.source || '']);
  return out('ok');
}

function addNote(d) {
  const sh = sheetNamed('Notes', NOTE_HEADER);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    // At most 3 notes from one visitor in 10 minutes (Client is a hash, not the IP)
    const rows = sh.getLastRow() > 1 ? sh.getRange(Math.max(2, sh.getLastRow() - 199), 1, Math.min(200, sh.getLastRow() - 1), NOTE_HEADER.length).getValues() : [];
    const since = Date.now() - 10 * 60 * 1000;
    const recent = rows.filter((r) => r[10] === d.client && new Date(r[0]).getTime() > since).length;
    if (d.client && recent >= 3) return out('slow down');
    const id = Utilities.getUuid().slice(0, 8);
    sh.appendRow([new Date(), id, safe(d.text, 140), safe(d.name, 40), safe(d.city, 60), safe(d.country, 60), d.paper === 'letter' ? 'letter' : 'sticker', safe(d.color, 9), Number(d.font) || 0, AUTO_SHOW_NOTES, safe(d.client, 16)]);
    return out(JSON.stringify({ ok: true, id: id, shown: AUTO_SHOW_NOTES }), true);
  } finally { lock.releaseLock(); }
}

// Notes for the board: newest first, only rows with Show = TRUE
function doGet(e) {
  if (((e && e.parameter) || {}).secret !== SECRET) return out('forbidden');
  const sh = sheetNamed('Notes', NOTE_HEADER);
  if (sh.getLastRow() < 2) return out('[]', true);
  const n = Math.min(300, sh.getLastRow() - 1);
  const rows = sh.getRange(sh.getLastRow() - n + 1, 1, n, NOTE_HEADER.length).getValues();
  const list = rows.filter((r) => r[9] === true).reverse().slice(0, 120).map((r) => ({
    id: r[1], text: String(r[2]).replace(/^'/, ''), name: String(r[3]).replace(/^'/, ''), city: r[4], country: r[5], paper: r[6], color: r[7], font: r[8], at: r[0]
  }));
  return out(JSON.stringify(list), true);
}
