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
    else if (action === 'resetTriggers') { setupTriggers(); result = { success: true }; }
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
  for (let i = 1; i < rows.length; i++) {
    let v = rows[i][1];
    if (v instanceof Date) {
      v = String(v.getHours()).padStart(2,'0') + ':' + String(v.getMinutes()).padStart(2,'0');
    }
    map[rows[i][0]] = v;
  }
  return map;
}
function todayStr() {
  const now = new Date();
  return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
}
function staffName(row) { return (row[2]&&String(row[2]).trim()) ? String(row[2]).trim() : String(row[1]).trim(); }
function isEnabled(row) {
  const v = row[4];
  if (v === false || v === 'FALSE') return false;
  if (v === null || v === undefined || v === '') return true;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}
// 時刻値（"HH:MM" 文字列 or Date オブジェクト）→ "HH:MM" 文字列に変換
function timeStr(val) {
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2,'0')+':'+String(val.getMinutes()).padStart(2,'0');
  }
  return String(val||'').trim() || '00:00';
}
// 日付値（Date オブジェクト or "YYYY-MM-DD" 文字列）→ "YYYY-MM-DD" 文字列に変換
function dateStr(val) {
  if (val instanceof Date) {
    return val.getFullYear()+'-'+String(val.getMonth()+1).padStart(2,'0')+'-'+String(val.getDate()).padStart(2,'0');
  }
  return String(val||'').trim();
}
function applyTemplate(template, vars) {
  let s = template || '';
  Object.keys(vars).forEach(function(k) { s = s.split('{'+k+'}').join(vars[k]); });
  return s;
}
function sendLineMessageToUser(lineUserId, text, token) {
  if (!lineUserId || !text || !token) return;
  const options = {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Bearer '+token },
    payload: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  Logger.log('LINE push to '+lineUserId+': '+res.getResponseCode()+' '+res.getContentText());
}

// ---- GET ----
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
  const name       = params.name;
  const today      = todayStr();
  const setting    = getSettingMap();
  const deadline   = timeStr(setting['wakeup_deadline'] || '08:00');
  const shiftSheet = getSheet('シフト確定');
  const shiftRows  = shiftSheet.getDataRange().getValues();
  let onShift = false;
  for (let i = 1; i < shiftRows.length; i++) {
    if (dateStr(shiftRows[i][0]) === today && shiftRows[i][1] === name) { onShift = true; break; }
  }
  if (!onShift) return { success: true, data: { onShift: false } };
  const wakeSheet = getSheet('起床確認');
  const wakeRows  = wakeSheet.getDataRange().getValues();
  let pressedAt = null;
  for (let i = 1; i < wakeRows.length; i++) {
    if (dateStr(wakeRows[i][0]) === today && wakeRows[i][1] === name) {
      const dt = new Date(wakeRows[i][2]);
      pressedAt = String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
      break;
    }
  }
  return { success: true, data: { onShift: true, pressedAt: pressedAt, deadline: deadline } };
}

// ---- POST ----
function submitWakeup(params) {
  const name     = params.name;
  const today    = todayStr();
  const setting  = getSettingMap();
  const deadline = timeStr(setting['wakeup_deadline'] || '08:00');
  const sheet    = getSheet('起床確認');
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (dateStr(rows[i][0]) === today && rows[i][1] === name) return { success: true, alreadyPressed: true };
  }
  sheet.appendRow([today, name, new Date(), deadline, false]);
  return { success: true };
}

// ---- 定期実行関数 ----

/**
 * 指定関数のトリガーを翌日の指定時刻に再スケジュールする
 * GAS の atHour() は分を指定できないため、at(date) で正確な時刻を設定する
 */
function rescheduleTrigger(funcName, timeString) {
  // 既存トリガーを削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === funcName) ScriptApp.deleteTrigger(t);
  });
  // 翌日の同時刻を計算
  const parts  = String(timeString).split(':');
  const hour   = parseInt(parts[0], 10);
  const minute = parseInt(parts[1] || '0', 10);
  const next   = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, minute, 0, 0);
  ScriptApp.newTrigger(funcName).timeBased().at(next).create();
  Logger.log(funcName + ' を翌日 ' + hour + ':' + String(minute).padStart(2,'0') + ' に再スケジュール');
}

/**
 * sendWakeupReminder()
 * 当日シフトのスタッフへ個別 LINE でリマインダーを送信し、翌日同時刻に自己再スケジュール
 */
