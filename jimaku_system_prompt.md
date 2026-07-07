# 業務管理WEBアプリ「字幕システム」構築

## このプロンプトの使い方
以下の仕様に従い、全ファイルを新規作成してください。
作成完了後、各ファイルのパスと、セットアップ手順を出力してください。

---

## プロジェクト概要
- シフト制アルバイト9名を管理する業務管理WEBアプリ（4種類）
- スマートフォン（幅375px基準）での使用を前提としたモバイルファーストUI
- 後でLINE LIFFと連携する前提で設計するが、今回はLIFF実装は行わない

---

## 技術スタック（厳守・追加禁止）

| 役割 | 使用技術 |
|------|----------|
| フロントエンド | HTML / CSS / Vanilla JavaScript のみ |
| ホスティング | GitHub Pages（1リポジトリ・静的ファイルのみ） |
| バックエンド | Google Apps Script（GAS）Web App |
| データ保存 | Googleスプレッドシート（GASから操作） |
| メール送信 | GAS の MailApp.sendEmail()（無料Gmailから送信） |

### 使用禁止サービス・ライブラリ
Firebase・Supabase・Vercel・Netlify・Resend・Auth0・Node.js・npm
CDN経由の外部ライブラリも含め、上記スタック以外は一切使用しない。
Pure HTML / CSS / Vanilla JS のみ。

---

## GASのCORS問題への対処（重要・厳守）

GASのWeb AppはCORSヘッダーを自由に設定できない。
GitHub Pages（異なるオリジン）からの fetch() はレスポンスが読み取れない（opaque）。

### 採用する方法
- **データ送信（POST相当）**：`<form>` の hidden fieldを使い、
  `fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: new FormData(form) })` で送信。
  レスポンスは読み取れないため、送信後3秒待機してから「送信しました」を表示。
- **データ取得（GET）**：`<script>` タグを動的生成するJSONP方式を使用。
  GASの `doGet(e)` はクエリパラメータに `callback` がある場合、
  `callback({ ... })` 形式のJavaScriptを返す。

この2方式を全ファイルに一貫して適用すること。
fetch() でレスポンスを読み取ろうとするコードは書かないこと。

---

## ディレクトリ構成

```
/（リポジトリルート）
├── index.html
├── shift/
│   └── index.html
├── wakeup/
│   └── index.html
├── attendance/
│   └── index.html
├── trouble/
│   └── index.html
├── admin/
│   └── index.html
├── css/
│   └── common.css
├── js/
│   └── config.js
└── gas/
    ├── setup.gs
    ├── shift.gs
    ├── wakeup.gs
    ├── attendance.gs
    └── trouble.gs
```

### js/config.js の内容
```javascript
// GASデプロイ後にURLを書き換えること
const GAS_URL = {
  shift:      'https://script.google.com/macros/s/【shift用デプロイID】/exec',
  wakeup:     'https://script.google.com/macros/s/【wakeup用デプロイID】/exec',
  attendance: 'https://script.google.com/macros/s/【attendance用デプロイID】/exec',
  trouble:    'https://script.google.com/macros/s/【trouble用デプロイID】/exec',
  admin:      'https://script.google.com/macros/s/【admin用デプロイID】/exec',
};
// スプレッドシートのURLの /d/ と /edit の間の文字列がID
const SPREADSHEET_ID = '【スプレッドシートID】';
```

---

## デザインシステム（css/common.css）

以下のCSS変数を定義し、全ページで共通使用すること：

```css
:root {
  --green-50: #E1F5EE;
  --green-100: #9FE1CB;
  --green-400: #1D9E75;
  --green-600: #0F6E56;
  --green-800: #085041;
  --red-50: #FCEBEB;
  --red-400: #E24B4A;
  --red-600: #A32D2D;
  --amber-50: #FAEEDA;
  --amber-400: #EF9F27;
  --amber-600: #854F0B;
  --gray-100: #f5f5f3;
  --gray-200: #e8e8e4;
  --gray-400: #888780;
  --gray-600: #5f5e5a;
  --text: #1a1a18;
  --text-sub: #5f5e5a;
  --text-hint: #888780;
  --bg: #ffffff;
  --bg-sub: #f7f7f5;
  --border: rgba(0,0,0,0.1);
  --border-md: rgba(0,0,0,0.18);
  --radius: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  --font: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow: 0 4px 12px rgba(0,0,0,0.08);
}
```

