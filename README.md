# 解体業向け日報 Web アプリ

React + Vite + TypeScript + Supabase で構成した、単一会社向けの日報アプリです。  
スマホでの日報入力を優先しつつ、PC では一覧確認、CSV 出力、マスタ管理をしやすい構成にしています。

## できること

- メールアドレス + パスワードでログイン
- 現場管理
- 日報の新規作成、編集、削除、詳細確認
- 日報一覧の月送り、期間絞り込み、現場絞り込み、記入者絞り込み
- CSV 出力
- 工事分類、作業員ラベル、作業員、リース関係、ゴミ処分、車両・運搬のマスタ管理
- マスターアカウントによるアカウント管理

## 権限

### 一般アカウント

- 日報を作成できます
- 自分が作成した日報だけ編集・削除できます
- 一覧確認、絞り込み、CSV 出力ができます
- 現場管理、マスタ管理ができます
- 作業員単価や原価集計は表示されません

### マスターアカウント

- 一般アカウントの機能をすべて使えます
- 全ユーザーの日報を編集・削除できます
- 作業員単価、小計、合計原価を確認できます
- アカウント管理画面を使えます
- 表示名、マスター権限、外注業社権限、表示順を編集できます

### 外注業社アカウント

- 日報入力時に記入者名を自由入力できます
- 記入者名は `会社名 + 名前` で入力する想定です
- ナビゲーションでは `日報` だけ表示します
- `現場` `マスタ` `設定` は表示しません

## 日報入力仕様

日報入力の主な項目は以下です。

- 記入者名
- 作業日
- 現場名
- 工事分類
- 勤務区分
- 契約区分
- 諸経費
- リース関係
- ゴミ処分
- 車両・運搬
- 作業員
- 上記以外の従業員
- 作業内容
- 備考
- 作業進行
- 写真

### 作業員入力のルール

- `大吾興業` を含む作業員ラベル
  - 個人チェックリストで入力
- `大吾興業` 以外の作業員ラベル
  - ラベルごとの人数プルダウンで入力
  - 最大 20 人

作業員は、作業員マスタに登録されていて、かつ作業員ラベルが付いているものだけ日報入力に反映されます。

### 単価の扱い

- 単価は作業員ラベルマスタで管理します
- 日報保存時に `daily_report_workers` / `daily_report_external_workers` へ単価スナップショットを保存します
- 単価改定後も、過去の日報は保存当時の単価で表示・CSV 出力されます

### 写真

- 写真本体は外部ストレージへ保存します
- Supabase には画像 URL のみ保存します
- ブラウザ仕様上、未アップロードのファイル選択状態は自動リロード後に復元できません

### 自動リロード時の復元

- 日報入力中のフォーム値は `sessionStorage` に下書き保存します
- 自動リロード後は内容とスクロール位置を復元します
- 保存成功時は下書きを削除します

## マスタ管理

現在のマスタは以下です。

- 工事分類
- リース関係
- ゴミ処分
- 車両・運搬
- 作業員ラベル
- 作業員

各マスタは並び替えに対応しています。

- PC: ドラッグ
- スマホ: 上下ボタン

削除は論理削除です。

- 今後の日報入力では選べなくなります
- 過去の日報データには残ります

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を作成

```bash
cp .env.example .env
```

3. `.env` に値を設定

最低限必要です。

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FILE_UPLOAD_URL=https://report.daigo-kogyo.com/api/uploads/report-photos/
VITE_REPORT_NOTIFICATION_URL=https://report.daigo-kogyo.com/api/notifications/report-created/
```

必要に応じて以下も設定します。

```env
VITE_FILE_DELETE_URL=https://report.daigo-kogyo.com/api/uploads/report-photos/delete/
VITE_FILE_API_TOKEN=your-api-token
```

4. Supabase SQL を実行

Supabase の SQL Editor で最新の [src/supabase.sql](/Users/yuma/Documents/develop/kaitai_daily_reports_daigo-kogyo/src/supabase.sql) を実行してください。  
既存環境に追加機能を反映する場合も、最新 SQL の再実行が必要です。

最近の重要な変更:

- `app_users.sort_order`
- `app_users.is_subcontractor`
- `daily_reports.reporter_name`
- `daily_report_external_workers`
- `daily_report_workers.label_snapshot`
- `daily_report_workers.unit_price_snapshot`

5. Supabase Auth を設定

- Email / Password を有効化
- 利用ユーザーを作成

6. 開発サーバー起動

```bash
npm run dev
```

## 自前サーバーでの公開設定

このプロジェクトは `https://report.daigo-kogyo.com/` で運用する前提です。

