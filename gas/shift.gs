// デプロイ前にスプレッドシートIDを設定すること
const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';

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
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
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
    else if (action === 'sendLineMessage') result = sendLineMessageAction(e.parameter);
    else result = { success: false, error: 'unknown action' };
  } catch(err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- ヘルパー ----

function openSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const s = openSS().getSheetByName(name);
  if (!s) throw new Error('シートが見つかりません: ' + name);
  return s;
}

function getSettingMap() {
  const sheet = getSheet('管理者設定');
  const rows = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    map[rows[i][0]] = rows[i][1];
  }
  return map;
}

function todayStr() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

// ---- GET アクション ----

function getStaff() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const names = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === true || rows[i][3] === 'TRUE') {
      names.push(rows[i][1]);
    }
  }
  return { success: true, data: names };
}

// LINE IDでスタッフを照合
function getStaffByLineId(params) {
  const lineUserId = params.lineUserId;
  if (!lineUserId) return { success: false, error: 'lineUserId required' };

  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === lineUserId) {
      const enabled = rows[i][3] === true || rows[i][3] === 'TRUE';
      return {
        success: true,
        data: { found: true, name: rows[i][1], enabled: enabled, row: i + 1 }
      };
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
    const date  = rows[i][2];
    const parts = date.split('-');
    if (parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month) {
      result[date] = rows[i][3];
    }
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
    const date  = rows[i][2];
    const parts = date.split('-');
    if (parseInt(parts[0], 10) !== year || parseInt(parts[1], 10) !== month) continue;
    if (!byDate[date]) byDate[date] = { ok: [], maybe: [], ng: [] };
    const type = rows[i][3];
    if (byDate[date][type]) byDate[date][type].push(rows[i][1]);
  }
  return { success: true, data: byDate };
}

function getConfirmedShift(params) {
  const year  = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const sheet = getSheet('確定シフト');
  const rows  = sheet.getDataRange().getValues();
  const byDate = {};
  for (let i = 1; i < rows.length; i++) {
    const date  = rows[i][0];
    const parts = date.split('-');
    if (parseInt(parts[0], 10) !== year || parseInt(parts[1], 10) !== month) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ name: rows[i][1], type: rows[i][2], confirmed: rows[i][3] });
  }
  return { success: true, data: byDate };
}

function getSettings() {
  const map = getSettingMap();
  return { success: true, data: map };
}

function getStaffList() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const list  = [];
  for (let i = 1; i < rows.length; i++) {
    list.push({
      line_user_id: rows[i][0],
      name:         rows[i][1],
      email:        rows[i][2],
      enabled:      rows[i][3] === true || rows[i][3] === 'TRUE',
      row:          i + 1,
    });
  }
  return { success: true, data: list };
}

function checkPassword(params) {
  const map = getSettingMap();
  const ok  = params.password === map['admin_password'];
  return { success: true, data: { ok: ok } };
}

// ---- POST アクション ----

function submitShift(params) {
  const name  = params.name;
  const sheet = getSheet('シフト希望');
  let entries = [];
  try { entries = JSON.parse(params.entries); } catch(e) {}

  const rows = sheet.getDataRange().getValues();
  entries.forEach(function(entry) {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === name && rows[i][2] === entry.date) {
        sheet.getRange(i + 1, 4).setValue(entry.type);
        rows[i][3] = entry.type;
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([new Date(), name, entry.date, entry.type]);
    }
  });
  return { success: true };
}

function confirmShift(params) {
  const sheet = getSheet('確定シフト');
  let entries = [];
  try { entries = JSON.parse(params.entries); } catch(e) {}

  entries.forEach(function(entry) {
    const rows = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === entry.date && rows[i][1] === entry.name) {
        sheet.getRange(i + 1, 3).setValue(entry.type);
        sheet.getRange(i + 1, 4).setValue(true);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([entry.date, entry.name, entry.type, true]);
    }
  });
  return { success: true };
}

function updateSettings(params) {
  const sheet = getSheet('管理者設定');
  const rows  = sheet.getDataRange().getValues();
  const keys  = Object.keys(params).filter(function(k) { return k !== 'action'; });

  keys.forEach(function(key) {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(params[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, params[key]]);
    }
  });
  return { success: true };
}