共通レイアウト：
- `.shell`：max-width 430px・中央寄せ・min-height 100vh
- `.header`：sticky top:0・ロゴ（緑角丸）＋タイトル＋サブテキスト
- `.tab-bar`：sticky・アクティブタブは --green-400 のボーダーライン
- ボタン最小タップ領域：44×44px
- フォントサイズ最小：14px
- エラー表示：`<div class="error-msg">` に表示（alert()禁止）
- ローディング中：ボタンをdisabledにして「送信中…」表示

---

## Googleスプレッドシート構成

### setup.gs に setupSheets() 関数を作成
実行すると以下のシートを自動作成する：

| シート名 | 列（A列から順に） |
|----------|------------------|
| スタッフ一覧 | line_user_id / 表示名 / メールアドレス / 有効フラグ(TRUE/FALSE) |
| シフト希望 | 送信日時 / スタッフ名 / 日付(YYYY-MM-DD) / 希望区分(ok/maybe/ng) |
| 確定シフト | 日付(YYYY-MM-DD) / スタッフ名 / 業務種別(業務A/業務B) / 確定フラグ |
| 起床確認 | 日付(YYYY-MM-DD) / スタッフ名 / 押下日時 / 期限時刻 / 通知済フラグ |
| 出退勤記録 | スタッフ名 / 出勤日時 / 退勤日時 |
| トラブル記録 | スタッフ名 / 第一報日時 / 第二報日時 / 詳細内容 |
| 管理者設定 | 設定キー / 設定値 |

管理者設定シートの初期データ（setupSheets()で自動挿入）：

| 設定キー | 初期値 |
|----------|--------|
| admin_email | admin@gmail.com |
| cc_emails | （空文字） |
| wakeup_deadline | 08:00 |
| line_notify_time | 07:00 |
| shift_days | 1,2,4,5 |
| line_channel_token | （空文字） |
| line_group_id | （空文字） |
| admin_password | admin1234 |

※ shift_days は曜日番号（0=日,1=月,2=火,3=水,4=木,5=金,6=土）のカンマ区切り

---

## GAS共通実装ルール