function sendWakeupReminder() {
  const today    = todayStr();
  const setting  = getSettingMap();
  const token    = setting['line_channel_token'] || '';
  const deadline = timeStr(setting['wakeup_deadline']      || '08:00');
  const reminder = timeStr(setting['wakeup_reminder_time'] || '07:00');
  const template = setting['template_wakeup'] || '{name}さん、本日は出勤日です。{deadline}までに起床確認ボタンを押してください。';

  if (!token) {
    Logger.log('line_channel_token 未設定');
  } else {
    const shiftSheet = getSheet('シフト確定');
    const shiftRows  = shiftSheet.getDataRange().getValues();
    const scheduled  = [];
    for (let i = 1; i < shiftRows.length; i++) {
      if (dateStr(shiftRows[i][0]) === today) scheduled.push(shiftRows[i][1]);
    }
    if (!scheduled.length) {
      Logger.log('本日のシフトスタッフなし');
    } else {
      const staffSheet = getSheet('スタッフ一覧');
      const staffRows  = staffSheet.getDataRange().getValues();
      scheduled.forEach(function(name) {
        for (let i = 1; i < staffRows.length; i++) {
          if (staffName(staffRows[i]) === name) {
            const lineUserId = staffRows[i][0];
            if (!lineUserId) { Logger.log(name+': line_user_id 未登録のためスキップ'); return; }
            const msg = applyTemplate(template, { name: name, deadline: deadline });
            sendLineMessageToUser(lineUserId, msg, token);
            return;
          }
        }
        Logger.log(name+': スタッフ一覧に見つからないためスキップ');
      });
    }
  }
  // 翌日の設定時刻に再スケジュール
  rescheduleTrigger('sendWakeupReminder', reminder);
}

/**
 * checkUnconfirmed()
 * 期限までに起床確認されていないスタッフを admin_email へメール通知し、翌日同時刻に自己再スケジュール
 */
function checkUnconfirmed() {
  const today      = todayStr();
  const setting    = getSettingMap();
  const adminEmail = setting['admin_email'] || '';
  const deadline   = timeStr(setting['wakeup_deadline'] || '08:00');
  const template   = setting['template_wakeup_unconfirmed'] || '{name}さんの起床確認ボタンが押されていません';

  if (!adminEmail) {
    Logger.log('admin_email 未設定');
  } else {
    const shiftSheet = getSheet('シフト確定');
    const shiftRows  = shiftSheet.getDataRange().getValues();
    const scheduled  = [];
    for (let i = 1; i < shiftRows.length; i++) { if (dateStr(shiftRows[i][0]) === today) scheduled.push(shiftRows[i][1]); }

    if (scheduled.length > 0) {
      const wakeSheet = getSheet('起床確認');
      const wakeRows  = wakeSheet.getDataRange().getValues();
      const pressed   = [];
      for (let i = 1; i < wakeRows.length; i++) { if (dateStr(wakeRows[i][0]) === today) pressed.push(wakeRows[i][1]); }

      scheduled.forEach(function(name) {
        if (pressed.indexOf(name) >= 0) return;
        const body = applyTemplate(template, { name: name, deadline: deadline });
        MailApp.sendEmail({ to: adminEmail, subject: '【起床未確認】'+name+'さんが未確認です',
          body: body + '\n\n本日日付：' + today + '\n期限時刻：' + deadline });
        const rows2 = wakeSheet.getDataRange().getValues();
        let found = false;
        for (let i = 1; i < rows2.length; i++) {
          if (dateStr(rows2[i][0]) === today && rows2[i][1] === name) { wakeSheet.getRange(i+1,5).setValue(true); found = true; break; }
        }
        if (!found) wakeSheet.appendRow([today, name, '', deadline, true]);
      });
    }
  }
  // 翌日の設定時刻に再スケジュール
  rescheduleTrigger('checkUnconfirmed', deadline);
}

/**
 * setupTriggers()
 * 初回のみ手動実行。設定された正確な時刻（HH:MM）でトリガーを作成する。
 * 以降は sendWakeupReminder / checkUnconfirmed が自己再スケジュールするため不要。
 */
function setupTriggers() {
  const setting         = getSettingMap();
  const reminderTimeStr = timeStr(setting['wakeup_reminder_time'] || '07:00');
  const deadlineTimeStr = timeStr(setting['wakeup_deadline']      || '08:00');

  // 既存トリガーを削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    const fn = t.getHandlerFunction();
    if (fn === 'sendWakeupReminder' || fn === 'checkUnconfirmed') ScriptApp.deleteTrigger(t);
  });

  function makeDate(timeString) {
    const parts  = String(timeString).split(':');
    const hour   = parseInt(parts[0], 10);
    const minute = parseInt(parts[1] || '0', 10);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1); // 過去なら翌日
    return d;
  }

  const reminderDate = makeDate(reminderTimeStr);
  const deadlineDate = makeDate(deadlineTimeStr);

  ScriptApp.newTrigger('sendWakeupReminder').timeBased().at(reminderDate).create();
  ScriptApp.newTrigger('checkUnconfirmed').timeBased().at(deadlineDate).create();

  Logger.log('トリガー設定完了：sendWakeupReminder=' + reminderDate.toLocaleString('ja-JP') +
             ', checkUnconfirmed=' + deadlineDate.toLocaleString('ja-JP'));
}
