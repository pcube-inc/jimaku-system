# 業務連絡システム 構築マニュアル

**P-CUBE（字幕）— システム再現手順書**

> このマニュアルを最初から順番に読んで進めれば、同じシステムをゼロから再構築できます。  
> 対象読者：パソコン・スマホの基本操作ができる方（プログラミング知識不要）

---

## 全体の流れ

```
STEP 1  Googleアカウントの準備
  ↓
STEP 2  Googleスプレッドシートの作成
  ↓
STEP 3  Google Apps Script（GAS）の設定（5プロジェクト）
  ↓
STEP 4  GitHubの設定とファイルのアップロード
  ↓
STEP 5  GitHub Pagesで公開
  ↓
STEP 6  LINE Developersの設定（チャネル・LIFF）
  ↓
STEP 7  LINE公式アカウントの設定
  ↓
STEP 8  config.jsの書き換え・最終反映
  ↓
STEP 9  スプレッドシートの初期化
  ↓
STEP 10 動作確認・ローンチ
```

---

## STEP 1：Googleアカウントの準備

### 1-1. Googleアカウントの作成（既にある場合はスキップ）

1. [https://accounts.google.com/signup](https://accounts.google.com/signup) にアクセス
2. 名前・メールアドレス・パスワードを入力して作成
3. 作成したGmailアドレスを控えておく

> **ポイント**: このGoogleアカウントがシステム全体の管理者アカウントになります。  
> 通知メールもこのアカウントのGmailから送信されます。

---

## STEP 2：Googleスプレッドシートの作成

スプレッドシートがこのシステムのデータベースになります。

### 2-1. スプレッドシートを新規作成する

1. [https://sheets.google.com](https://sheets.google.com) にアクセス
2. 左上の「＋ 新しいスプレッドシート」をクリック
3. 左上のタイトル「無題のスプレッドシート」をクリックして名前を変更  
   例：`業務連絡システム`

### 2-2. スプレッドシートIDを控える

URLを確認します：

```
https://docs.google.com/spreadsheets/d/【ここがID】/edit
```

例（実際のID）：
```
1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY
```

このIDは後で使うので必ずメモしてください。

### 2-3. 共有設定は不要

後でGASが自動的にシートを作成します。この時点では何も入力しなくて大丈夫です。

---

## STEP 3：Google Apps Script（GAS）の設定

GASはシステムのバックエンド（裏側の処理）を担います。  
5つのプロジェクトを個別に作成します。

### 作成する5つのプロジェクト

| プロジェクト名 | 役割 |
|--------------|------|
| jimaku-shift | シフト管理・スタッフ管理・LINE送信 |
| jimaku-wakeup | 起床確認 |
| jimaku-attendance | 出退勤連絡 |
| jimaku-trouble | トラブル対応 |
| jimaku-setup | 管理者設定・初期化 |

---

### 3-1. GASプロジェクトの作成手順（5回繰り返す）

以下の手順を5つのプロジェクトそれぞれで行います。

#### ① 新規プロジェクトを作成する

1. [https://script.google.com](https://script.google.com) にアクセス
2. 左上「新しいプロジェクト」をクリック
3. プロジェクト名を変更する（左上「無題のプロジェクト」をクリック）

| 番号 | プロジェクト名 | 対応ファイル |
|------|--------------|------------|
| 1 | jimaku-shift | `gas/shift.gs` |
| 2 | jimaku-wakeup | `gas/wakeup.gs` |
| 3 | jimaku-attendance | `gas/attendance.gs` |
| 4 | jimaku-trouble | `gas/trouble.gs` |
| 5 | jimaku-setup | `gas/setup.gs` |

#### ② コードを貼り付ける

1. エディタ画面の `function myFunction() {}` を全選択して削除
2. 対応する `.gs` ファイルの内容をすべてコピー
3. エディタに貼り付ける
4. `Ctrl + S`（Mac: `Cmd + S`）で保存

> **重要**: 各ファイルの先頭にある `SPREADSHEET_ID` が正しいか確認してください。  
> ```javascript
> const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';
> ```
> STEP 2-2で控えたIDと一致していること。

#### ③ Webアプリとしてデプロイする

1. 右上「デプロイ」ボタンをクリック
2. 「新しいデプロイ」をクリック
3. 歯車アイコン → 「ウェブアプリ」を選択
4. 以下のように設定する：
   - 説明：任意（例：`v1`）
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**
5. 「デプロイ」をクリック
6. Googleアカウントの権限確認が出たら「許可」をクリック
7. 表示された**ウェブアプリのURL**をメモする

> **URLの形式**:
> ```
> https://script.google.com/macros/s/【英数字の文字列】/exec
> ```

この作業を5つのプロジェクトすべてで行い、5つのURLを控えます。

---

### 3-2. コードの変更後に再デプロイする手順

コードを修正した場合は「新しいデプロイ」ではなく「既存のデプロイを更新」します。

1. GASエディタで「デプロイ」→「デプロイを管理」
2. デプロイ一覧の右にある鉛筆アイコン（編集）をクリック
3. バージョン：**「新バージョン」** を選択
4. 「デプロイ」をクリック
5. 「デプロイを更新しました」と表示されたら完了

> **注意**: バージョンを「新バージョン」にしないと変更が反映されません。

---

## STEP 4：GitHubの設定とファイルのアップロード

GitHubはコードを管理・公開するサービスです。  
ここにファイルを置くことでWebアプリが公開されます。

### 4-1. GitHubアカウントの作成（既にある場合はスキップ）

1. [https://github.com](https://github.com) にアクセス
2. 「Sign up」からアカウントを作成
3. メールアドレスを確認して登録完了

### 4-2. 組織（Organization）の作成（個人アカウントの場合はスキップ可）

今回は `pcube-inc` という組織アカウントを使用しています。

1. GitHubにログイン後、右上のアイコン → 「Your organizations」
2. 「New organization」をクリック
3. プラン：「Free」を選択
4. 組織名を入力（例：`pcube-inc`）

### 4-3. リポジトリの作成

1. GitHubで「New repository」をクリック
2. 以下のように設定：
   - Owner：`pcube-inc`（または自分のアカウント）
   - Repository name：`jimaku-system`
   - 公開設定：**Public**（GitHub Pagesを無料で使うため）
   - 「Add a README file」にチェック
3. 「Create repository」をクリック

作成されたリポジトリのURL：
```
https://github.com/pcube-inc/jimaku-system
```

### 4-4. ファイルのアップロード

システムのファイル一式をGitHubにアップロードします。

**アップロードするファイル・フォルダ構成：**

```
jimaku-system/
├── index.html          ← メニュー画面
├── css/
│   └── common.css      ← 共通スタイル
├── js/
│   ├── config.js       ← GAS URL・LIFF IDの設定ファイル
│   └── liff-helper.js  ← LINE LIFF共通モジュール
├── shift/
│   └── index.html      ← シフト管理画面
├── wakeup/
│   └── index.html      ← 起床確認画面
├── attendance/
│   └── index.html      ← 出退勤連絡画面
├── trouble/
│   └── index.html      ← トラブル対応画面
├── admin/
│   └── index.html      ← 管理者設定画面
└── gas/                ← GASコード（参照用・GitHubには置くがWebには関係しない）
    ├── shift.gs
    ├── wakeup.gs
    ├── attendance.gs
    ├── trouble.gs
    └── setup.gs
```

**アップロード手順（GitHub画面から）：**

1. リポジトリのページで「Add file」→「Upload files」
2. ファイルをドラッグ＆ドロップ
3. 「Commit changes」をクリック

> **大量ファイルの場合はGit（コマンドライン）の使用を推奨します。**  
> Gitが使える場合：
> ```bash
> git clone https://github.com/pcube-inc/jimaku-system.git
> # ファイルをコピーして
> git add .
> git commit -m "初回アップロード"
> git push origin main
> ```

---

## STEP 5：GitHub Pagesで公開する

GitHub Pagesを有効にするとURLでアクセスできるようになります。

### 5-1. GitHub Pagesを有効にする

1. リポジトリのページで「Settings」タブをクリック
2. 左メニューの「Pages」をクリック
3. 「Branch」のプルダウンで **`main`** を選択
4. フォルダは **`/ (root)`** を選択
5. 「Save」をクリック

### 5-2. 公開URLを確認する

数分後にページ上部に以下のURLが表示されます：

```
https://pcube-inc.github.io/jimaku-system/
```

> **反映に最大5〜10分かかることがあります。**  
> URLにアクセスしてメニュー画面が表示されれば公開成功です。

---

## STEP 6：LINE Developersの設定

LINEログイン（LIFF）機能を使うために必要な設定です。

### 6-1. LINE Developersにログイン

1. [https://developers.line.biz/](https://developers.line.biz/) にアクセス
2. 「ログイン」→ LINEアカウントでログイン

### 6-2. プロバイダーの作成

1. 「Create a new provider」をクリック
2. プロバイダー名を入力（例：`P-CUBE`）
3. 「Create」をクリック

### 6-3. チャネルの作成

1. 「Create a new channel」をクリック
2. チャネルタイプ：**「LINE Login」** を選択
3. 以下を入力：
   - チャネル名：`P-CUBE（字幕）`（任意）
   - チャネル説明：任意
   - アプリタイプ：**「ウェブアプリ」** にチェック
4. 「Create」をクリック

### 6-4. LIFFアプリを4つ作成する

LIFFはLINEアプリ内でWebページを開く仕組みです。  
以下の4つのページ用にそれぞれ作成します。

1. チャネルのページで「LIFF」タブをクリック
2. 「追加」をクリック
3. 以下の設定で4つ作成する：

| LIFF名 | エンドポイントURL | サイズ |
|--------|----------------|-------|
| shift | `https://pcube-inc.github.io/jimaku-system/shift/` | Full |
| wakeup | `https://pcube-inc.github.io/jimaku-system/wakeup/` | Full |
| attendance | `https://pcube-inc.github.io/jimaku-system/attendance/` | Full |
| trouble | `https://pcube-inc.github.io/jimaku-system/trouble/` | Full |

4. 各LIFFを作成すると **LIFF ID** が発行される（形式：`数字-英数字`）  
   例：`2010288935-EetRFNLf`

5. 4つのLIFF IDをすべてメモする

> **Scopeの設定**:  
> 各LIFFで「profile」にチェックが入っていることを確認してください。  
> スタッフのLINEプロフィール名を取得するために必要です。

---

## STEP 7：LINE公式アカウントの設定

スタッフが友達追加できる公式アカウント（Bot）の設定です。

### 7-1. LINE Official Account Managerにログイン

1. [https://manager.line.biz/](https://manager.line.biz/) にアクセス
2. LINEアカウントでログイン

### 7-2. 公式アカウントの作成（既にある場合はスキップ）

1. 「作成」→「LINE公式アカウントを作成」
2. アカウント名：`P-CUBE（字幕）`
3. 業種を選択して作成

### 7-3. Messaging APIの有効化

LINEグループへのメッセージ送信に必要です。

1. 「設定」→「Messaging API」
2. 「Messaging APIを利用する」をクリック
3. 先ほど作成したLINE Developersのプロバイダーを選択
4. 「OK」をクリック

### 7-4. Channel Access Tokenの発行

1. LINE Developersの該当チャネル（Messaging API）を開く
2. 「Messaging API設定」タブ
3. 「Channel access token」の「発行」をクリック
4. 表示されたトークンをメモする

### 7-5. LINEグループIDの取得

LINEグループにメッセージを送るためにグループIDが必要です。

1. LINE BotをLINEグループに招待する
2. グループにメッセージを送信する
3. LINE Developersの「Webhook」設定でWebhook URLを設定するか、  
   GASのログ（`Logger.log`）からGroup IDを確認する

> **Group IDの形式**：`C` から始まる文字列  
> 例：`C1234567890abcdef1234567890abcdef`

### 7-6. 友達追加URL・QRコードの確認

1. LINE Official Account Managerの「友だちを増やす」→「友だち追加ガイド」
2. QRコードと友達追加URLが表示される

**このシステムの友達追加情報：**
- アカウントID：`@305lsedx`
- 友達追加URL：`https://line.me/R/ti/p/@305lsedx`

---

## STEP 8：config.jsの書き換え・最終反映

STEP 3・6で取得した値を設定ファイルに書き込みます。

### 8-1. config.jsを編集する

`js/config.js` を開いて以下の値を書き換えます：

```javascript
const GAS_URL = {
  shift:      '【jimaku-shiftのデプロイURL】',
  wakeup:     '【jimaku-wakeupのデプロイURL】',
  attendance: '【jimaku-attendanceのデプロイURL】',
  trouble:    '【jimaku-troubleのデプロイURL】',
  admin:      '【jimaku-setupのデプロイURL】',
};

const SPREADSHEET_ID = '【STEP 2-2で控えたスプレッドシートID】';

const LIFF_ID = {
  shift:      '【shiftのLIFF ID】',
  wakeup:     '【wakeupのLIFF ID】',
  attendance: '【attendanceのLIFF ID】',
  trouble:    '【troubleのLIFF ID】',
};
```

**このシステムの実際の値（参考）：**

```javascript
const GAS_URL = {
  shift:      'https://script.google.com/macros/s/AKfycbzcn9X9AvO5rHGeOOwnyj1Ctb_V7asir_yAXsNP5iBUw5QQESxq1BVQDLnDZBKs27vc/exec',
  wakeup:     'https://script.google.com/macros/s/AKfycbwbUyXz91dfpRXOCH76xDLBNVvP72QP2lZGk__qisGPe4B1NmS6_yroEU28rRs5JXL6/exec',
  attendance: 'https://script.google.com/macros/s/AKfycbzksKAP49RjeMyXShitN1YzF_8dDLWhyJXIe2elGyjJyvjCkfWgtn6Cbms9bq88Az_Htw/exec',
  trouble:    'https://script.google.com/macros/s/AKfycbz4Aa-vI7mgMj8PEfvo6_ZqTe0BPqzK1FudrBv3RsiMtC-dIwHf2u9KShG55xs5cFT9/exec',
  admin:      'https://script.google.com/macros/s/AKfycbxr7xpK6nsMMVvPm4hss7QYG2VE3m2aWzhClJdljnp_-LE1gxwriVQwHQHVmxi7Ak4z/exec',
};

const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';

const LIFF_ID = {
  shift:      '2010288935-EetRFNLf',
  wakeup:     '2010288935-bwQd9Tmq',
  attendance: '2010288935-CG4xMF6B',
  trouble:    '2010288935-b0khjSws',
};
```

### 8-2. GitHubにアップロードする

編集した `config.js` をGitHubにアップロード（コミット）します。

**GitHub画面から操作する場合：**
1. GitHubのリポジトリで `js/config.js` を開く
2. 鉛筆アイコン（編集）をクリック
3. 内容を書き換える
4. 「Commit changes」をクリック

**Gitコマンドで操作する場合：**
```bash
git add js/config.js
git commit -m "config: GAS URLとLIFF IDを設定"
git push origin main
```

---

## STEP 9：スプレッドシートの初期化

GASのsetupSheets()関数を実行して、必要なシートを自動作成します。

### 9-1. setupSheets()を実行する

1. [https://script.google.com](https://script.google.com) で `jimaku-setup` プロジェクトを開く
2. 関数の選択プルダウンで **`setupSheets`** を選択
3. 「▶ 実行」ボタンをクリック
4. 権限の確認が出たら「許可」をクリック

### 9-2. シートが作成されたか確認する

Googleスプレッドシートを開いて、以下のシートが自動作成されているか確認します：

| シート名 | 用途 |
|---------|------|
| スタッフ一覧 | スタッフのLINE ID・名前・メール管理 |
| シフト希望 | スタッフが提出したシフト希望 |
| 確定シフト | 管理者が確定したシフト |
| 起床確認 | 起床確認の記録 |
| 出退勤記録 | 出退勤の打刻記録 |
| トラブル記録 | トラブル報告の記録 |
| 管理者設定 | 各種設定値 |

### 9-3. スタッフ一覧のヘッダーを確認する

「スタッフ一覧」シートのヘッダー行（1行目）が以下になっているか確認します：

| A列 | B列 | C列 | D列 | E列 |
|-----|-----|-----|-----|-----|
| line_user_id | LINE表示名 | 登録名 | メールアドレス | 有効フラグ |

### 9-4. 管理者設定の初期値を確認する

「管理者設定」シートに以下の初期値が入っているか確認します：

| 設定キー | 初期値 | 説明 |
|---------|--------|------|
| admin_email | admin@gmail.com | **必ず実際のメールに変更** |
| cc_emails | （空） | CC送信先 |
| wakeup_deadline | 08:00 | 起床確認の期限時刻 |
| line_notify_time | 07:00 | LINE通知の時刻 |
| shift_days | 1,2,4,5 | シフト対象曜日（月火木金） |
| line_channel_token | （空） | LINEトークン |
| line_group_id | （空） | LINEグループID |
| admin_password | admin1234 | **必ず変更** |

---

## STEP 10：動作確認・ローンチ

### 10-1. 管理者設定を行う

1. `https://pcube-inc.github.io/jimaku-system/admin/` を開く
2. パスワード `admin1234` でログイン
3. 「基本設定」タブで以下を設定・保存：
   - 管理者メールアドレス（実際のアドレスに変更）
   - 起床確認の期限時刻
   - シフト対象曜日
4. パスワードを変更する
5. 「LINE設定」タブで Channel Access Token と Group ID を入力・保存

### 10-2. スタッフを登録する

1. 管理者設定 → 「スタッフ」タブ
2. 登録名・メールアドレスを入力して「追加」
3. スタッフ全員分繰り返す

### 10-3. 各機能の動作確認

| 確認項目 | 手順 |
|---------|------|
| メニュー表示 | `https://pcube-inc.github.io/jimaku-system/` にアクセスして画面が表示されるか |
| スタッフ一覧 | シフト管理を開いてスタッフ名が表示されるか |
| シフト希望送信 | テスト送信してスプレッドシートに記録されるか |
| メール通知 | 出退勤ボタンを押して管理者メールが届くか |
| LINE自動連携 | LINEからアプリを開いてLINE IDが登録されるか |

### 10-4. 自動トリガーを設定する（任意）

GASの時間トリガーを設定することで自動通知が動作します。

**起床未確認アラート：**
1. `jimaku-wakeup` プロジェクトを開く
2. 左メニューの時計アイコン「トリガー」をクリック
3. 「トリガーを追加」
4. 関数：`checkUnconfirmed` / 種類：時間主導型 / 毎日 起床期限の直後の時間帯

**毎朝シフト通知：**
1. `jimaku-shift` プロジェクトを開く
2. 「トリガー」→「トリガーを追加」
3. 関数：`sendDailyMessage` / 種類：時間主導型 / 毎日 希望の通知時刻

---

## 修正・変更の記録

構築後に行った修正の記録です。

| 変更内容 | 対象ファイル | 理由 |
|---------|------------|------|
| スタッフ一覧を4列→5列に拡張（登録名C列追加） | 全GAS・admin/index.html | LINE表示名と業務上の名前を分けるため |
| LIFF初期化のエラーハンドリング強化 | js/liff-helper.js | タイムアウト・エラー時にブラウザモードで動作するよう改善 |
| prompt()をHTML入力欄に置き換え | 各index.html | Chrome拡張環境でprompt()がフリーズする問題を解消 |
| LINE LIFF連携・LINEグループ送信機能追加 | shift/index.html, gas/shift.gs | LINEグループへのシフト通知送信を実装 |
| 管理者設定のLINE設定タブのメッセージ削除 | admin/index.html | 「今後実装予定」という古いメッセージが残っていたため |
| タイトル・フッターをP-CUBEに変更 | index.html | ブランディング変更 |
| ページタイトルを「業務連絡システム」に変更 | index.html | 表記統一 |

---

## 各種ID・URL 一覧（このシステムの実際の値）

> セキュリティのため、パスワードやトークンはここに記載しません。  
> Googleスプレッドシートの「管理者設定」シートで管理してください。

| 項目 | 値 |
|-----|-----|
| GitHubリポジトリ | https://github.com/pcube-inc/jimaku-system |
| 公開URL | https://pcube-inc.github.io/jimaku-system/ |
| スプレッドシートID | `1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY` |
| LINE公式アカウントID | `@305lsedx` |
| LIFF ID（shift） | `2010288935-EetRFNLf` |
| LIFF ID（wakeup） | `2010288935-bwQd9Tmq` |
| LIFF ID（attendance） | `2010288935-CG4xMF6B` |
| LIFF ID（trouble） | `2010288935-b0khjSws` |

---

*© P-CUBE Inc.*