```javascript
// 全GASファイル先頭に記載
const SPREADSHEET_ID = '【スプレッドシートID・デプロイ前に設定すること】';

function doGet(e) {
  const callback = e.parameter.callback;
  const action = e.parameter.action || '';
  let result = {};
  try {
    // actionに応じた処理をここに記述
    result = { success: true, data: {} };
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
    // actionに応じた処理をここに記述
    result = { success: true };
  } catch(err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- スプレッドシート操作は必ず `SpreadsheetApp.openById(SPREADSHEET_ID)` を使う
- シート取得は `ss.getSheetByName('シート名')` を使い、nullチェックを行う
- 日付は `YYYY-MM-DD` 文字列で統一（JavaScriptとGAS間の受け渡し）
- MailApp.sendEmail() の送信上限は無料Gmailで1日100通。コードにコメントで明記すること

---

## ①シフト管理（/shift/index.html + shift.gs）

### UIの流用元
以下の仮バージョンのコードをベースとして流用・拡張すること：
- CSS変数・カード・チップ・バッジのデザイン一式
- カレンダーグリッド（7列・定休日ハッチング表示）
- 希望タイプ選択ボタン（ok/maybe/ng）
- チップ一覧・進捗バー・トースト通知
- スタッフ設定タブ（名前変更・削除・追加）
- 管理者タブの希望一覧カード（充足/人手不足/要注意バッジ）

### 希望区分
- `ok`：出勤OK（緑）
- `maybe`：応相談（アンバー）
- `ng`：休み希望（赤）
- 未選択日：送信データに含めない

### スタッフ画面の機能
- スタッフ名選択ドロップダウン（JSONPのGETでスタッフ一覧取得・action=getStaff）
- 月ナビゲーション：今月〜3ヶ月先（前月には戻れない）
- カレンダー：管理者設定の shift_days に含まれる曜日のみ選択可・それ以外はハッチング
- 締切バナー：管理者設定から取得して表示
- 自分の過去送信データを画面表示時にGETで取得して反映（action=getMyShift）
- 「送信する」ボタン：no-corsでPOST（action=submitShift）
- 送信後トーストで「送信しました」表示

### 管理者タブ（希望一覧）
- 全スタッフの希望をカード形式で表示（action=getShiftRequests）
- フィルター：全件 / 充足 / 人手不足 / 要注意
- 各カードに ok/maybe/ng スタッフ名をチップ表示

### 管理者タブ（シフト確定）
- 月選択セレクト
- 日付ごとに出勤スタッフと業務種別（業務A/業務B）を入力できる
- 「確定」ボタンでPOST（action=confirmShift）
- 確定済みデータはスタッフ画面の「今日の業務」欄に反映

### 設定タブ
- スタッフ一覧管理（名前変更・有効フラグ・追加・削除）
- 提出期限の設定（日付入力）
- シフト対象曜日の設定（チェックボックス 月〜日）
- 全設定はPOSTで保存（action=updateSettings）

### shift.gs の action 一覧
- `getStaff`：有効スタッフ名リストを返す
- `getMyShift`：指定スタッフ・月の希望データを返す（パラメータ：name, year, month）
- `submitShift`：シフト希望を記録（同スタッフ・日付は上書き）
- `getShiftRequests`：全スタッフの希望を返す（パラメータ：year, month）
- `confirmShift`：確定シフトを書き込む
- `getConfirmedShift`：確定シフトを返す（パラメータ：year, month）
- `getSettings`：管理者設定を返す
- `updateSettings`：管理者設定を更新
- `getStaffList`：全スタッフ（無効含む）を返す（管理者用）
- `updateStaff`：スタッフ情報更新（名前・有効フラグ）
- `addStaff`：スタッフ追加
- `deleteStaff`：スタッフ削除

---

## ②起床確認（/wakeup/index.html + wakeup.gs）

### スタッフ画面
- スタッフ名選択ドロップダウン（action=getStaff）
- 本日の確定シフトに名前がある場合のみ「起床OK」ボタンを表示（action=checkTodayShift）
- 押下済みの場合：「HH:MM に送信済みです」と表示しボタン非表示
- 「起床OK」ボタン：no-corsでPOST（action=submitWakeup）
- 送信後：「送信しました」メッセージを画面内に表示

### wakeup.gs の action 一覧
- `checkTodayShift`：指定スタッフが本日シフト入りか確認・押下済みかも返す
- `submitWakeup`：押下日時を起床確認シートに記録

### 自動通知関数（time-based trigger用）
```javascript
/**
 * checkUnconfirmed()
 * !! この関数はGASエディタで time-based trigger を手動設定する必要があります !!
 * 設定方法: GASエディタ > トリガー > 「トリガーを追加」
 *   関数: checkUnconfirmed / イベント: 時間主導型 / 時刻: 毎日 指定時刻
 * 処理内容: 起床確認の期限時刻を過ぎても未押下のスタッフに管理者メールを送信
 */
