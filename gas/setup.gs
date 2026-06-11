// デプロイ前にスプレッドシートIDを設定すること
const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';

// =========================================================
// スタッフ一覧シートの列構成（v2）
//   A(0): line_user_id   … LINEログイン時に自動セット
//   B(1): LINE表示名      … LINEプロフィールから自動取得
//   C(2): 登録名          … 管理者が設定・アプリ内で表示する名前
//   D(3): メールアドレス  … 管理者が登録
//   E(4): 有効フラグ      … TRUE/FALSE
// =========================================================

function doGet(e) {
  const callback = e.parameter.callback;
  const action   = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'checkPassword') result = checkPassword(e.parameter);
    else if (action === 'getSettings')   result = getSettings();
    else if (action === 'getStaffList')  result = getStaffList();
    else if (action === 'getStaff')      result = getStaff();
    else result = { success: false, error: 'unknown action: ' + action };
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
    if      (action === 'updateSettings') result = updateSettings(e.parameter);
    else if (action === 'updateStaff')    result = updateStaff(e.parameter);
    else if (action === 'addStaff')       result = addStaff(e.parameter);
    else if (action === 'deleteStaff')    result = deleteStaff(e.parameter);
    else result = { success: false, error: 'unknown action: ' + action };
  } catch(err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
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
  for (let i = 1; i < rows.length; i++) {
    let v = rows[i][1];
    // Google Sheetsが時刻文字列をDateに変換する問題を修正
    if (v instanceof Date) {
      v = String(v.getHours()).padStart(2,'0') + ':' + String(v.getMinutes()).padStart(2,'0');
    }
    map[rows[i][0]] = v;
  }
  return map;
}

// スタッフの「登録名」を返す（なければLINE表示名）
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

// ---- GET アクション ----
function checkPassword(params) {
  const map = getSettingMap();
  return { success: true, data: { ok: (params.password === map['admin_password']) } };
}
function getSettings() { return { success: true, data: getSettingMap() }; }

function getStaffList() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const list  = [];
  for (let i = 1; i < rows.length; i++) {
    list.push({
      line_user_id: rows[i][0],
      line_name:    rows[i][1],  // LINE表示名（B列）
      reg_name:     rows[i][2],  // 登録名（C列）
      email:        rows[i][3],  // メールアドレス（D列）
      enabled:      isEnabled(rows[i]),
      row:          i + 1,
    });
  }
  return { success: true, data: list };
}

// アプリで使う名前のリスト（登録名優先）
function getStaff() {
  const sheet = getSheet('スタッフ一覧');
  const rows  = sheet.getDataRange().getValues();
  const names = [];
  for (let i = 1; i < rows.length; i++) {
    if (isEnabled(rows[i])) names.push(staffName(rows[i]));
  }
  return { success: true, data: names };
}

// ---- POST アクション ----
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
  const sheet = getSheet('スタッフ一覧');
  sheet.appendRow([
    params.line_user_id || '',
    params.line_name    || '',   // LINE表示名
    params.name         || '',   // 登録名
    params.email        || '',   // メールアドレス
    true,                        // 有効フラグ
  ]);
  return { success: true };
}

function deleteStaff(params) {
  getSheet('スタッフ一覧').deleteRow(parseInt(params.row, 10));
  return { success: true };
}

// ---- シート初期化 ----
function setupSheets() {
  const ss = openSS();
  const sheets = [
    { name: 'スタッフ一覧',  headers: ['line_user_id', 'LINE表示名', '登録名', 'メールアドレス', '有効フラグ'] },
    { name: 'シフト希望',    headers: ['送信日時', 'スタッフ名', '日付', '希望区分'] },
    { name: 'シフト確定',    headers: ['日付', 'スタッフ名', '業務種別', '確定フラグ'] },
    { name: '起床確認',      headers: ['日付', 'スタッフ名', '押下日時', '期限時刻', '通知済フラグ'] },
    { name: '出退勤記録',    headers: ['スタッフ名', '出勤日時', '退勤日時'] },
    { name: 'トラブル記録',  headers: ['スタッフ名', '第一報日時', '第二報日時', '詳細内容'] },
    { name: '管理者設定',    headers: ['設定キー', '設定値'] },
  ];
  sheets.forEach(function(def) {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) sheet = ss.insertSheet(def.name);
    // ヘッダー行が古い場合は更新
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(def.headers);
    } else if (def.name === 'スタッフ一覧') {
      // スタッフ一覧のヘッダーを最新化
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    }
  });
  const settingSheet = ss.getSheetByName('管理者設定');
  if (settingSheet && settingSheet.getLastRow() <= 1) {
    [['admin_email','admin@gmail.com'],['cc_emails',''],['wakeup_reminder_time','07:00'],
     ['wakeup_deadline','08:00'],['shift_days','1,2,4,5'],['line_channel_token',''],
     ['admin_password','admin1234']
    ].forEach(function(row){ settingSheet.appendRow(row); });
  }
  Logger.log('セットアップ完了（v2スキーマ）');
}
