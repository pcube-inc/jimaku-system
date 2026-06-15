# システム構築マニュアル — P-CUBE 業務連絡システム（ゼロから作る手順）

このマニュアルは、P-CUBE業務連絡システムをゼロから構築するための完全な手順書です。
プログラミングの知識がなくても、手順通りに進めれば構築できます。

---

## 全体の流れ

```
1. Googleアカウント準備
2. Googleスプレッドシート作成
3. Google Apps Script (GAS) × 5本のセットアップとデプロイ
4. GitHub Pages でフロントエンドを公開
5. LINE Developers でLIFF × 4本を設定
6. 設定値を書き換えてデプロイ完了
7. 初期設定（管理者パスワード・スタッフ登録・トリガー起動）
```

---

## 必要なもの

| ツール | 用途 | 費用 |
|-------|------|------|
| Googleアカウント | スプレッドシート・GAS | 無料 |
| GitHubアカウント | フロントエンドのホスティング | 無料 |
| LINE公式アカウント（Messaging API） | LINEプッシュ通知・LIFF | 無料〜 |

---

## ステップ1: Googleスプレッドシートを作成する

1. [Google Drive](https://drive.google.com/) を開く
2. 「新規」→「Googleスプレッドシート」→「空白のスプレッドシート」
3. スプレッドシートの名前を「業務連絡システム」などに変更する
4. URLの `/d/` と `/edit` の間の文字列が **スプレッドシートID** です

```
https://docs.google.com/spreadsheets/d/【ここがID】/edit
```

> このIDは後で使います。メモしておいてください。

---

## ステップ2: Google Apps Script (GAS) プロジェクトを5つ作る

GASはGoogleが提供する無料のサーバーサイドスクリプトサービスです。
このシステムではシステム機能ごとに5つのプロジェクトを作ります。

### GASプロジェクトの作り方（共通手順）

1. [script.google.com](https://script.google.com/) を開く
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を変更する（例: `jimaku-shift`）
4. 表示されている `function myFunction() {}` を全て削除する
5. 対応するGASファイルのコードをコピーして貼り付ける
6. コード内の `SPREADSHEET_ID = '...'` を自分のIDに書き換える

### 作成する5つのプロジェクト

| プロジェクト名（推奨） | 使うファイル | 役割 |
|-------------------|-----------|------|
| jimaku-shift | `gas/shift.gs` | シフト管理・LINE Webhook |
| jimaku-wakeup | `gas/wakeup.gs` | 起床確認・自動通知 |
| jimaku-attendance | `gas/attendance.gs` | 出退勤連絡 |
| jimaku-trouble | `gas/trouble.gs` | トラブル報告 |
| jimaku-setup | `gas/setup.gs` | 管理者設定・シート初期化 |

### GASをWebアプリとしてデプロイする手順

各プロジェクトで以下の手順を繰り返します：

1. GASエディタの右上「デプロイ」→「新しいデプロイ」
2. 歯車アイコン（⚙️）→「ウェブアプリ」を選択
3. 設定：
   - 説明: 任意（例: `v1`）
   - 次のユーザーとして実行: **「自分」**
   - アクセスできるユーザー: **「全員」**
4. 「デプロイ」をクリック
5. 初回はGoogleアカウントの権限許可画面が表示される → 「許可」
6. **デプロイ後に表示されるURL（`https://script.google.com/macros/s/...`）をメモする**

> ⚠️ URLはデプロイのたびに変わります。コードを変更したら「既存のデプロイを編集」→「新バージョン」でデプロイすることでURLを変えずに更新できます。

### シートを初期化する（jimaku-setup のみ）

jimaku-setup のデプロイ完了後、GASエディタで：

1. 関数選択ドロップダウンで **`setupSheets`** を選ぶ
2. 「実行」ボタンをクリック
3. 「セットアップ完了（v2スキーマ）」とログに表示されれば成功

これでスプレッドシートに7つのシートが自動作成されます。

---

## ステップ3: GitHubでフロントエンドを公開する

### リポジトリを作る

1. [GitHub](https://github.com/) にログイン
2. 「New repository」→ リポジトリ名を **`jimaku-system`** にする
3. 「Public」を選択
4. 「Create repository」

### ファイルをアップロードする

このプロジェクトのファイルをそのままGitHubにアップロードします。

**方法A: GitHub Webからアップロード（初心者向け）**

1. 作成したリポジトリのページを開く
2. 「uploading an existing file」リンクをクリック
3. プロジェクトフォルダ内のファイルをすべてドラッグ&ドロップ
4. 「Commit changes」をクリック

**方法B: Git CLIを使う（推奨）**

```bash
cd "プロジェクトのフォルダ"
git init
git remote add origin https://github.com/【ユーザー名】/jimaku-system.git
git add .
git commit -m "initial commit"
git push -u origin main
```

### GitHub Pagesを有効化する

1. リポジトリのページ → 「Settings」タブ
2. 左メニュー「Pages」
3. Source: 「Deploy from a branch」
4. Branch: `main` / `/ (root)`
5. 「Save」をクリック
6. 数分後にURLが表示される → `https://【ユーザー名】.github.io/jimaku-system/`

---

## ステップ4: `js/config.js` に設定値を書き込む

`js/config.js` を開いて、以下の値を書き換えます：

```javascript
const GAS_URL = {
  shift:      '【jimaku-shift のデプロイURL】',
  wakeup:     '【jimaku-wakeup のデプロイURL】',
  attendance: '【jimaku-attendance のデプロイURL】',
  trouble:    '【jimaku-trouble のデプロイURL】',
  admin:      '【jimaku-setup のデプロイURL】',
};

const SPREADSHEET_ID = '【ステップ1でメモしたID】';

const LIFF_ID = {
  shift:      '【後で設定】',
  wakeup:     '【後で設定】',
  attendance: '【後で設定】',
  trouble:    '【後で設定】',
};
```

書き換え後、GitHubにプッシュ（またはWebからファイルを更新）します。

---

## ステップ5: LINE DevelopersでLIFF × 4を設定する

LIFF（LINE Front-end Framework）を使うとLINEアプリ内でWebページを開き、LINEのユーザーIDを自動取得できます。

### LINE公式アカウントの作成（まだない場合）

1. [LINE Business ID](https://account.line.biz/) にアクセス
2. LINEアカウントでログイン
3. 「Messaging API」チャネルを作成する

### LINEチャネルアクセストークンを取得する

1. [LINE Developers Console](https://developers.line.biz/console/) を開く
2. チャネル → 「Messaging API設定」タブ
3. 一番下の「チャネルアクセストークン（長期）」→「発行」
4. 表示されたトークンをメモする（管理者設定の `line_channel_token` に使います）

### LIFFアプリを4つ作成する

1. LINE Developers Console → チャネル → 「LIFF」タブ
2. 「追加」ボタンで以下の4つを作成する：

| LIFFアプリ名 | エンドポイントURL | サイズ |
|------------|----------------|------|
| jimaku-shift | `https://【ユーザー名】.github.io/jimaku-system/shift/` | Full |
| jimaku-wakeup | `https://【ユーザー名】.github.io/jimaku-system/wakeup/` | Full |
| jimaku-attendance | `https://【ユーザー名】.github.io/jimaku-system/attendance/` | Full |
| jimaku-trouble | `https://【ユーザー名】.github.io/jimaku-system/trouble/` | Full |

各LIFFのIDが発行されるので、`js/config.js` の `LIFF_ID` に書き込む：

```javascript
const LIFF_ID = {
  shift:      '1234567890-AbCdEfGh',  // LIFFのIDをここに
  wakeup:     '1234567890-XxXxXxXx',
  attendance: '1234567890-YyYyYyYy',
  trouble:    '1234567890-ZzZzZzZz',
};
```

書き換え後にGitHubにプッシュします。

### LIFFを公開状態にする

各LIFFの「公開設定」を確認し、公開状態にします（テスト中はテストユーザーを追加することもできます）。

---

## ステップ6: LINE Webhookを設定する（シフト確定通知に必要）

スタッフ全員にLINEでシフト確定通知を送るには、BroadcastAPIを使います。

1. LINE Developers → チャネル → 「Messaging API設定」
2. 「Webhook URL」に jimaku-shift のデプロイURLを設定：
   ```
   https://script.google.com/macros/s/【jimaku-shiftのID】/exec
   ```
3. 「Webhookの利用」をONにする
4. 「検証」ボタンで接続テストを行う

---

## ステップ7: 起床確認の自動トリガーを設定する

jimaku-wakeup プロジェクトのトリガーを1回だけ手動起動します：

1. [script.google.com](https://script.google.com/) → jimaku-wakeup プロジェクトを開く
2. 関数ドロップダウンで **`setupTriggers`** を選ぶ
3. 「実行」ボタンをクリック
4. ログに `トリガー設定完了：sendWakeupReminder=... checkUnconfirmed=...` と表示されれば成功

> 以降は毎日自動で実行され、前日の実行時に翌日のトリガーが再スケジュールされます。

---

## ステップ8: 管理者設定ページで初期設定する

1. ブラウザで `https://【ユーザー名】.github.io/jimaku-system/` を開く
2. 「管理者設定」→ パスワード `admin1234` でログイン
3. 以下を設定して「保存」：
   - `admin_email`: 通知を受け取るメールアドレス
   - `cc_emails`: CCに追加したいメール（複数は`,`で区切る）
   - `wakeup_reminder_time`: 起床リマインダーの時刻（例: `07:00`）
   - `wakeup_deadline`: 起床確認の期限時刻（例: `08:00`）
   - `line_channel_token`: ステップ5で取得したトークン
   - `admin_password`: 任意のパスワードに変更する（初期値: `admin1234`）

---

## ファイル構成

```
jimaku-system/
├── index.html              # トップページ（メニュー）
├── js/
│   ├── config.js           # GAS URL・LIFF ID・スプレッドシートID
│   └── liff-helper.js      # LIFF初期化・LINE ID照合の共通モジュール
├── css/
│   └── common.css          # 共通スタイル
├── shift/
│   └── index.html          # シフト管理ページ
├── wakeup/
│   └── index.html          # 起床確認ページ
├── attendance/
│   └── index.html          # 出退勤連絡ページ
├── trouble/
│   └── index.html          # トラブル報告ページ
├── admin/
│   └── index.html          # 管理者設定ページ
└── gas/
    ├── shift.gs            # シフト管理GAS
    ├── wakeup.gs           # 起床確認GAS（自動トリガーあり）
    ├── attendance.gs       # 出退勤GAS
    ├── trouble.gs          # トラブル報告GAS
    └── setup.gs            # 管理者設定・シート初期化GAS
```

---

## システム構成の技術的な説明

### フロントエンド（GitHub Pages）
- 静的HTML/CSS/JavaScriptで構築
- LINEアプリ内からアクセスするとLIFF経由でLINE IDを自動取得
- GASへのAPI呼び出しは、GETは**JSONP**（`callback=`パラメータ）、POSTは**`fetch mode:no-cors`**（FormData）を使用
  - これはCORSの制限を回避するための仕組みです

### バックエンド（Google Apps Script）
- 各GASはWebアプリとして `doGet()` / `doPost()` で受け付ける
- `doGet()` → JSONP対応（`callback=`があれば関数として返す）
- `doPost()` → フォームデータを受け取りJSONを返す
- スプレッドシートへの読み書きは `SpreadsheetApp.openById()` で行う
- メール送信は `MailApp.sendEmail({ to, cc, subject, body })` で行う

### 自動トリガー（起床確認）
- `setupTriggers()` を1回実行すると最初のトリガーが作成される
- `sendWakeupReminder()` 実行時に翌日の `sendWakeupReminder` トリガーを作成（自己再スケジュール）
- `checkUnconfirmed()` も同様に自己再スケジュール
- これにより初回以降は手動操作不要で毎日動き続ける

---

## トラブルシューティング

### GASデプロイ後にHTTPエラーが出る
- 「アクセスできるユーザー」が「全員」になっているか確認
- 権限の再許可が必要な場合はデプロイを更新して再度許可する

### スプレッドシートIDの確認方法
スプレッドシートのURLから確認：
```
https://docs.google.com/spreadsheets/d/【ここがID】/edit#gid=0
```

### GASのログを確認する方法
1. GASエディタを開く
2. 「実行」→「実行数」または「ログ」タブで確認できる

### 設定を変更した後は必ずデプロイを更新する
コードを変更した後は：
1. 「デプロイ」→「デプロイを管理」
2. 対象のデプロイの鉛筆アイコン（編集）
3. バージョン: 「新バージョン」を選択
4. 「デプロイ」

> コードを変更してもデプロイを更新しないと変更が反映されません。
