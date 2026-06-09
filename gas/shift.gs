// デプロイ前にスプレッドシートIDを設定すること
const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';

// スタッフ一覧列（v2）
// A(0):line_user_id / B(1):LINE表示名 / C(2):登録名 / D(3):メール / E(4):有効フラグ

function doGet(e) {
  const callback = e.parameter.callback;
  const action   = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'getStaff')           result = getStaff();
    else if (action === 'getStaffByLineId')   result = getStaffByLineId(e.parameter);
    else if (action === 'getMyShift')         result = getMyShift(e.parameter);
    else if (action === 'getShiftRequests')   result = getShiftRequests(e.parameter);
    else if (action === 'getConfirmedShift')  result = getConfirmedShift(e.parameter);
    else if (action === 'getSettings')        result = getSettings();
    else if (action === 'getStaffList')       result = getStaffList();
    else if (action === 'checkPassword')      result = checkPassword(e.parameter);
    else result = { success: false, error: 'unknown action' };
  } catch(err) {
    result = { success: false, error: err.message };
  }
  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback+'('+json+')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'submitShift')     result = submitShift(e.parameter);
    else if (action === 'confirmShift')    result = confirmShift(e.parameter);
    else if (action === 'updateSettings')  result = updateSettings(e.parameter);
    else if (action === 'updateStaff')     result = updateStaff(e.parameter);
    else if (action === 'addStaff')        result = addStaff(e.parameter);
    else if (action === 'deleteStaff')     result = deleteStaff(e.parameter);
    else if (action === 'registerLineId')  result = registerLineId(e.parameter);
    else if (action === 'sendLineMessage')    result = sendLineMessageAction(e.parameter);
    else if (action === 'createCalendarSheet') result = createCalendarSheet(e.parameter);
    else result = { success: false, error: 'unknown action' };
  } catch(err) {
    result = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ---- ヘルパー ----
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
// 登録名(C)優先、なければLINE表示名(B)
function staffName(row) {
  return (row[2] && String(row[2]).trim()) ? String(row[2]).trim() : String(row[1]).trim();
}
// 有効フラグ（E列=index4）。空/未設定の旧スタッフは有効とみなす（後方互換）
function isEnabled(row) {
  const v = row[4];
  if (v === false || v === 'FALSE') return false;
  if (v === null || v === undefined || v === '') return true;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}
// 日付値を "YYYY-MM-DD" 文字列に変換（Date オブジェクト・文字列両対応）
function dateStr(val) {
  if (val instanceof Date) {
    return val.getFullYear() + '-' +
           String(val.getMonth() + 1).padStart(2, '0') + '-' +
           String(val.getDate()).padStart(2, '0');
  }
  return String(val).trim();
}

// ---- GET ----
function getStaff() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const names = [];
  for (let i = 1; i < rows.length; i++) {
    if (isEnabled(rows[i])) names.push(staffName(rows[i]));
  }
  return { success: true, data: names };
}

function getStaffByLineId(params) {
  const lineUserId = params.lineUserId;
  if (!lineUserId) return { success: false, error: 'lineUserId required' };
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === lineUserId) {
      return { success: true, data: { found: true, name: staffName(rows[i]), enabled: isEnabled(rows[i]), row: i+1 } };
    }
  }
  return { success: true, data: { found: false } };
}

function getMyShift(params) {
  const name  = params.name;
  const year  = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const sheet = getSheet('シフト希望');
  const rows  = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] !== name) continue;
    const date  = dateStr(rows[i][2]);
    const parts = date.split('-');
    if (parseInt(parts[0],10) === year && parseInt(parts[1],10) === month) result[date] = rows[i][3];
  }
  return { success: true, data: result };
}

