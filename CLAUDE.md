# P-CUBE 字幕システム（業務連絡システム）

---

## ⚡ Claude Codeへの自動指示

> このファイルはセッション開始時にClaude Codeが自動で読み込みます。以下の指示に従ってください。

**作業が完了したら、ユーザーから指示がなくてもこのCLAUDE.mdを自動更新すること。**  
具体的には：
- `## ✅ 進捗状況` のチェックボックスを最新状態に更新
- `## 📝 直前の作業内容` を今日の作業内容で上書き
- `## 📅 更新履歴` に1行追記
- 重要な仕様変更があれば `## 🔧 重要な仕様・決定事項` にも追記

---

## 📋 プロジェクト概要

- **目的**：P-CUBE（字幕部門）スタッフ向け業務連絡システム（シフト・起床確認・出退勤・トラブル報告・掲示板）
- **担当者**：okuda@pcube.co.jp
- **作業PC**：複数のPCで作業可能（Googleドライブで同期）
- **プロジェクトフォルダ**：`D:\Users\admin\Storage\Google Drive (okuda)\AI\Claude\projects\Jimaku System`
- **システム詳細**：`SYSTEM_OVERVIEW.md` を参照（GAS URL・LIFF ID・スプレッドシートID・デプロイ手順すべて記載）

---

## 🛠 技術スタック

- **フロントエンド**：静的HTML/CSS/JS → GitHub Pages (`https://pcube-inc.github.io/jimaku-system/`)
- **バックエンド**：Google Apps Script（GAS）× 6プロジェクト
- **データベース**：Googleスプレッドシート（ID: `1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY`）
- **LINE連携**：LIFF（LINE Front-end Framework）× 5
- **GAS操作**：clasp（ローカルからデプロイ）
- **CORS回避**：GET=JSONP / POST=fetch mode:no-cors + FormData

---

## ✅ 進捗状況

- [x] シフト管理（希望提出・確定・LINE通知）
- [x] 起床確認（自動リマインダー・未確認通知）
- [x] 出退勤連絡（メール通知）
- [x] トラブル報告（第一報・第二報）
- [x] 管理者設定（スタッフ管理・通知設定・定型文）
- [x] **出退勤ページ改修**（退勤後トラブル選択フロー追加）
- [x] **掲示板機能 実装**（board/index.html・gas/board.gs）
- [ ] **jimaku-board GASプロジェクトを新規作成・デプロイ**（未実施）
- [ ] **LINE LIFF に board を追加**（未実施）
- [ ] **js/config.js の board URL・LIFF ID を実際の値に書き換え**（プレースホルダーのまま）
- [ ] **jimaku-attendance を再デプロイ**（getSettings追加を本番反映）
- [ ] **管理者設定に emergency_phone を入力**（スプレッドシートに手動追加）
- [ ] **git push → GitHub Pages 反映**
- [ ] **リッチメニュー差し替え**（旧「トラブル対応」→「掲示板」、画像は依頼者側で用意）

---

## 🔧 重要な仕様・決定事項

### 出退勤ページの改修（2026-06-16）
- 「出退勤」「トラブル対応」のリッチメニューを**「出退勤」1つに統合**
- 退勤ボタン押下後、3択を表示：
  1. **なし** → そのまま完了
  2. **後ほど電話** → `emergency_phone`（管理者設定キー）を表示 + 電話リンク
  3. **メールで報告** → 発生時刻・場所・状況・対応の構造化フォーム → `trouble.gs` の `submitTrouble2nd` に POST
- 緊急連絡先は `attendance.gs` の `getSettings` アクション（新規追加）で取得
- `emergency_phone` キーを管理者設定に追加（`setup.gs` の `setupSheets()` 初期値に追記済み）

### 掲示板機能（2026-06-16 実装、デプロイ未実施）
- **場所**：`board/index.html`（新規）、`gas/board.gs`（新規）
- **LIFFページ**：旧「トラブル対応」の枠に配置
- **投稿4種**：📢 お知らせ / 🔄 申し送り / ⚠️ トラブル報告 / ✅ 業務完了
- **機能**：フィード表示・種別フィルター・確認リアクション（既読確認）・トラブル投稿時はLINEプッシュ通知
- **スプレッドシートシート**：「掲示板」（`setupBoardSheet()` を手動実行して作成）
  - 列構成：投稿ID / スタッフ名 / 種別 / 投稿日時 / 内容 / サブ内容 / 確認者リスト
- **技術**：GAS + スプレッドシート（既存構成踏襲。Next.js + Supabase は不採用）

### GASプロジェクト一覧（6プロジェクト）
| キー | プロジェクト名 | 状態 |
|------|-------------|------|
| shift | jimaku-shift | 稼働中 |
| wakeup | jimaku-wakeup | 稼働中 |
| attendance | jimaku-attendance | 要再デプロイ（getSettings追加） |
| trouble | jimaku-trouble | 稼働中 |
| admin | jimaku-setup | 稼働中 |
| board | jimaku-board | **未作成（新規作成が必要）** |

### clasp の .claspignore 注意
- 既存の5プロジェクトに `board.gs` が混入しないよう、`.claspignore` に `board.gs` を追加すること
- 各プロジェクトのデプロイコマンドは `SYSTEM_OVERVIEW.md` セクション8を参照

---

## 📝 直前の作業内容

- **最終作業日**：2026-06-16
- **作業PC**：D:\Users\admin\Storage\Google Drive (okuda)\AI\Claude\projects\Jimaku System
- **やったこと**：
  - 出退勤ページ改修（退勤後トラブル有無選択UI、電話カード、メール報告フォーム）
  - 掲示板ページ新規作成（board/index.html）
  - 掲示板GAS新規作成（gas/board.gs）
  - gas/attendance.gs に getSettings アクション追加（緊急連絡先取得用）
  - gas/setup.gs に emergency_phone の初期値追加
  - js/config.js に board のプレースホルダー追加
- **止まった箇所**：デプロイ手順の説明まで完了。実際のデプロイは未実施。
- **次にやること**：
  1. GASエディタで jimaku-board プロジェクト作成・board.gs 貼り付け・デプロイ
  2. setupBoardSheet() 手動実行
  3. LINE Developers で board 用 LIFF 追加
  4. js/config.js のプレースホルダーを実際のURL・LIFF IDに書き換え
  5. clasp で jimaku-attendance を再デプロイ
  6. git push
  7. 管理者設定で emergency_phone 入力
  8. リッチメニュー画像差し替え・URL変更

---

## ⚠️ 既知の問題・メモ

- `js/config.js` の `board:` はプレースホルダー（`【jimaku-board のデプロイURL】`）のまま。デプロイ後に実際のURLに書き換えること。
- `board/index.html` で `LIFF_ID.board` を参照しているため、上記プレースホルダーのままだとLIFF初期化が失敗する（LINE外では動作する）。
- `emergency_phone` がスプレッドシートの管理者設定シートに存在しない場合、電話カードには「未設定」と表示される（エラーにはならない）。
- 既存の `trouble/index.html` はリッチメニューから外れるが、ページ自体は残す（URLを直接知っている場合にアクセス可能）。

---

## 📅 更新履歴

| 日付 | 作業内容 | 担当PC |
|------|---------|--------|
| 2026-06-16 | 出退勤ページ改修・掲示板機能実装（コード完成、デプロイ未実施） | okuda PC |
