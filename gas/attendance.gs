const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';
// A(0):line_user_id / B(1):LINE表示名 / C(2):登録名 / D(3):メール / E(4):有効フラグ

function doGet(e) {
  const callback = e.parameter.callback;
  const action   = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'getStaff')         result = getStaff();
    else if (action === 'getStaffByLineId') result = getStaffByLineId(e.parameter);
    else if (action === 'getSettings')      result = getSettingsPublic();
    else result = { success: false, error: 'unknown action' };
  } catch(err) { result = { success: false, error: err.message }; }
  const json = JSON.stringify(result);
  if (callback) return ContentService.createTextOutput(callback+'('+json+')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action || '';
  let result = {};
  try {
    if (action === 'submitAttendance') result = submitAttendance(e.parameter);
    else result = { success: false, error: 'unknown action' };
  } catch(err) { result = { success: false, error: err.message }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function openSS() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function getSheet(name) {
  const s = openSS().getSheetByName(name);
  if (!s) throw new Error('シートが見つかりません: ' + name);
  return s;
}
function getSettingMap() {
  const ss    = openSS();
  const tz    = ss.getSpreadsheetTimeZone();
  const sheet = ss.getSheetByName('管理者設定');
  if (!sheet) throw new Error('シートが見つかりません: 管理者設定');
  const rows  = sheet.getDataRange().getValues();
  const map   = {};
  for (let i = 1; i < rows.length; i++) {
    let v = rows[i][1];
    if (v instanceof Date) {
      const hhmm = Utilities.formatDate(v, tz, 'HH:mm');
      v = (hhmm === '00:00') ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : hhmm;
    }
    map[rows[i][0]] = v;
  }
  return map;
}
function applyTemplate(template, vars) {
  let s = template || '';
  Object.keys(vars).forEach(function(k) { s = s.split('{'+k+'}').join(vars[k]); });
  return s;
}
function staffName(row) { return (row[2]&&String(row[2]).trim()) ? String(row[2]).trim() : String(row[1]).trim(); }
function isEnabled(row) {
  const v = row[4];
  if (v === false || v === 'FALSE') return false;
  if (v === null || v === undefined || v === '') return true;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}

function getSettingsPublic() {
  const map = getSettingMap();
  return { success: true, data: { emergency_phone: map['emergency_phone'] || '' } };
}

function getStaff() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const names = [];
  for (let i = 1; i < rows.length; i++) { if (isEnabled(rows[i])) names.push(staffName(rows[i])); }
  return { success: true, data: names };
}

function getStaffByLineId(params) {
  const lineUserId = params.lineUserId;
  if (!lineUserId) return { success: false, error: 'lineUserId required' };
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === lineUserId) return { success: true, data: { found: true, name: staffName(rows[i]), enabled: isEnabled(rows[i]) } };
  }
  return { success: true, data: { found: false } };
}

/** MailApp.sendEmail() の送信上限は無料Gmailで1日100通 */
function submitAttendance(params) {
  const name    = params.name;
  const type    = params.type;
  const now     = new Date();
  const timeStr = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const setting    = getSettingMap();
  const adminEmail = setting['admin_email'] || '';
  const ccList     = (setting['cc_emails']||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  const sheet = getSheet('出退勤記録');
  const rows  = sheet.getDataRange().getValues();
  const vars  = { name: name, time: timeStr };
  if (type === 'in') {
    sheet.appendRow([name, now, '']);
    if (adminEmail) {
      const tmplIn      = setting['template_attendance_in']      || '';
      const tmplInBody  = setting['template_attendance_in_body'] || '';
      const subject = tmplIn ? applyTemplate(tmplIn, vars) : '【出勤】'+name+'さんが出勤しました（'+timeStr+'）';
      const body    = tmplInBody ? applyTemplate(tmplInBody, vars) : 'スタッフ名：'+name+'\n日時：'+now.toLocaleString('ja-JP');
      MailApp.sendEmail({ to: adminEmail, cc: ccList.join(','), subject: subject, body: body });
    }
  } else if (type === 'out') {
    let updated = false;
    for (let i = rows.length-1; i >= 1; i--) {
      if (rows[i][0] === name && !rows[i][2]) { sheet.getRange(i+1,3).setValue(now); updated = true; break; }
    }
    if (!updated) sheet.appendRow([name, '', now]);
    if (adminEmail) {
      const tmplOut     = setting['template_attendance_out']      || '';
      const tmplOutBody = setting['template_attendance_out_body'] || '';
      const subject = tmplOut ? applyTemplate(tmplOut, vars) : '【退勤】'+name+'さんが退勤しました（'+timeStr+'）';
      const body    = tmplOutBody ? applyTemplate(tmplOutBody, vars) : 'スタッフ名：'+name+'\n日時：'+now.toLocaleString('ja-JP');
      MailApp.sendEmail({ to: adminEmail, cc: ccList.join(','), subject: subject, body: body });
    }
  }
  return { success: true, time: timeStr, type: type };
}