function getShiftRequests(params) {
  const year  = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const sheet = getSheet('シフト希望');
  const rows  = sheet.getDataRange().getValues();
  const byDate = {};
  for (let i = 1; i < rows.length; i++) {
    const date  = dateStr(rows[i][2]);
    const parts = date.split('-');
    if (parseInt(parts[0],10) !== year || parseInt(parts[1],10) !== month) continue;
    if (!byDate[date]) byDate[date] = { ok:[], maybe:[], ng:[] };
    const type = rows[i][3];
    if (byDate[date][type]) byDate[date][type].push(rows[i][1]);
  }
  return { success: true, data: byDate };
}

function getConfirmedShift(params) {
  const year  = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const sheet = getSheet('シフト確定');
  const rows  = sheet.getDataRange().getValues();
  const byDate = {};
  for (let i = 1; i < rows.length; i++) {
    const date  = dateStr(rows[i][0]);
    const parts = date.split('-');
    if (parseInt(parts[0],10) !== year || parseInt(parts[1],10) !== month) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ name: rows[i][1], type: rows[i][2], confirmed: rows[i][3] });
  }
  return { success: true, data: byDate };
}

function getSettings() { return { success: true, data: getSettingMap() }; }

function getStaffList() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const list  = [];
  for (let i = 1; i < rows.length; i++) {
    list.push({
      line_user_id: rows[i][0],
      line_name:    rows[i][1],
      reg_name:     rows[i][2],
      email:        rows[i][3],
      enabled:      isEnabled(rows[i]),
      row:          i + 1,
    });
  }
  return { success: true, data: list };
}

function checkPassword(params) {
  return { success: true, data: { ok: params.password === getSettingMap()['admin_password'] } };
}

// ---- POST ----
function submitShift(params) {
  const name  = params.name;
  const sheet = getSheet('シフト希望');
  let entries = [];
  try { entries = JSON.parse(params.entries); } catch(e) {}

  // year/month が渡された場合はその人・その月の既存行を全削除してから再挿入
  // → 再送信しても重複・古いデータが残留しない
  const year  = params.year  ? parseInt(params.year,  10) : 0;
  const month = params.month ? parseInt(params.month, 10) : 0;
  if (year && month && name) {
    const prefix = year + '-' + String(month).padStart(2, '0');
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][1] === name && String(dateStr(rows[i][2])).indexOf(prefix) === 0) {
        sheet.deleteRow(i + 1);
      }
    }
  }

  // 新しいエントリを追記
  entries.forEach(function(entry) {
    sheet.appendRow([new Date(), name, entry.date, entry.type]);
  });

  return { success: true };
}

function confirmShift(params) {
  const sheet = getSheet('シフト確定');
  let entries = [];
  try { entries = JSON.parse(params.entries); } catch(e) {}
  // 名前が空のエントリは書き込まない
  entries = entries.filter(function(e){ return e.name && String(e.name).trim(); });

  // year/month が渡された場合はその月の既存行を全削除してから再挿入
  // → シフト確定ボタンを押すたびに最新データで上書き（重複・残留を防ぐ）
  const year  = params.year  ? parseInt(params.year,  10) : 0;
  const month = params.month ? parseInt(params.month, 10) : 0;
  if (year && month) {
    const prefix = year + '-' + String(month).padStart(2, '0');
    const rows = sheet.getDataRange().getValues();
    // 後ろから削除（行番号ずれ防止）
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(dateStr(rows[i][0])).indexOf(prefix) === 0) {
        sheet.deleteRow(i + 1);
      }
    }
  }

  // 新しいエントリを追記
  entries.forEach(function(entry) {
    sheet.appendRow([entry.date, entry.name, entry.type, true]);
  });

  return { success: true };
}

function updateSettings(params) {
  const sheet = getSheet('管理者設定');
  const rows  = sheet.getDataRange().getValues();
  Object.keys(params).filter(function(k){ return k !== 'action'; }).forEach(function(key) {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) { sheet.getRange(i+1,2).setValue(params[key]); found = true; break; }
    }
    if (!found) sheet.appendRow([key, params[key]]);
  });
  return { success: true };
}