ビルド時の環境変数に以下を設定してください。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FILE_UPLOAD_URL`
- `VITE_FILE_DELETE_URL` 任意
- `VITE_FILE_API_TOKEN` 任意
- `VITE_REPORT_NOTIFICATION_URL` メール通知を使う場合は必須

`/login` や `/reports/...` へ直接アクセスした場合も `index.html` を返すように、Webサーバー側でSPA fallbackを設定してください。
Supabase Auth 側で Site URL や許可リダイレクトURLを設定する場合は `https://report.daigo-kogyo.com` を登録してください。

## 画面一覧

- `/login`
- `/reports`
- `/reports/new`
- `/reports/:id`
- `/sites`
- `/masters/work-categories`
- `/masters/lease-items`
- `/masters/disposal-items`
- `/masters/transport-items`
- `/masters/worker-labels`
- `/masters/workers`
- `/settings/profile`
- `/settings/users`

## アカウント運用

### マスターアカウント付与例

```sql
insert into public.app_users (user_id, is_master)
values ('AUTH_USERSのUUID', true)
on conflict (user_id)
do update set is_master = excluded.is_master;
```

### 外注業社アカウント付与例

```sql
insert into public.app_users (user_id, is_subcontractor)
values ('AUTH_USERSのUUID', true)
on conflict (user_id)
do update set is_subcontractor = excluded.is_subcontractor;
```

## 画像アップロード API 仕様

XSERVER などのPHPサーバーで使う場合は、以下をサーバーのドキュメントルートへ配置してください。

```text
server/xserver/api/uploads/report-photos/index.php
  -> https://report.daigo-kogyo.com/api/uploads/report-photos/

server/xserver/api/uploads/report-photos/delete/index.php
  -> https://report.daigo-kogyo.com/api/uploads/report-photos/delete/
```

アップロードされた画像は、サーバー上の `/uploads/report-photos/{reportId}/` に保存されます。
`uploads` ディレクトリはPHPから書き込み可能な権限にしてください。

### アップロード

- `POST VITE_FILE_UPLOAD_URL`
- `multipart/form-data`
- fields
  - `file`
  - `reportId`

レスポンス例:

```json
{ "url": "https://report.daigo-kogyo.com/uploads/report-photos/00000000-0000-0000-0000-000000000000/photo.webp" }
```

### 削除

- `POST VITE_FILE_DELETE_URL`
- `application/json`

リクエスト例:

```json
{ "url": "https://report.daigo-kogyo.com/reports/abc/photo-1.jpg" }
```

`VITE_FILE_API_TOKEN` を設定すると `Authorization: Bearer ...` を付けます。

## 日報送信通知 API

日報の新規送信後にメールへ通知する場合は、以下をサーバーへ配置してください。

```text
server/xserver/api/notifications/report-created/index.php
  -> https://report.daigo-kogyo.com/api/notifications/report-created/
```

同じディレクトリに `config.php` を作成します。  
雛形は `server/xserver/api/notifications/report-created/config.sample.php` です。

```text
server/xserver/api/notifications/report-created/config.php
```

設定する主な値:

- `supabase_url`
- `supabase_anon_key`
- `mail_to`: 通知を受け取る実在のメールアドレス
- `mail_from`: 送信元として使う実在のメールアドレス

通知APIは、アプリから送られるSupabaseのログインJWTを検証してから通知を送信します。
XSERVERで送信する場合は、`mail_from` に同サーバーで作成済みのメールアドレスを設定してください。
メールが届かない場合は、ブラウザのNetworkで通知APIのレスポンスを確認し、XSERVERのエラーログで `[report-created-notification]` を検索してください。

## 補足

- 画像 URL は `report_photos.image_path` に保存しています
- RLS は MVP として「ログイン済みユーザーのみ CRUD 可」を基本にしています
- 将来マルチテナント化する場合は、各テーブルに `company_id` を追加して RLS を組み直す前提です
- スマホ復帰時の安定性を優先して route lazy loading は使っていません

## 動作確認

主要確認コマンド:

```bash
npm run lint
npm run build
```

## 今後の拡張候補

- `company_id` 追加によるマルチテナント化
- PWA 化
- 画像圧縮
