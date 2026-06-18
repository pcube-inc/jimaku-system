const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';
// A(0):line_user_id / B(1):LINE表示名 / C(2):登録名 / D(3):メール / E(4):有効フラグ

function doGet(e) {
  const callback = e.parameter.callback;
  const action   = e.parameter.action || '';
  let result = {};
  try {
    if      (action === 'getPosts')         result = getPosts(e.parameter);
    else if (action === 'getStaff')         result = getStaff();
    else if (action === 'getStaffByLineId') result = getStaffByLineId(e.parameter);
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
    if      (action === 'submitPost') result = submitPost(e.parameter);
    else if (action === 'reactPost')  result = reactPost(e.parameter);
    else if (action === 'deletePost') result = deletePost(e.parameter);
    else if (action === 'updatePost') result = updatePost(e.parameter);
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
  const rows = sheet.getDataRange().getValues();
  const map  = {};
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
function staffName(row) { return (row[2]&&String(row[2]).trim()) ? String(row[2]).trim() : String(row[1]).trim(); }
function isEnabled(row) {
  const v = row[4];
  if (v === false || v === 'FALSE') return false;
  if (v === null || v === undefined || v === '') return true;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
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

// 掲示板シート列: A:投稿ID / B:スタッフ名 / C:種別 / D:投稿日時 / E:内容 / F:サブ内容 / G:確認者リスト
function getPosts(params) {
  const sheet = getSheet('掲示板');
  const rows  = sheet.getDataRange().getValues();
  const typeFilter = params.type || '';
  const posts = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (!rows[i][0]) continue;
    if (typeFilter && rows[i][2] !== typeFilter) continue;
    posts.push({
      id:        rows[i][0],
      name:      rows[i][1],
      type:      rows[i][2],
      datetime:  rows[i][3] instanceof Date ? Utilities.formatDate(rows[i][3], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : String(rows[i][3]),
      content:   rows[i][4],
      sub:       rows[i][5],
      reactions: rows[i][6] ? String(rows[i][6]).split(',').filter(Boolean) : [],
    });
    if (posts.length >= 50) break;
  }
  return { success: true, data: posts };
}

function submitPost(params) {
  const name    = params.name    || '';
  const type    = params.type    || 'notice';
  const content = params.content || '';
  const sub     = params.sub     || '';
  const now     = new Date();
  const id      = String(now.getTime());
  getSheet('掲示板').appendRow([id, name, type, now, content, sub, '']);

  // 全投稿種別でLINE通知
  sendLineNotification(name, type, content);
  return { success: true, id: id };
}

function reactPost(params) {
  const postId   = params.postId || '';
  const reactor  = params.reactor || '';
  if (!postId || !reactor) return { success: false, error: 'postId and reactor required' };
  const sheet = getSheet('掲示板');
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === postId) {
      const current = rows[i][6] ? String(rows[i][6]).split(',').filter(Boolean) : [];
      if (current.indexOf(reactor) >= 0) return { success: true, alreadyReacted: true };
      current.push(reactor);
      sheet.getRange(i+1, 7).setValue(current.join(','));
      return { success: true, reactions: current };
    }
  }
  return { success: false, error: 'post not found' };
}

function deletePost(params) {
  const postId = params.postId || '';
  if (!postId) return { success: false, error: 'postId required' };
  const sheet = getSheet('掲示板');
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === postId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'post not found' };
}

function updatePost(params) {
  const postId  = params.postId  || '';
  const content = params.content || '';
  const sub     = params.sub     || '';
  if (!postId) return { success: false, error: 'postId required' };
  const sheet = getSheet('掲示板');
  const rows  = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === postId) {
      sheet.getRange(i + 1, 5).setValue(content);
      sheet.getRange(i + 1, 6).setValue(sub);
      return { success: true };
    }
  }
  return { success: false, error: 'post not found' };
}

function sendLineNotification(name, type, content) {
  const setting = getSettingMap();
  const token   = setting['line_channel_token'] || '';
  if (!token) return;
  const typeLabels = { notice: '📢 お知らせ', handover: '🔄 申し送り', trouble: '⚠️ トラブル報告', training: '📚 研修報告' };
  const label   = typeLabels[type] || type;
  const message = label+'\nスタッフ：'+name+'\n\n'+content;
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+token },
      payload: JSON.stringify({ messages: [{ type:'text', text: message }] }),
      muteHttpExceptions: true,
    });
  } catch(e) { Logger.log('LINE通知エラー: '+e.message); }
}

// 掲示板シートの初期作成（jimaku-board GASエディタから手動実行）
function setupBoardSheet() {
  const ss    = openSS();
  let sheet   = ss.getSheetByName('掲示板');
  if (!sheet) sheet = ss.insertSheet('掲示板');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['投稿ID', 'スタッフ名', '種別', '投稿日時', '内容', 'サブ内容', '確認者リスト']);
  }
  Logger.log('掲示板シートセットアップ完了');
}