function updateStaff(params) {
  const sheet  = getSheet('スタッフ一覧');
  const rowNum = parseInt(params.row, 10);
  if (params.line_user_id !== undefined) sheet.getRange(rowNum,1).setValue(params.line_user_id);
  if (params.line_name    !== undefined) sheet.getRange(rowNum,2).setValue(params.line_name);
  if (params.reg_name     !== undefined) sheet.getRange(rowNum,3).setValue(params.reg_name);
  if (params.email        !== undefined) sheet.getRange(rowNum,4).setValue(params.email);
  if (params.enabled      !== undefined) sheet.getRange(rowNum,5).setValue(params.enabled === 'true');
  return { success: true };
}

function addStaff(params) {
  getSheet('スタッフ一覧').appendRow([
    params.line_user_id || '',
    params.line_name    || '',
    params.name         || '',   // 登録名
    params.email        || '',
    true,
  ]);
  return { success: true };
}

function deleteStaff(params) {
  getSheet('スタッフ一覧').deleteRow(parseInt(params.row,10));
  return { success: true };
}

// LINE IDを照合・登録
function registerLineId(params) {
  const lineUserId   = params.lineUserId;
  const lineUserName = params.lineUserName || '';
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();

  // 既に登録済みか確認
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === lineUserId) {
      return { success: true, data: { registered: true, name: staffName(rows[i]) } };
    }
  }

  // 登録名で一致するスタッフを探す
  for (let i = 1; i < rows.length; i++) {
    const rn = String(rows[i][2]).trim();
    const ln = String(rows[i][1]).trim();
    if ((rn && (rn === lineUserName || rn === params.name)) ||
        (ln && (ln === lineUserName || ln === params.name))) {
      if (!rows[i][0]) {
        sheet.getRange(i+1,1).setValue(lineUserId);
        if (!rows[i][1]) sheet.getRange(i+1,2).setValue(lineUserName);
        return { success: true, data: { registered: true, name: staffName(rows[i]) } };
      }
    }
  }

  // 新規登録（管理者が後で登録名を設定）
  sheet.appendRow([lineUserId, lineUserName, '', '', true]);
  return { success: true, data: { registered: false, lineUserName: lineUserName } };
}

function sendLineMessageAction(params) {
  const text = params.text;
  if (!text) return { success: false, error: 'text required' };
  const settings = getSettingMap();
  sendLineMessage(settings['line_group_id'], text, settings['line_channel_token']);
  return { success: true };
}

/**
 * sendDailyMessage()
 * !! GASエディタでtime-based triggerを手動設定すること !!
 * MailApp.sendEmail() の送信上限は無料Gmailで1日100通
 */
function sendDailyMessage() {
  const settings = getSettingMap();
  const token   = settings['line_channel_token'];
  const groupId = settings['line_group_id'];
  if (!token || !groupId) { Logger.log('LINE設定未設定'); return; }
  const today = todayStr();
  const sheet = getSheet('シフト確定');
  const rows  = sheet.getDataRange().getValues();
  const staffToday = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === today && (rows[i][3] === true || rows[i][3] === 'TRUE')) {
      staffToday.push({ name: rows[i][1], type: rows[i][2] });
    }
  }
  if (!staffToday.length) return;
  const lines = staffToday.map(function(s){ return s.name+'さん（'+(s.type||'業務')+'）'; });
  sendLineMessage(groupId, '【本日のシフト】\n本日の担当は\n'+lines.join('\n')+'\nです。\nよろしくお願いします。', token);
}