function updateStaff(params) {
  const sheet  = getSheet('スタッフ一覧');
  const rowNum = parseInt(params.row, 10);
  if (params.name         !== undefined) sheet.getRange(rowNum, 2).setValue(params.name);
  if (params.email        !== undefined) sheet.getRange(rowNum, 3).setValue(params.email);
  if (params.enabled      !== undefined) sheet.getRange(rowNum, 4).setValue(params.enabled === 'true');
  if (params.line_user_id !== undefined) sheet.getRange(rowNum, 1).setValue(params.line_user_id);
  return { success: true };
}

function addStaff(params) {
  const sheet = getSheet('スタッフ一覧');
  sheet.appendRow([params.line_user_id || '', params.name || '', params.email || '', true]);
  return { success: true };
}

function deleteStaff(params) {
  const sheet  = getSheet('スタッフ一覧');
  const rowNum = parseInt(params.row, 10);
  sheet.deleteRow(rowNum);
  return { success: true };
}

// LINE IDをスタッフに登録（初回LINEログイン時）
function registerLineId(params) {
  const lineUserId    = params.lineUserId;
  const lineUserName  = params.lineUserName || '';
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();

  // 既に登録済みか確認
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === lineUserId) {
      return { success: true, data: { registered: true, name: rows[i][1] } };
    }
  }

  // 名前一致でリンク
  if (params.name) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === params.name && !rows[i][0]) {
        sheet.getRange(i + 1, 1).setValue(lineUserId);
        return { success: true, data: { registered: true, name: rows[i][1] } };
      }
    }
  }

  // 新規追加（管理者が後で名前を設定）
  sheet.appendRow([lineUserId, lineUserName, '', true]);
  return { success: true, data: { registered: false, lineUserName: lineUserName } };
}

// LINE グループへメッセージ送信（管理者から手動実行用）
function sendLineMessageAction(params) {
  const text = params.text;
  if (!text) return { success: false, error: 'text required' };
  const settings = getSettingMap();
  sendLineMessage(settings['line_group_id'], text, settings['line_channel_token']);
  return { success: true };
}

// ---- LINE Messaging API ----

/**
 * sendDailyMessage()
 * !! この関数はGASエディタで time-based trigger を手動設定する必要があります !!
 * 設定方法: GASエディタ > トリガー > 「トリガーを追加」
 *   関数: sendDailyMessage / イベント: 時間主導型 / 時刻: 毎日 管理者設定の line_notify_time 前後
 * 処理内容: 本日シフトに入っているスタッフ名をLINEグループに送信
 */
function sendDailyMessage() {
  const settings = getSettingMap();
  const token   = settings['line_channel_token'];
  const groupId = settings['line_group_id'];

  if (!token || !groupId) {
    Logger.log('LINE設定（Channel Access Token / Group ID）が未設定のためスキップ');
    return;
  }

  const today = todayStr();
  const sheet = getSheet('確定シフト');
  const rows  = sheet.getDataRange().getValues();

  const staffToday = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === today && (rows[i][3] === true || rows[i][3] === 'TRUE')) {
      staffToday.push({ name: rows[i][1], type: rows[i][2] });
    }
  }

  if (staffToday.length === 0) {
    Logger.log('本日シフトのスタッフなし');
    return;
  }

  const lines = staffToday.map(function(s) {
    return s.name + 'さん（' + (s.type || '業務') + '）';
  });

  const message =
    '【本日のシフト】\n' +
    '本日の担当は\n' +
    lines.join('\n') + '\nです。\nよろしくお願いします。';

  sendLineMessage(groupId, message, token);
  Logger.log('LINE送信完了: ' + message);
}

/**
 * LINEグループへテキストメッセージをプッシュ送信
 * @param {string} to      送信先ID（グループIDまたはユーザーID）
 * @param {string} text    送信テキスト
 * @param {string} token   Channel Access Token
 */
function sendLineMessage(to, text, token) {
  if (!to || !text || !token) return;
  const url = 'https://api.line.me/v2/bot/message/push';
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({
      to: to,
      messages: [{ type: 'text', text: text }]
    }),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch(url, options);
  Logger.log('LINE API: ' + res.getResponseCode() + ' ' + res.getContentText());
}
