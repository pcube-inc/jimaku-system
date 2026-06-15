# P-CUBE 業務連絡システム — 完全引き継ぎドキュメント

> 別PCでの引き継ぎ・ゼロ再構築の両方に対応した技術資料です。

---

## 目次

1. [システム概要・コンセプト](#1-システム概要コンセプト)
2. [現在の構成（実際のID・URL）](#2-現在の構成実際のidurl)
3. [アーキテクチャ](#3-アーキテクチャ)
4. [ファイル構成](#4-ファイル構成)
5. [スプレッドシートのデータ構造](#5-スプレッドシートのデータ構造)
6. [GAS各プロジェクトの役割と主要関数](#6-gas各プロジェクトの役割と主要関数)
7. [別PCへの引き継ぎ手順](#7-別pcへの引き継ぎ手順)
8. [コードを変更してデプロイする手順](#8-コードを変更してデプロイする手順)
9. [ゼロから再構築する手順](#9-ゼロから再構築する手順)
10. [管理者設定キー一覧](#10-管理者設定キー一覧)
11. [トラブルシューティング](#11-トラブルシューティング)

---

## 1. システム概要・コンセプト

P-CUBE（字幕部門）のスタッフ向け業務連絡システムです。
LINEアプリ内から使えるWebアプリ（LIFF）で、以下の機能を提供しています。

### 機能一覧

| 機能 | 説明 | 利用者 |
|------|------|--------|
| シフト管理 | 希望日の提出・確定シフトの確認・自分のシフト表示 | スタッフ全員 |
| 起床確認 | 出勤日の朝に起床ボタンを押す。期限切れ・重複押しを検知 | スタッフ全員 |
| 出退勤連絡 | 出勤・退勤時にボタンを押すとメール通知が管理者に届く | スタッフ全員 |
| トラブル報告 | 緊急時に第一報→第二報（詳細）の2段階でメール通知 | スタッフ全員 |
| 管理者設定 | スタッフ管理・通知先設定・定型文設定（要パスワード） | 管理者のみ |

### コンセプトの肝

- **サーバー不要・無料** — フロントはGitHub Pages（静的HTML）、バックエンドはGoogle Apps Script（GAS）のWebアプリ
- **LINEと連携** — LIFFを使うことでLINEアプリ内でWebページを開き、LINE IDから自動でスタッフを特定できる
- **CORS制約の回避** — GASとの通信はGETに**JSONP**、POSTに**`fetch mode:no-cors`（FormData）**を使用
- **Googleスプレッドシートがデータベース** — GASがスプレッドシートを読み書きするためSQLは不要

---

## 2. 現在の構成（実際のID・URL）

### GitHub Pages（フロントエンド）

```
https://pcube-inc.github.io/jimaku-system/
```

リポジトリ: `https://github.com/pcube-inc/jimaku-system`

### Googleスプレッドシート

```
スプレッドシートID: 1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY
```

URL: `https://docs.google.com/spreadsheets/d/1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY/edit`

### GAS 5プロジェクト（`js/config.js`の`GAS_URL`に対応）

| キー | プロジェクト名 | scriptId | デプロイURL |
|------|-------------|----------|------------|
| shift | jimaku-shift | `1vZU1oWzn535bCSi1RB6PkM3AFX4K81UV7FL1Up_HbiNDBjok3Dgl_b2h` | `AKfycbzcn9X9...` |
| wakeup | jimaku-wakeup | `1MIR57i3IfsMlfePtoiEgeLLC6_Xg38WHMqI-u_X9s6tTuHTSdhVNnznR` | `AKfycbw0RTor...` |
| attendance | jimaku-attendance | `19AwaMh1ygUCrJ5ndci8zh0M-M60xY2zfJOeUMXJaSR3EZ2khrRWysuWZ` | `AKfycbzksKAP...` |
| trouble | jimaku-trouble | `1T6lVgeyrfzngSHEpZtGUv6aXk8zmxozRi5uPP9QdnXv_JKA742X4jJmZ` | `AKfycbz4Aa-v...` |
| admin | jimaku-setup | `1DBw2Pa1farG8HckxT6OvzYRgoKSmPYfjjfCMQ7dEkFJ_Q3-KOuZkfCXI` | `AKfycbyBqJqz...` |

実際の完全なURLは `js/config.js` を参照してください。

### LINE LIFF ID（`js/config.js`の`LIFF_ID`に対応）

| キー | LIFF ID |
|------|---------|
| shift | `2010288935-EetRFNLf` |
| wakeup | `2010288935-bwQd9Tmq` |
| attendance | `2010288935-CG4xMF6B` |
| trouble | `2010288935-b0khjSws` |

### clasp設定（ローカル開発用）

```
gas/.clasp.json → jimaku-shift プロジェクトに接続（デフォルト）
gas/.claspignore → 現在: attendance.gs, setup.gs, trouble.gs, wakeup.gs を除外（shift のみ）
```

各プロジェクトに個別デプロイする方法は [セクション8](#8-コードを変更してデプロイする手順) を参照。

---

## 3. アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  スタッフ端末（LINEアプリ）                                │
│                                                          │
│  LINEリッチメニュー → LIFF内でWebページを開く              │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│  GitHub Pages（静的HTML/CSS/JS）                          │
│  https://pcube-inc.github.io/jimaku-system/              │
│                                                          │
│  ・index.html       ← メニュー                            │
│  ・shift/index.html ← シフト管理                          │
│  ・wakeup/index.html← 起床確認                            │
│  ・attendance/      ← 出退勤                              │
│  ・trouble/         ← トラブル報告                         │
│  ・admin/           ← 管理者設定                          │
│  ・js/config.js     ← GAS URL・LIFF IDを管理              │
│  ・js/liff-helper.js← LINEユーザー照合の共通処理           │
└──────────┬───────────────────────────────┬──────────────┘
           │ GET: JSONP                     │ POST: no-cors + FormData
           │ (?callback=xxx)                │ (fetch API)
┌──────────▼───────────────────────────────▼──────────────┐
│  Google Apps Script（バックエンド API × 5）               │
│                                                          │
│  shift.gs     → doGet/doPost → シフト希望・確定・LINE連携  │
│  wakeup.gs    → doGet/doPost → 起床確認・自動トリガー      │
│  attendance.gs→ doGet/doPost → 出退勤記録・メール送信      │
│  trouble.gs   → doGet/doPost → 緊急報告・メール送信        │
│  setup.gs     → doGet/doPost → 管理者設定・シート初期化    │
└──────────────────────────┬──────────────────────────────┘
                           │ SpreadsheetApp API
┌──────────────────────────▼──────────────────────────────┐
│  Googleスプレッドシート（データベース）                     │
│                                                          │
│  スタッフ一覧 / シフト希望 / シフト確定                    │
│  起床確認 / 出退勤記録 / トラブル記録 / 管理者設定          │
└─────────────────────────────────────────────────────────┘
           │ MailApp.sendEmail()
┌──────────▼──────────────┐
│  Gmail（メール通知）      │
│  admin_email / cc_emails │
└─────────────────────────┘
           │ LINE Messaging API
┌──────────▼──────────────┐
│  LINE Broadcast/Push     │
│  （シフト確定通知・起床  │
│  リマインダー）          │
└─────────────────────────┘
```

### データフローの詳細

**GETリクエスト（JSONP）**
```
フロント → <script src="GAS_URL?action=xxx&callback=cb_123"> → タグ追加
GAS → cb_123({success:true, data:{...}}) → JSとして実行
フロント → window["cb_123"] が呼ばれてデータ取得
```

**POSTリクエスト（no-cors）**
```
フロント → fetch(GAS_URL, {method:"POST", mode:"no-cors", body: FormData})
GAS → e.parameter.action でルーティング → スプレッドシート更新 → メール送信
※ no-corsのためレスポンスは読めない → 3秒後にコールバック呼び出し（楽観的更新）
```

---

## 4. ファイル構成

```
jimaku-system/
├── index.html              # トップページ（4機能へのナビゲーション）
├── css/
│   └── common.css          # 全ページ共通CSS（カラー変数・カード・フォームUI）
├── js/
│   ├── config.js           # ★設定ファイル（GAS URL / LIFF ID / スプレッドシートID）
│   └── liff-helper.js      # LIFF初期化・LINE IDでスタッフ照合・未登録時の自動登録
├── shift/
│   └── index.html          # シフト管理（希望提出・確定シフト表示・自分のシフト）
├── wakeup/
│   └── index.html          # 起床確認（重複防止・期限チェック・状態表示）
├── attendance/
│   └── index.html          # 出退勤連絡（出勤/退勤ボタン → メール通知）
├── trouble/
│   └── index.html          # トラブル報告（第一報→第二報の2段階）
├── admin/
│   └── index.html          # 管理者設定（パスワード保護・スタッフ管理・通知設定）
└── gas/
    ├── shift.gs            # シフトGAS（希望受付・確定・LINE連携・カレンダーシート生成）
    ├── wakeup.gs           # 起床GAS（確認記録・自動リマインダー・未確認通知）
    ├── attendance.gs       # 出退勤GAS（記録・テンプレートメール送信）
    ├── trouble.gs          # トラブルGAS（第一報/第二報記録・緊急メール）
    ├── setup.gs            # 管理者GAS（設定読み書き・スタッフCRUD・シート初期化）
    ├── appsscript.json     # GASマニフェスト（タイムゾーン: Asia/Tokyo, V8ランタイム）
    ├── .clasp.json         # claspの接続先（現在: jimaku-shift）
    └── .claspignore        # clasp pushの除外ファイル（現在: shift.gsのみ対象）
```

---

## 5. スプレッドシートのデータ構造

スプレッドシートID: `1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY`

### スタッフ一覧シート

| A: line_user_id | B: LINE表示名 | C: 登録名 | D: メールアドレス | E: 有効フラグ |
|----------------|-------------|---------|----------------|-------------|
| U1234abc... | 田中 太郎 | 田中 | tanaka@example.com | TRUE |

- **A列**: LINEアプリから初回アクセス時に自動セットされる
- **C列（登録名）**: アプリ内で表示される名前。空の場合はB列（LINE表示名）を使用
- **E列**: FALSE にするとシステムから除外される（退職者など）

### シフト希望シート

| A: 送信日時 | B: スタッフ名 | C: 日付 | D: 希望区分 |
|-----------|------------|--------|-----------|
| 2026-06-01 10:00 | 田中 | 2026-06-15 | ok |

- **希望区分**: `ok`（出勤可） / `maybe`（応相談） / `ng`（出勤不可）
- 同じスタッフ・同じ月で再送信すると既存行が削除されて上書き

### シフト確定シート

| A: 日付 | B: スタッフ名 | C: 業務種別 | D: 確定フラグ |
|--------|------------|-----------|------------|
| 2026-06-15 | 田中 | 字幕 | TRUE |

- 管理者が「シフト確定」ページから登録する
- 起床確認・出退勤は「シフト確定」に名前があるかを参照する

### 起床確認シート

| A: 日付 | B: スタッフ名 | C: 押下日時 | D: 期限時刻 | E: 通知済フラグ |
|--------|------------|----------|-----------|--------------|
| 2026-06-15 | 田中 | 2026-06-15 07:32 | 08:00 | FALSE |

- C列が空 + E列がTRUEの行 → 未確認（`checkUnconfirmed()`が追記）
- C列に値あり → 確認済み（`submitWakeup()`が追記）

### 出退勤記録シート

| A: スタッフ名 | B: 出勤日時 | C: 退勤日時 |
|------------|----------|----------|
| 田中 | 2026-06-15 09:00 | 2026-06-15 18:00 |

### トラブル記録シート

| A: スタッフ名 | B: 第一報日時 | C: 第二報日時 | D: 詳細内容 |
|------------|-----------|-----------|-----------|
| 田中 | 2026-06-15 14:00 | 2026-06-15 14:05 | 字幕が表示されない |

### 管理者設定シート

| A: 設定キー | B: 設定値 |
|-----------|--------|
| admin_email | admin@example.com |
| cc_emails | cc1@example.com,cc2@example.com |
| wakeup_reminder_time | 07:00 |
| wakeup_deadline | 08:00 |
| shift_days | 1,2,4,5 |
| line_channel_token | （LINEチャネルアクセストークン） |
| admin_password | （任意のパスワード） |
| wakeup_admin_email | （起床確認専用の通知先メール） |
| wakeup_cc_emails | （起床確認専用のCC） |
| template_attendance_in | 【出勤】{name}さん {time} |
| template_attendance_out | 【退勤】{name}さん {time} |
| template_wakeup | {name}さん、{deadline}までに起床確認を押してください。 |
| template_wakeup_unconfirmed | {name}さんの起床確認が押されていません |

> `{name}` `{time}` `{deadline}` はテンプレート変数（自動置換される）

---

## 6. GAS各プロジェクトの役割と主要関数

### shift.gs（jimaku-shift）

| 関数 | 種別 | 説明 |
|------|------|------|
| `doGet()` | GET | action=getStaff / getStaffByLineId / getMyShift / getConfirmedShift / getShiftRequests / getSettings |
| `doPost()` | POST | action=submitShift / confirmShift / registerLineId / sendLineMessage / createCalendarSheet |
| `submitShift()` | POST | 希望シフト受付（月単位で既存削除→再挿入） |
| `confirmShift()` | POST | シフト確定（月単位で上書き） |
| `registerLineId()` | POST | LINEアカウントとスタッフの紐付け自動登録 |
| `createCalendarSheet()` | POST | 「Shift」テンプレートシートからカレンダー形式のシートを生成 |
| `sendDailyMessage()` | trigger | 当日シフトをLINEで全体通知（要手動トリガー設定） |

### wakeup.gs（jimaku-wakeup）

| 関数 | 種別 | 説明 |
|------|------|------|
| `checkTodayShift()` | GET | 本日シフト有無・押下済み時刻・期限時刻を返す |
| `submitWakeup()` | POST | 起床確認を記録（重複チェックあり） |
| `sendWakeupReminder()` | trigger（自動） | 当日シフトのスタッフ全員にLINEプッシュ通知 |
| `checkUnconfirmed()` | trigger（自動） | 期限を過ぎても未確認のスタッフを管理者にメール通知 |
| `setupTriggers()` | 手動実行のみ | 初回トリガー設定（以降は自己再スケジュール） |

> **重要**: `setupTriggers()` はシステム構築時と、管理者設定で時刻を変更した時に1回実行する必要があります。

### attendance.gs（jimaku-attendance）

| 関数 | 種別 | 説明 |
|------|------|------|
| `submitAttendance()` | POST | 出勤(type=in)/退勤(type=out)を記録し、テンプレートでメール送信 |
| `applyTemplate()` | 内部 | `{name}` `{time}` を実際の値に置換 |

### trouble.gs（jimaku-trouble）

| 関数 | 種別 | 説明 |
|------|------|------|
| `submitTrouble1st()` | POST | 第一報を記録・緊急メール送信 |
| `submitTrouble2nd()` | POST | 第二報（詳細）を同じ行に追記・詳細メール送信 |

### setup.gs（jimaku-setup）

| 関数 | 種別 | 説明 |
|------|------|------|
| `getSettings()` | GET | 管理者設定キー全件取得 |
| `getStaffList()` | GET | スタッフ一覧（全フィールド）取得 |
| `checkPassword()` | GET | 管理者パスワード照合 |
| `updateSettings()` | POST | 設定キー更新（セル書式を@テキストに強制して日付変換を防ぐ） |
| `addStaff() / updateStaff() / deleteStaff()` | POST | スタッフCRUD |
| `setupSheets()` | 手動実行のみ | スプレッドシートに7シートを初期作成（初回のみ） |

---

## 7. 別PCへの引き継ぎ手順

### 必要なもの

- Node.js（`node --version` で確認、なければ https://nodejs.org/ からインストール）
- npmまたはnpx
- Gitクライアント
- Googleアカウント `id.pcube@gmail.com`（clasp認証用）
- `okuda@pcube.co.jp`（GASプロジェクトオーナー）へのアクセス

### 手順

#### 1. リポジトリをクローン

```bash
git clone https://github.com/pcube-inc/jimaku-system.git
cd jimaku-system
```

#### 2. claspをインストール

```bash
npm install -g @google/clasp
# または npx で都度使う（インストール不要）
```

#### 3. clasp認証

```bash
cd gas
npx clasp login
# ブラウザが開く → id.pcube@gmail.com でログイン → 権限を許可
```

#### 4. Apps Script APIを有効化（初回のみ）

ブラウザで以下を開き「Google Apps Script API」をオンにする：
```
https://script.google.com/home/usersettings
```
※ id.pcube@gmail.com でログインした状態で行うこと

#### 5. コードをGASにデプロイ

セクション8「コードを変更してデプロイする手順」を参照。

#### 6. フロントエンドをGitHubにプッシュ

```bash
git add .
git commit -m "update"
git push origin main
```
GitHubへのプッシュ後、数分でGitHub Pagesに反映される。

---

## 8. コードを変更してデプロイする手順

GASプロジェクトは5つ独立しているため、各プロジェクトに個別にデプロイする必要があります。
`gas/` フォルダ内でコマンドを実行します。

### 5プロジェクトへのデプロイ（全更新の場合）

以下のコマンドを順番に実行します。各ブロックは独立したコマンドです。

```bash
cd gas

# === 1. shift（jimaku-shift） ===
# .clasp.json と .claspignore を設定
echo '{"scriptId":"1vZU1oWzn535bCSi1RB6PkM3AFX4K81UV7FL1Up_HbiNDBjok3Dgl_b2h","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\ntrouble.gs\nwakeup.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbzcn9X9AvO5rHGeOOwnyj1Ctb_V7asir_yAXsNP5iBUw5QQESxq1BVQDLnDZBKs27vc" --description "update"

# === 2. wakeup（jimaku-wakeup） ===
echo '{"scriptId":"1MIR57i3IfsMlfePtoiEgeLLC6_Xg38WHMqI-u_X9s6tTuHTSdhVNnznR","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\nshift.gs\ntrouble.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbw0RTorEoVI1mwkKE2UN7Fah1lwUBS2t87jZZT-XkA3vyDchWlGMK6w3R0i6xnizdI0" --description "update"

# === 3. setup（jimaku-setup） ===
echo '{"scriptId":"1DBw2Pa1farG8HckxT6OvzYRgoKSmPYfjjfCMQ7dEkFJ_Q3-KOuZkfCXI","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nshift.gs\ntrouble.gs\nwakeup.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbyBqJqzx4Vzkit1R8t_puzNrOiumFigk4x2QOkrYTgM9YddnBux2TlacPCRg0xDwPih" --description "update"

# === 4. trouble（jimaku-trouble） ===
echo '{"scriptId":"1T6lVgeyrfzngSHEpZtGUv6aXk8zmxozRi5uPP9QdnXv_JKA742X4jJmZ","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\nshift.gs\nwakeup.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbz4Aa-vI7mgMj8PEfvo6_ZqTe0BPqzK1FudrBv3RsiMtC-dIwHf2u9KShG55xs5cFT9" --description "update"

# === 5. attendance（jimaku-attendance） ===
echo '{"scriptId":"19AwaMh1ygUCrJ5ndci8zh0M-M60xY2zfJOeUMXJaSR3EZ2khrRWysuWZ","rootDir":"."}' > .clasp.json
printf 'setup.gs\nshift.gs\ntrouble.gs\nwakeup.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbzksKAP49RjeMyXShitN1YzF_8dDLWhyJXIe2elGyjJyvjCkfWgtn6Cbms9bq88Az_Htw" --description "update"

# === 元のデフォルト（shift）に戻す ===
echo '{"scriptId":"1vZU1oWzn535bCSi1RB6PkM3AFX4K81UV7FL1Up_HbiNDBjok3Dgl_b2h","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\ntrouble.gs\nwakeup.gs\n' > .claspignore
```

### 1つだけ更新する場合の例（wakeupのみ）

```bash
cd gas
echo '{"scriptId":"1MIR57i3IfsMlfePtoiEgeLLC6_Xg38WHMqI-u_X9s6tTuHTSdhVNnznR","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\nshift.gs\ntrouble.gs\n' > .claspignore
npx clasp push --force
npx clasp deploy -i "AKfycbw0RTorEoVI1mwkKE2UN7Fah1lwUBS2t87jZZT-XkA3vyDchWlGMK6w3R0i6xnizdI0" --description "fix: xxx"
# 元に戻す
echo '{"scriptId":"1vZU1oWzn535bCSi1RB6PkM3AFX4K81UV7FL1Up_HbiNDBjok3Dgl_b2h","rootDir":"."}' > .clasp.json
printf 'attendance.gs\nsetup.gs\ntrouble.gs\nwakeup.gs\n' > .claspignore
```

### 注意事項

- `clasp push` はコードをGASに送信するだけ。本番URLには反映されない
- `clasp deploy -i <既存のデプロイID>` で既存URLを維持したまま新バージョンを反映する
- デプロイIDが不明な場合: `npx clasp deployments` で一覧確認
- 新しいデプロイIDが作成されると `js/config.js` のURLも変更が必要

---

## 9. ゼロから再構築する手順

スプレッドシートやGASプロジェクトを一から作り直す場合の手順です。

### ステップ1: Googleスプレッドシートを作成

1. [Google Drive](https://drive.google.com/) → 「新規」→「Googleスプレッドシート」
2. スプレッドシート名を任意で設定（例: `業務連絡システム`）
3. URLの `/d/` と `/edit` の間の文字列を **スプレッドシートID** としてメモ

### ステップ2: GASプロジェクトを5つ作成しデプロイ

1. [script.google.com](https://script.google.com/) → 「新しいプロジェクト」を5回繰り返す
2. 各プロジェクトの名前: `jimaku-shift` / `jimaku-wakeup` / `jimaku-attendance` / `jimaku-trouble` / `jimaku-setup`
3. エディタの内容を全削除し、`gas/` フォルダの対応する `.gs` ファイルを貼り付ける
4. コード先頭の `SPREADSHEET_ID = '...'` を自分のIDに書き換えて保存
5. 各プロジェクトでWebアプリとしてデプロイ:
   - 「デプロイ」→「新しいデプロイ」
   - 種類：「ウェブアプリ」
   - 次のユーザーとして実行：**「自分」**
   - アクセスできるユーザー：**「全員」**
   - 「デプロイ」→ 表示されるURLをメモ

### ステップ3: スプレッドシートのシートを初期化

jimaku-setup プロジェクトで:
1. 関数選択で `setupSheets` を選ぶ
2. 「実行」→ 7つのシートが自動作成される

### ステップ4: フロントエンドをGitHubに公開

1. GitHubでパブリックリポジトリを作成（例: `jimaku-system`）
2. `js/config.js` を以下の値に書き換え:
   ```javascript
   const GAS_URL = {
     shift:      '【jimaku-shift のデプロイURL】',
     wakeup:     '【jimaku-wakeup のデプロイURL】',
     attendance: '【jimaku-attendance のデプロイURL】',
     trouble:    '【jimaku-trouble のデプロイURL】',
     admin:      '【jimaku-setup のデプロイURL】',
   };
   const SPREADSHEET_ID = '【ステップ1のID】';
   const LIFF_ID = { shift:'', wakeup:'', attendance:'', trouble:'' }; // 後で設定
   ```
3. 全ファイルをリポジトリにプッシュ
4. Settings → Pages → `main`ブランチ / `/(root)` で GitHub Pages を有効化
5. 公開URLが発行される: `https://【ユーザー名】.github.io/jimaku-system/`

### ステップ5: LIFFを4つ設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. Messaging APIチャネルがなければ作成する
3. チャネル → 「LIFF」タブ → 「追加」を4回:

| 名前 | エンドポイントURL | サイズ |
|------|----------------|-------|
| jimaku-shift | `https://【ドメイン】/jimaku-system/shift/` | Full |
| jimaku-wakeup | `https://【ドメイン】/jimaku-system/wakeup/` | Full |
| jimaku-attendance | `https://【ドメイン】/jimaku-system/attendance/` | Full |
| jimaku-trouble | `https://【ドメイン】/jimaku-system/trouble/` | Full |

4. 各LIFFのIDを `js/config.js` の `LIFF_ID` に記入してGitHubにプッシュ

### ステップ6: 管理者設定の初期設定

1. `https://【ドメイン】/jimaku-system/` を開く
2. 「管理者設定」→ パスワード: `admin1234`（初期値）でログイン
3. 以下を設定して保存:
   - `admin_email`: 管理者のメールアドレス
   - `cc_emails`: CCメール（複数は`,`区切り）
   - `wakeup_reminder_time`: 起床リマインダー時刻（例: `07:00`）
   - `wakeup_deadline`: 起床確認の期限時刻（例: `08:00`）
   - `line_channel_token`: LINEのチャネルアクセストークン
   - `admin_password`: 任意のパスワードに変更

### ステップ7: 起床確認トリガーの起動（jimaku-wakeupのみ）

GASエディタ (jimaku-wakeup) で:
1. 関数ドロップダウンで `setupTriggers` を選択
2. 「実行」→ ログに「トリガー設定完了」と表示されれば成功
3. 以降は毎日自動実行（手動操作不要）

---

## 10. 管理者設定キー一覧

管理者設定シートの全設定キーと説明です。

| キー | 説明 | 例 |
|------|------|-----|
| `admin_email` | 出退勤・トラブル報告の通知先 | `admin@example.com` |
| `cc_emails` | 出退勤・トラブル報告のCC（複数は`,`区切り） | `cc@example.com` |
| `wakeup_admin_email` | 起床確認通知の送信先（未設定時は`admin_email`が使われる） | `wakeup@example.com` |
| `wakeup_cc_emails` | 起床確認のCC（未設定時は`cc_emails`が使われる） | |
| `wakeup_reminder_time` | 起床リマインダーをLINEで送る時刻 | `07:00` |
| `wakeup_deadline` | 起床確認の期限時刻 | `08:00` |
| `shift_days` | シフト希望を提出できる曜日（0=日,1=月,...） | `1,2,4,5` |
| `line_channel_token` | LINE Messaging APIのチャネルアクセストークン | |
| `admin_password` | 管理者ページのパスワード | `admin1234`（要変更） |
| `template_attendance_in` | 出勤メールの件名テンプレート（`{name}` `{time}` 使用可） | `【出勤】{name}さん {time}` |
| `template_attendance_out` | 退勤メールの件名テンプレート | `【退勤】{name}さん {time}` |
| `template_wakeup` | 起床リマインダーのLINEメッセージ（`{name}` `{deadline}` 使用可） | `{name}さん、{deadline}までに押してください` |
| `template_wakeup_unconfirmed` | 未確認通知のメール本文（`{name}` `{deadline}` 使用可） | `{name}さんが未確認です` |

---

## 11. トラブルシューティング

### GASの変更が反映されない

`clasp push` しただけでは本番URLに反映されません。必ず `clasp deploy -i <デプロイID>` も実行してください。

### 「No credentials found」エラー

```bash
cd gas
npx clasp login
```
を実行してOAuth認証を行ってください。

### 「User has not enabled the Apps Script API」エラー

https://script.google.com/home/usersettings を開き、「Google Apps Script API」をオンにしてください。

### 「Project contents must include a manifest file」エラー

`gas/appsscript.json` が存在しない場合に発生します。以下の内容でファイルを作成してください:
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

### 管理者設定で日付が1日前にずれる

`setup.gs` の `updateSettings()` で `cell.setNumberFormat('@')` が適用されているか確認してください（現在は修正済み）。
GASが日付文字列を自動的にDateオブジェクトに変換するのを防ぐためのものです。

### 起床確認のトリガーが動かない

jimaku-wakeup の GASエディタで `setupTriggers` 関数を手動実行してください。
管理者設定で `wakeup_reminder_time` や `wakeup_deadline` を変更した場合も再実行が必要です。

### LIFFが動かない / LINE外では動く

- LIFFの「公開設定」が公開状態になっているか確認
- LIFFのエンドポイントURLが正しいか確認（末尾に `/` が必要）
- テスト中の場合はテストユーザーとして自分を追加

### メールが届かない

- `admin_email` が正しく設定されているか管理者設定で確認
- GASの `MailApp.sendEmail()` は無料Gmailアカウントで1日100通の上限あり
- GASのログを確認: GASエディタ → 「実行数」タブ

### スプレッドシートに「シートが見つかりません」エラー

jimaku-setup の GASエディタで `setupSheets` 関数を手動実行してください。

### JSONP通信が失敗する（GASのGETが呼ばれない）

GASのデプロイ設定を確認:
- 「次のユーザーとして実行」→「自分」
- 「アクセスできるユーザー」→「全員」

---

## 付録: clasp デプロイIDクイックリファレンス

| プロジェクト | scriptId（先頭20文字） | デプロイID（先頭20文字） |
|------------|---------------------|---------------------|
| jimaku-shift | `1vZU1oWzn535bCSi1R...` | `AKfycbzcn9X9AvO5rH...` |
| jimaku-wakeup | `1MIR57i3IfsMlfeP...` | `AKfycbw0RTorEoVI1m...` |
| jimaku-setup | `1DBw2Pa1farG8HckxT...` | `AKfycbyBqJqzx4Vzki...` |
| jimaku-trouble | `1T6lVgeyrfzngSHEp...` | `AKfycbz4Aa-vI7mgMj...` |
| jimaku-attendance | `19AwaMh1ygUCrJ5nd...` | `AKfycbzksKAP49RjeM...` |

完全なIDは `js/config.js`（デプロイURL）および `gas/.clasp.json`（scriptId）を参照してください。