function sendLineMessage(to, text, token) {
  if (!to || !text || !token) return;
  const options = {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer '+token },
    payload: JSON.stringify({ to: to, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  Logger.log('LINE API: '+res.getResponseCode()+' '+res.getContentText());
}

/**
 * createCalendarSheet()
 * 「Shift」テンプレートをコピーし、シフト確定データをカレンダー形式で書き込む
 *
 * Shiftシートレイアウト:
 *   T1   : 対象月の初日（例: 2026/06/01）
 *   行3  : 日付 1〜15（D〜R列）
 *   行4  : 曜日
 *   行6〜: スタッフ名（A列）、業務種別（D〜R列）← 第1セクション（1〜15日）
 *   行18 : 日付 16〜末日（D〜S列）
 *   行19 : 曜日
 *   行21〜: スタッフ名（A列）、業務種別（D〜S列）← 第2セクション（16〜末日）
 *
 * 列マッピング:
 *   第1セクション: 列番号 = 日数 + 3  (day1 → D=4, day15 → R=18)
 *   第2セクション: 列番号 = 日数 - 12 (day16 → D=4, day31 → S=19)
 */
function createCalendarSheet(params) {
  const year  = parseInt(params.year,  10);
  const month = parseInt(params.month, 10);
  const ss = openSS();

  // シフト確定から対象月のデータを収集
  // byDate: { 'YYYY-MM-DD': { staffName: businessType } }
  const confSheet = getSheet('シフト確定');
  const confRows  = confSheet.getDataRange().getValues();
  const prefix    = year + '-' + String(month).padStart(2, '0');
  const byDate    = {};
  const staffList = [];

  for (let i = 1; i < confRows.length; i++) {
    const d    = dateStr(confRows[i][0]);
    if (d.indexOf(prefix) !== 0) continue;
    const name = String(confRows[i][1] || '').trim();
    const type = String(confRows[i][2] || '').trim();
    if (!name) continue;
    if (!byDate[d]) byDate[d] = {};
    byDate[d][name] = type;
    if (staffList.indexOf(name) < 0) staffList.push(name);
  }

  if (!staffList.length) return { success: false, error: 'シフト確定に対象月のデータがありません' };

  // シート名：YYYY.MM（既存があれば削除して再作成）
  const sheetName = year + '.' + String(month).padStart(2, '0');
  const existing  = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  // 「Shift」テンプレートをコピー（書式・数式を保持）
  const template = ss.getSheetByName('Shift');
  let calSheet;
  if (template) {
    calSheet = template.copyTo(ss);
    calSheet.setName(sheetName);
  } else {
    calSheet = ss.insertSheet(sheetName);
  }

  // T1に対象月の初日をセット（テンプレートの数式が自動的に月名・曜日を表示）
  calSheet.getRange('T1').setValue(new Date(year, month - 1, 1));

  // スタッフ行のコンテンツをクリア（書式は保持）
  // 第1セクション: 行6〜17、A〜S列（列1〜19）
  // 第2セクション: 行21〜32、A〜S列（列1〜19）
  calSheet.getRange(6,  1, 12, 19).clearContent();
  calSheet.getRange(21, 1, 12, 19).clearContent();

  // 月の日数
  const daysInMonth = new Date(year, month, 0).getDate();

  // スタッフごとに書き込み
  for (let s = 0; s < staffList.length && s < 12; s++) {
    const name = staffList[s];
    const row1 = 6  + s;  // 第1セクション行（1〜15日）
    const row2 = 21 + s;  // 第2セクション行（16〜末日）

    // スタッフ名をA列に記入
    calSheet.getRange(row1, 1).setValue(name);
    calSheet.getRange(row2, 1).setValue(name);

    // 第1セクション：1〜15日 → 列 = day + 3（D=4〜R=18）
    for (let day = 1; day <= Math.min(15, daysInMonth); day++) {
      const dateKey = prefix + '-' + String(day).padStart(2, '0');
      const type    = (byDate[dateKey] && byDate[dateKey][name]) || '';
      calSheet.getRange(row1, day + 3).setValue(type);
    }

    // 第2セクション：16〜末日 → 列 = day - 12（D=4〜S=19）
    for (let day = 16; day <= daysInMonth; day++) {
      const dateKey = prefix + '-' + String(day).padStart(2, '0');
      const type    = (byDate[dateKey] && byDate[dateKey][name]) || '';
      calSheet.getRange(row2, day - 12).setValue(type);
    }
  }

  Logger.log('カレンダーシート作成完了: ' + sheetName);
  return { success: true, sheetName: sheetName };
}