function checkUnconfirmed() {
  // 実装内容をここに記述
}
```
- 通知メール件名：「【起床未確認】〇〇さんが未確認です」
- 本文：スタッフ名・本日日付・期限時刻
- 送信先：管理者設定の admin_email

---

## ③出退勤連絡（/attendance/index.html + attendance.gs）

### スタッフ画面
- スタッフ名選択ドロップダウン（action=getStaff）
- 「出勤」ボタン（--green-400・大きめ）と「退勤」ボタン（#2196F3・大きめ）
- 各ボタンは縦並び・幅100%・padding 1.2rem以上
- 押下：no-corsでPOST（action=submitAttendance・type=in または type=out）
- 押下後：「HH:MM に出勤を記録しました」を画面内に表示

### attendance.gs の action
- `submitAttendance`：出退勤日時を記録しメール送信
  - 出勤メール件名：「【出勤】〇〇さんが出勤しました（HH:MM）」
  - 退勤メール件名：「【退勤】〇〇さんが退勤しました（HH:MM）」
  - 本文：スタッフ名・日時
  - 宛先：admin_email、CC：cc_emails（カンマ区切り複数対応）

---

## ④トラブル対応（/trouble/index.html + trouble.gs）

### スタッフ画面
- スタッフ名選択ドロップダウン（action=getStaff）
- 「第一報を送信」ボタン：--red-400・幅100%・padding 1.2rem以上・目立つデザイン
- 第一報押下：no-corsでPOST（action=submitTrouble1st）
- 第一報送信後：「送信しました。第二報を入力してください。」を表示し第二報フォームを表示
- 第二報フォーム：テキストエリア（詳細内容）＋「第二報を送信」ボタン
- 第二報押下：no-corsでPOST（action=submitTrouble2nd）

### trouble.gs の action
- `submitTrouble1st`：第一報日時を記録しメール送信
  - 件名：「【緊急・第一報】〇〇さんからトラブル報告が届きました」
  - 本文：スタッフ名・日時・「詳細は第二報をお待ちください」
- `submitTrouble2nd`：第二報日時・内容を記録しメール送信
  - 件名：「【緊急・第二報】〇〇さんのトラブル詳細」
  - 本文：詳細内容・日時
- 宛先：admin_email、CC：cc_emails（両actionとも）

---

## 管理者設定画面（/admin/index.html）

### アクセス制限
- 画面を開くとパスワード入力欄のみ表示
- 入力値をJSONPで照合（action=checkPassword）
- 一致した場合のみ設定UIを表示
- sessionStorageにフラグ保存（ページ再読み込みで再認証）

### 設定項目
- 管理者メールアドレス
- CCメールアドレス（テキストエリア・1行1アドレス）
- 起床確認の期限時刻（HH:MM）
- LINE定型文の送信時刻（HH:MM・後で使用）
- シフト対象曜日（チェックボックス・月〜日）
- スタッフ一覧（名前変更・有効フラグ・追加・削除）
- LINEのChannel Access Token（入力欄のみ・今回は送信処理なし）
- LINEのGroup ID（入力欄のみ・今回は送信処理なし）
- 管理者パスワード変更欄

---

## トップページ（/index.html）

- 4アプリへのリンクカード一覧
- 各カードにアイコン・アプリ名・説明文
- デザインはシフト管理アプリのデザインシステムに統一

---

## 作成順序（この順番で作成すること）

1. css/common.css
2. js/config.js
3. gas/setup.gs
4. gas/shift.gs
5. gas/wakeup.gs
6. gas/attendance.gs
7. gas/trouble.gs
8. admin/index.html
9. shift/index.html（仮バージョンのデザイン・ロジックを流用・拡張）
10. wakeup/index.html
11. attendance/index.html
12. trouble/index.html
13. index.html

---

## 作成完了後に出力すること

1. 全ファイルのパス一覧
2. セットアップ手順（以下の順で）
   a. GitHubリポジトリ作成・ファイルアップロード・GitHub Pages有効化
   b. Googleスプレッドシート新規作成（URLからIDを確認する方法を明記）
   c. GASプロジェクト新規作成・各.gsファイルのコードを貼り付け
   d. SPREADSHEET_ID を全GASファイルに設定
   e. setup.gs の setupSheets() を実行してシートを初期化
   f. 各GASをWeb Appとしてデプロイ（「全員」アクセス可・「新しいデプロイ」）
   g. 取得したデプロイURLを js/config.js に設定してGitHubにプッシュ
   h. time-based triggerの手動設定（checkUnconfirmed関数）
3. 動作確認チェックリスト

---

## 注意事項（ハルシネーション防止・厳守）

- GASのtime-based triggerはコードで自動設定しない。手動設定が必要な旨をコードにコメントで必ず明記する
- LINEグループへのメッセージ送信は今回実装しない。設定値の保存欄のみ設ける
- MailApp.sendEmail() の送信上限は無料Gmailで1日100通。コードにコメントで明記する
- GitHub Pagesは静的ファイルのみ。サーバーサイド処理はすべてGASで行う
- fetch() に mode:'no-cors' を使う場合、レスポンスボディは読み取れない。読み取ろうとするコードは書かない
- 存在しないGASメソッドやJavaScript APIを使用しない
- SpreadsheetApp.openById() のIDはスプレッドシートURLの /d/ と /edit の間の文字列である
- GASのWeb Appデプロイは「アクセスできるユーザー：全員（匿名を含む）」に設定する必要がある。その旨をセットアップ手順に明記する
