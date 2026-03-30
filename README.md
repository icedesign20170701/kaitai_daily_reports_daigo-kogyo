# 解体業向け日報 Web アプリ MVP

React + Vite + TypeScript + Supabase + Tailwind CSS + shadcn/ui 風コンポーネントで構成した、単一会社向けの解体日報アプリです。スマホでの日報入力を優先しつつ、PC では日報一覧やマスタ管理をしやすい画面にしています。

## セットアップ

1. 依存関係をインストールします。

```bash
npm install
```

2. 環境変数を設定します。

```bash
cp .env.example .env
```

`.env` に Supabase の URL と anon key、および画像アップロード API の URL を設定してください。

3. Supabase の SQL エディタで [`src/supabase.sql`](/Users/yuma/Documents/develop/kaitai_daily_reports/src/supabase.sql) を実行します。

4. 自社サーバー側に画像アップロードAPIを用意します。

5. Supabase Auth で Email/Password を有効化し、利用ユーザーを作成します。

6. 開発サーバーを起動します。

```bash
npm run dev
```

## 画面構成

- `/login`
- `/reports`
- `/reports/new`
- `/reports/:id`
- `/sites`
- `/masters/work-items`
- `/masters/waste-items`
- `/masters/safety-items`
- `/masters/workers`
- `/masters/machines`
- `/masters/vehicles`
- `/masters/partners`

## 実装内容

- Supabase Auth によるメールアドレス + パスワード認証
- 現場 CRUD
- 日報の登録、詳細表示、編集
- 日報への作業員、重機、車両、協力会社の紐付け
- 写真の複数アップロードと一覧表示
- 日報一覧のフィルタと CSV 出力
- 作業項目、廃材項目、安全確認項目のマスタ管理
- 作業員、重機、車両、協力会社のマスタ管理
- 認証済みユーザーのみ CRUD を許可する簡易 RLS

## Supabase 側の補足

- 画像ファイル本体は自社サーバーなど外部ストレージへ保存し、Supabase の `report_photos.image_path` には画像URLだけを保存します。
- 将来マルチテナント化する際は、各テーブルに `company_id` を追加し、RLS を `auth.uid()` と `company_id` で絞り込んでください。

## 画像アップロードAPI仕様

フロントは以下の API を呼びます。

- `POST VITE_FILE_UPLOAD_URL`
  - `multipart/form-data`
  - fields:
    - `file`: 画像ファイル
    - `reportId`: 日報ID
  - response:
```json
{ "url": "https://files.example.com/reports/abc/photo-1.jpg" }
```

- `POST VITE_FILE_DELETE_URL` 任意
  - `application/json`
  - body:
```json
{ "url": "https://files.example.com/reports/abc/photo-1.jpg" }
```

`VITE_FILE_API_TOKEN` を入れると `Authorization: Bearer ...` を付けます。

## 今後の拡張

- `company_id` 追加によるマルチテナント化
- LINE 通知
- PWA 化
- 画像アップロード前の圧縮
