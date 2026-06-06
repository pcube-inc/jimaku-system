const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';
// A(0):line_user_id / B(1):LINE表示名 / C(2):登録名 / D(3):メール / E(4):有効フラグ

function doGet(e) {
  const callback = e.parameter.callback;
  const action   = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'getStaff')          result = getStaff();
    else if (action === 'getStaffByLineId')  result = getStaffByLineId(e.parameter);
    else if (action === 'checkTodayShift')   result = checkTodayShift(e.parameter);
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
    if (action === 'submitWakeup') result = submitWakeup(e.parameter);
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
  const sheet = getSheet('管理者設定');
  const rows  = sheet.getDataRange().getValues();
  const map   = {};
  for (let i = 1; i < rows.length; i++) { map[rows[i][0]] = rows[i][1]; }
  return map;
}
function todayStr() {
  const now = new Date();
  return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
}
function staffName(row) { return (row[2]&&String(row[2]).trim()) ? String(row[2]).trim() : String(row[1]).trim(); }
function isEnabled(row) { return row[4] === true || row[4] === 'TRUE'; }

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

function checkTodayShift(params) {
  const name     = params.name;
  const today    = todayStr();
  const setting  = getSettingMap();
  const deadline = setting['wakeup_deadline'] || '08:00';
  const shiftSheet = getSheet('確定シフト');
  const shiftRows  = shiftSheet.getDataRange().getValues();
  let onShift = false;
  for (let i = 1; i < shiftRows.length; i++) {
    if (shiftRows[i][0] === today && shiftRows[i][1] === name) { onShift = true; break; }
  }
  if (!onShift) return { success: true, data: { onShift: false } };
  const wakeSheet = getSheet('起床確認');
  const wakeRows  = wakeSheet.getDataRange().getValues();
  let pressedAt = null;
  for (let i = 1; i < wakeRows.length; i++) {
    if (wakeRows[i][0] === today && wakeRows[i][1] === name) {
      const dt = new Date(wakeRows[i][2]);
      pressedAt = String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
      break;
    }
  }
  return { success: true, data: { onShift: true, pressedAt: pressedAt, deadline: deadline } };
}

function submitWakeup(params) {
  const name     = params.name;
  const today    = todayStr();
  const setting  = getSettingMap();
  const deadline = setting['wakeup_deadline'] || '08:00';
  const sheet    = getSheet('起床確認');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === today && rows[i][1] === name) return { success: true, alreadyPressed: true };
  }
  sheet.appendRow([today, name, new Date(), deadline, false]);
  return { success: true };
}

/**
 * checkUnconfirmed() — time-based trigger 必須
 * MailApp.sendEmail() の送信上限は無料Gmailで1日100通
 */
function checkUnconfirmed() {
  const today      = todayStr();
  const setting    = getSettingMap();
  const adminEmail = setting['admin_email'] || '';
  const deadline   = setting['wakeup_deadline'] || '08:00';
  const shiftSheet = getSheet('確定シフト');
  const shiftRows  = shiftSheet.getDataRange().getValues();
  const scheduled  = [];
  for (let i = 1; i < shiftRows.length; i++) { if (shiftRows[i][0] === today) scheduled.push(shiftRows[i][1]); }
  if (!scheduled.length) return;
  const wakeSheet = getSheet('起床確認');
  const wakeRows  = wakeSheet.getDataRange().getValues();
  const pressed   = [];
  for (let i = 1; i < wakeRows.length; i++) { if (wakeRows[i][0] === today) pressed.push(wakeRows[i][1]); }
  scheduled.forEach(function(name) {
    if (pressed.indexOf(name) >= 0 || !adminEmail) return;
    MailApp.sendEmail({ to: adminEmail, subject: '【起床未確認】'+name+'さんが未確認です',
      body: ['スタッフ名：'+name,'本日日付：'+today,'期限時刻：'+deadline,'','上記スタッフが起床確認ボタンを押下していません。'].join('\n') });
    const rows2 = wakeSheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < rows2.length; i++) {
      if (rows2[i][0] === today && rows2[i][1] === name) { wakeSheet.getRange(i+1,5).setValue(true); found = true; break; }
    }
    if (!found) wakeSheet.appendRow([today, name, '', deadline, true]);
  });
}
