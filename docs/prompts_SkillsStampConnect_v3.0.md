# 実装プロンプト集
## SkillsStampConnect

| 項目 | 内容 |
|------|------|
| 対応 SDD | SDD_SkillsStampConnect_v1.md（v1.1、SkillsStampConnect v11.0 反映） |
| 作成日 | 2026-09-11 |
| バージョン | v3.0 |
| 最終更新日 | 2026-09-20（v3.0：㉞Step 12・Step 32（README）の `npx shadcn@2.3.0 init` について、「`components.json` が既存の場合は上書き確認が出てNを選ぶ」という記述が、実際の挙動（`components.json` が既存だと `Cannot read properties of undefined (reading 'resolvedPaths')` でクラッシュする。上書き確認自体が出ない）と食い違っていたため、ローカル動作確認で判明した正しい手順（`components.json` を一時退避→ゼロから `init`→対話質問（style: Default / base color: Slate / CSS variables: yes）に回答→生成内容を確認→退避ファイル削除→`add`）に全面的に書き換えた。v2.9：㉝Step 12・Step 32（README）の `npx shadcn@latest` を `npx shadcn@2.3.0` に固定した。`@latest` はCLIの内部仕様が大きく変わった場合（例：Tailwind v4・Base UI前提のCLI v4への移行）に、本プロジェクトが前提とするTailwind CSS 3.4.x・Radix UIベースの構成と食い違う結果を生む。v2.8 までの変更履歴はそのまま引き継ぐ。) |

| ステップ数 | 32（Step 1〜32。旧 Step 22 の欠番は既に解消済み。今回の振り直しで新 Step 12 を追加） |

### 前身プロジェクトからの引き継ぎについて

SkillsStampConnect は sticker-gallery を前身とする独立システムである。前身プロジェクトでは「v9.0（基盤・ギャラリー・管理画面）をリリースしてから、v10.0（学生機能）を追加し、その都度デプロイし直す」という順序で開発されたが、SkillsStampConnect は最初から v11.0 相当の完成形を1回のデプロイで届けるため、**デプロイ設定（Step 31）は全機能の実装が完了した後、最後の1ステップとして実施する**。Step 内の「（更新）」という表記は前身プロジェクトの開発順序を踏襲した歴史的な注記であり、SkillsStampConnect 自体の開発ではファイルを最初から新規作成する（実施時点では該当ファイルは存在しないため、実質的にすべて新規作成となる）。

> **例外：`db/schema.sql`・`db/migrate.js`**（Step 2・Step 4 で作成済み）
> この2ファイルは上記の原則が適用できない。他のファイルと異なり Step 2・4 の時点で既に作成済みであり、旧設計ではこれを ALTER TABLE で「後から更新する」設計になっていたが、これは「ファイルは最初から新規作成する」という本プロジェクトの原則と矛盾する。そのため、`users` の学生向け拡張列・`student_profiles`・`student_achievements` の2テーブル・関連インデックスは、最初から Step 2（`db/schema.sql`）・Step 4（`db/migrate.js`）に組み込む。

Step 21〜30 は SkillsStampConnect v11.0 で新設した QRコード外部公開機能（`student_profiles.external_public`・固定URL `GET /api/public/profile/:loginId`）を含む学生機能拡張に対応する。前身プロジェクトの v10.0 で設計されていたキオスクモード（`kiosk_tokens`・`X-Kiosk-Token` 認証・`KioskTokenEditor`）は、この機能に統合されて廃止されたため使用しない（→ SDD Appendix E: ADR-032）。

### 使い方

1. **Step 順に実施する**。各ステップは前ステップの成果物に依存している。
2. 各ステップ冒頭の「**前提条件**」を確認してから実行する。
3. 「**SDD 参照**」で詳細な仕様を確認できる。
4. 各ステップは 1 ファイル（または密結合の 2〜3 ファイル）を対象とする。
5. **デプロイ設定（Step 31）は最後に実施する**。Step 1〜30 が全て完了するまでは着手しない。

---

## プロジェクト基盤（Step 1〜5）

### Step 1 — プロジェクト設定ファイル群

**対象ファイル**  
`package.json` / `vite.config.ts` / `.env.example` / `.gitignore`

**前提条件**  
Node.js 24 LTS がインストール済み

**SDD 参照**  
§3.1 技術スタック / §10.2 環境変数一覧 / §10.4 package.json 主要依存

---

以下の仕様で4つのファイルを生成してください。

`package.json`:
- `"type": "module"`（ESM 統一）
- `"engines": { "node": ">=24.0.0" }`
- scripts: `dev`（concurrently で nodemon server.js と **vite**（引数なし）を同時起動）/ `build`（**vite build**（引数なし））/ `start`（node server.js）/ `migrate`（node db/migrate.js）
- dependencies: `express ^4.x` / `@fastify/busboy ^3.x` / `helmet ^8.x` / `express-rate-limit ^7.x` / `dotenv ^16.x`
- devDependencies: `vite ^5.x` / `@vitejs/plugin-react ^4.x` / `react ^18.x` / `react-dom ^18.x` / `typescript ^5.x` / `@types/react ^18.x` / `@types/react-dom ^18.x` / `@types/node ^20.x` / `tailwindcss ^3.4.x` / `autoprefixer ^10.x` / `postcss ^8.x` / `class-variance-authority ^0.7.x` / `clsx ^2.x` / `tailwind-merge ^2.x` / `lucide-react ^0.x` / `concurrently ^8.x` / `nodemon ^3.x`

`vite.config.ts`:
- `root: path.resolve(__dirname, 'client')`
- `build.outDir: path.resolve(__dirname, 'client/dist')`
- `server.host: 'localhost'`（esbuild 脆弱性の緩和）
- `server.port`: `.env` の `VITE_PORT`（デフォルト: 5173）を `loadEnv` で読み込む
- `resolve.alias: { '@': path.resolve(__dirname, './client/src') }`
- `/api` と `/uploads` を `.env` の `PORT`・`SERVER_HOST` から組み立てたターゲットへプロキシ
- `loadEnv(mode, process.cwd(), '')` で `.env` を読み込む（`defineConfig(({ mode }) => {...})` 形式）

**⚠️ 重要：Vite 設定ファイルの配置**
- `postcss.config.js` と `tailwind.config.ts` はプロジェクトルートと **`client/` の両方**に配置する
- `client/tailwind.config.ts` の `content` パスは `client/` 基準にする: `'./index.html'`, `'./src/**/*.{ts,tsx}'`
- `globals.css` は `client/src/globals.css` に配置する（プロジェクトルートではない）
- `utils.ts` は `client/src/lib/utils.ts` に配置する（プロジェクトルートではない）

`.env.example`:
以下の変数をコメント付きで定義する。
```
APP_ENV=development
PORT=3000
DB_PATH=./db/stickers.db
UPLOAD_DIR=./uploads
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=28800
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=changeme
LATEST_CURRICULUM_YEAR=2025
# Vite 開発サーバーのポート番号
VITE_PORT=5173
# Vite プロキシのバックエンドホスト名
SERVER_HOST=localhost
# フロントエンド側カリキュラム年度バッジ判定用
VITE_LATEST_CURRICULUM_YEAR=2025
```

`.gitignore`:
`.env` / `node_modules/` / `db/stickers.db` / `uploads/` / `client/dist/` を除外

---

### Step 2 — データベーススキーマ

**対象ファイル**  
`db/schema.sql`

**前提条件**  
Step 1 完了

**SDD 参照**  
§4.1 ER 図 / §4.2〜4.5 各テーブル定義 / §4.6 インデックス / §4.8 users テーブル拡張 / §4.9 student_profiles / §4.10 student_achievements / §4.12 インデックス追加

**⚠️ 重要：v11.0 の学生機能を含む完全な形で最初から作成する**

前身プロジェクトの sticker-gallery では「v9.0 の6テーブル構成」→「v10.0 で ALTER TABLE により学生機能を追記」という順序で開発されたが、SkillsStampConnect は独立した新規システムであり、既存データの後方互換を維持する必要がない。そのため、**学生機能拡張を ALTER TABLE で後から追記する設計にはしない**。`db/schema.sql` は本ステップの時点で v11.0 相当の完全な8テーブル構成として一度に作成する（旧 Step 22 の内容はここに統合済み）。

---

以下の仕様で `db/schema.sql` を生成してください。

冒頭で以下の PRAGMA を設定する：
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

**テーブル定義（順序厳守、全 8 テーブル）**

1. `schema_migrations`（マイグレーション管理）
2. `users`（id PK / username UNIQUE（職員のログインID、学生は NULL 可） / **login_id TEXT UNIQUE**（学生のログインID、CSVインポート時に自動発行） / password_hash / **role CHECK('admin','user','student')** / display_name / **affiliation TEXT** / **position TEXT** / **graduation_year INTEGER** / **contact_email TEXT** / **email_public INTEGER NOT NULL DEFAULT 0** / **must_change_password INTEGER NOT NULL DEFAULT 0** / **status TEXT NOT NULL DEFAULT 'active'** / created_at / updated_at）
3. `categories`（id PK / name / name_en / area_code NOT NULL / emoji DEFAULT '📌' / color DEFAULT '#2563EB' / image_key / description / target_roles TEXT DEFAULT '[]' / recruit_message / sort_order / created_at / updated_at）
4. `stickers`（id PK / primary_category_id FK→categories.id / created_by FK→users.id ON DELETE SET NULL / name / name_en / type CHECK('practical','lecture') / color / emoji / image_key / description / skills TEXT DEFAULT '[]' / level CHECK('実践','知識') / version DEFAULT 'v01' / sort_order / created_at / updated_at）
5. `sticker_categories`（sticker_id FK→stickers ON DELETE CASCADE / category_id FK→categories ON DELETE CASCADE / sort_order / PRIMARY KEY(sticker_id, category_id)）
6. `courses`（id PK / sticker_id FK→stickers ON DELETE CASCADE / name / code / type CHECK('practical','lecture') / hours / curriculum_year NOT NULL / content_note / sort_order）
7. **`student_profiles`**（user_id PK/FK→users.id ON DELETE CASCADE / avatar_image_key / x_handle / linkedin_url / other_skills / goal / bio / **external_public INTEGER NOT NULL DEFAULT 0**（ログイン不要の外部公開＝QRコード・固定URL経由への同意。`kiosk_public` という列名は使わない） / updated_at）
8. **`student_achievements`**（id PK / student_id FK→users.id ON DELETE CASCADE / sticker_id FK→stickers.id ON DELETE CASCADE / acquired_date / is_visible INTEGER NOT NULL DEFAULT 0 / recorded_by FK→users.id ON DELETE SET NULL / notes / created_at）

> **`kiosk_tokens` テーブルは作成しない**。SkillsStampConnect v11.0 では就職説明会・オンラインイベントでの学生閲覧を `student_profiles.external_public` ＋固定URL（`GET /api/public/profile/:loginId`）に一本化しており、イベント単位のトークンを管理する仕組み自体を持たない（→ SDD Appendix E: ADR-032）。

**インデックス（全 10 件）**：
`idx_stickers_primary_cat` / `idx_stickers_created_by` / `idx_sticker_cats_sticker` / `idx_sticker_cats_cat` / `idx_courses_sticker` / `idx_courses_year` / `idx_users_login_id` / `idx_achievements_student` / `idx_achievements_sticker` / `idx_achievements_visible`

---

### Step 3 — 初期データ

**対象ファイル**  
`db/seed.sql`

**前提条件**  
Step 2 完了

**SDD 参照**  
§4.2〜4.5 テーブル定義 / §4.7 スタンプ ID 命名規則

---

以下の仕様で `db/seed.sql` を生成してください。

すべての INSERT に `INSERT OR IGNORE` を使用し、重複実行に対して冪等にする。

**categories（4件）**

| id | name | area_code | emoji | color |
|----|------|-----------|-------|-------|
| cat-webdev | Webアプリ開発 | WEB | 🌐 | #2563EB |
| cat-ai | AI・データサイエンス | AI | 🤖 | #059669 |
| cat-ux | UX・プロダクトデザイン | UX | 🎨 | #DB2777 |
| cat-pm | プロジェクト・ビジネス | PM | 📋 | #DC2626 |

各カテゴリーに `target_roles`（JSON配列）・`recruit_message`・`description` を設定すること（実際の業務文脈に沿った内容）。

**stickers（各カテゴリー 1 件ずつ、計 4 件）**

| id | primary_category_id | type | emoji |
|----|---------------------|------|-------|
| NSS-WEB-K001v01 | cat-webdev | practical | ⚙️ |
| NSS-AI-K001v01 | cat-ai | practical | 🧠 |
| NSS-UX-K001v01 | cat-ux | practical | ✏️ |
| NSS-PM-K001v01 | cat-pm | practical | 📌 |

各スタンプに `description`（Can-Do 記述）・`skills`（JSON配列、3〜5件）・`level`（実践）を設定すること。

**sticker_categories（各スタンプを primary_category_id のカテゴリーに紐づけ）**

4行: (NSS-WEB-K001v01, cat-webdev) / (NSS-AI-K001v01, cat-ai) / (NSS-UX-K001v01, cat-ux) / (NSS-PM-K001v01, cat-pm)

**courses（各スタンプに curriculum_year=2025 の授業 1 件）**

各授業に `name` / `code` / `type` / `hours` / `content_note` を設定すること。

---

### Step 4 — マイグレーションスクリプト

**対象ファイル**  
`db/migrate.js`

**前提条件**  
Step 2・3 完了

**SDD 参照**  
§6.1 SQLite / §10.2 INITIAL_ADMIN_* 環境変数

---

以下の仕様で `db/migrate.js` を生成してください。

- ESM 形式（`import { DatabaseSync } from 'node:sqlite'` 等）
- `dotenv/config` を import して `.env` を読み込む
- `schema_migrations` テーブルで適用済みチェック → 未適用のみ実行（冪等性保証）
- マイグレーション定義：`001_schema`（db/schema.sql）→ `002_seed`（db/seed.sql）の順に適用
- 初回起動時の admin ユーザー作成：`schema_migrations` に `003_init_admin` がない場合のみ、`users` テーブルにレコードを挿入する
  - `INITIAL_ADMIN_USERNAME`（デフォルト: `admin`）/ `INITIAL_ADMIN_PASSWORD`（デフォルト: `changeme`）を使用
  - パスワードは Node.js 24 の `node:crypto` の `scrypt` でハッシュ化する（`{salt}:{hash}` 形式）
  - id には `node:crypto` の `randomUUID()` を使用
  - role は `'admin'`
- 各ステップの結果をコンソールに出力する（✅ 適用完了 / ⏭ スキップ（適用済み））

> **注記**：`db/schema.sql`（Step 2）が最初から v11.0 の完全な8テーブル構成（`role CHECK('admin','user','student')` を含む）で作成されるため、`001_schema` の適用だけで学生機能分のテーブル・列も揃う。旧 Step 22 で想定していた「`users` テーブルを再構築する `004_add_student_role` マイグレーション」は不要であり、本ステップでは作成しない。

---

### Step 5 — ライブラリ層（database.js / imageStore.js）

**対象ファイル**  
`lib/database.js` / `lib/imageStore.js`

**前提条件**  
Step 1 完了

**SDD 参照**  
§6.1 SQLite / §6.2 ファイルシステム / §3.3.4 パストラバーサル対策

---

**`lib/database.js`**  
- `import { DatabaseSync } from 'node:sqlite'`（npm 不要）
- `DB_PATH` は `process.env.DB_PATH ?? './db/stickers.db'`
- `PRAGMA journal_mode = WAL` と `PRAGMA foreign_keys = ON` を設定
- シングルトンとして `export default db`

**`lib/imageStore.js`**  
以下の 3 関数を export する。

`saveImage(file, prefix)` → `{ key, url }`:
- `file` は `{ path: string, mimetype: string }` 形式のオブジェクト（`@fastify/busboy` で受信後に構築する）
- MIME→拡張子マッピング: `image/jpeg`→`.jpg` / `image/png`→`.png` / `image/webp`→`.webp` / `image/gif`→`.gif`
- ファイル名: `${randomUUID()}${ext}`（ユーザー指定名は一切使わない）
- 保存先: `uploads/{prefix}/{uuid}.{ext}`
- `fs/promises` の `mkdir({ recursive: true })` + `rename` で一時ファイルを移動

`deleteImage(key)` → void:
- **パストラバーサル防止**：`path.resolve(UPLOAD_DIR, key)` が `UPLOAD_DIR + path.sep` で始まることを検証。違反は Error を throw
- `unlink` で削除。ファイルが存在しない場合は無視（try/catch）

`imageUrl(key)` → string | null:
- key が null/undefined なら null を返す
- `/uploads/${key}` を返す（同一オリジンのため絶対 URL 不要）

---

## バックエンド API（Step 6〜10）

### Step 6 — 認証ライブラリと認証ルート

**対象ファイル**  
`lib/auth.js` / `routes/authRoutes.js`

**前提条件**  
Step 4・5 完了（users テーブルと database.js が存在）

**SDD 参照**  
§7.2 POST /api/auth/login / §7.3 認可ミドルウェアの実装 / Appendix E ADR-016

---

**`lib/auth.js`**  
`node:crypto` のみを使用し、外部ライブラリ不要で以下を実装する。

パスワード関連（export）:
- `hashPassword(password: string) → Promise<string>`：scrypt で `{salt}:{hash}` 形式を返す
  - salt: `randomBytes(16).toString('hex')`
  - hash: `scrypt(password, salt, 64)`（promisify して使用）
- `verifyPassword(password: string, stored: string) → Promise<boolean>`：`timingSafeEqual` でタイミング攻撃を防ぐ

JWT 関連（export）:
- `signToken(payload: object) → string`：HS256 署名。`JWT_SECRET` / `JWT_EXPIRES_IN` を使用
  - ペイロード: `{ ...payload, iat, exp }`
  - 形式: `{base64url(header)}.{base64url(payload)}.{base64url(sig)}`
- `verifyToken(token: string) → object`：署名検証 + 有効期限チェック。失敗は Error を throw

ミドルウェア（export）:
- `authenticate(req, res, next)`：`Authorization: Bearer {token}` ヘッダーから JWT を検証し `req.user` をセット
- `requireAdmin(req, res, next)`：`req.user.role !== 'admin'` なら 403
- `requireOwnerOrAdmin(createdBy)(req, res, next)`：`admin` または `req.user.sub === createdBy` でなければ 403。`createdBy` が null の場合は admin のみ許可

**`routes/authRoutes.js`**  
`POST /api/auth/login` を実装する:
- リクエスト: `{ username, password }`。いずれか欠損で 400
- `users` テーブルを `username = ? OR login_id = ?`（同じ値を両方に bind）で検索する
- 存在しない場合は 401（timing attack 対策として必ずパスワード検証を試みる）
- `verifyPassword` で照合。失敗なら 401
- `status === 'suspended'` の場合は 401（停止中の学生アカウントを拒否する。パスワード照合自体は行った後にこのチェックを行う）
- `signToken({ sub: user.id, username: user.username, role: user.role })` で JWT を生成
- レスポンス: `{ token, user: { id, username, displayName, role, mustChangePassword: Boolean(user.must_change_password) } }`（password_hash は含めない）

---

### Step 7 — カテゴリー API

**対象ファイル**  
`routes/categories.js`

**前提条件**  
Step 5・6 完了

**SDD 参照**  
§7.1 エンドポイント一覧 / §7.5 GET /api/categories レスポンス例 / §4.3 categories テーブル / §4.8 camelCase 変換表

---

以下の仕様で `routes/categories.js` を実装してください。

DB→API の変換（snake_case → camelCase）を routes 層で一括して行う。`imageUrl(row.image_key)` で URL を組み立てる。

**GET /api/categories**（認証不要）:
- `LEFT JOIN stickers ON stickers.primary_category_id = c.id` でスタンプ件数を集計
- `sort_order ASC, created_at ASC` でソート
- レスポンスに `stickerCount` を含める
- `target_roles` は `JSON.parse` してから返す

**POST /api/categories**（`authenticate + requireAdmin`）:
- 必須: `id`（英数字・ハイフンのみ 50 文字以下）、`name`、`areaCode`
- `area_code` は一意制約エラー時に 409 を返す
- `target_roles` は `JSON.stringify` して保存

**PUT /api/categories/:id**（`authenticate + requireAdmin`）:
- 存在確認 → 404
- `area_code` の変更は禁止（現在値を上書きしない）。変更しようとした場合は 400 を返す
- `updated_at = datetime('now')` を更新

**DELETE /api/categories/:id**（`authenticate + requireAdmin`）:
- `stickers.primary_category_id = id` のスタンプが存在する場合は **409**（`error: '配下のスタンプの主カテゴリーを変更してから再試行してください'`）
- 存在確認 → 404

---

### Step 8 — スタンプ API

**対象ファイル**  
`routes/stickers.js`

**前提条件**  
Step 6・7 完了

**SDD 参照**  
§7.6 GET /api/stickers レスポンス例 / §7.7 POST/PUT リクエストボディ / §4.4 stickers テーブル / §4.4b sticker_categories テーブル

---

以下の仕様で `routes/stickers.js` を実装してください。

**GET /api/stickers**（認証不要）:
- `stickers` と `courses` を `sticker_id` で JOIN して取得
- 各スタンプに `categories` 配列（`sticker_categories` + `categories` を JOIN して全所属カテゴリーを取得）を追加
  - 形式: `[{ id, name, areaCode, color }]`
- `createdBy`: `created_by` が NULL → `null`。存在する場合は `users` から `{ id, displayName }` を取得
- `courses` は `curriculum_year DESC, sort_order ASC` でソート
- `skills` / 各カテゴリー情報の JSON.parse を忘れずに行う

**POST /api/stickers**（`authenticate`）:
- 必須バリデーション: `id`（スタンプ ID 形式）/ `primaryCategoryId` / `categoryIds`（1件以上）/ `name` / `type`
- `categoryIds` に `primaryCategoryId` が含まれていなければ 400
- `created_by = req.user.sub` を自動設定
- トランザクション内で:
  1. `stickers` に INSERT
  2. `sticker_categories` に `categoryIds` 分だけ INSERT
  3. `courses` に INSERT（courses 配列が空でも可）

**PUT /api/stickers/:id**（`authenticate`、`requireOwnerOrAdmin(created_by)`）:
- 対象スタンプの `created_by` を取得 → `requireOwnerOrAdmin` に渡す
- バリデーションは POST と同様
- トランザクション内で洗い替え:
  1. `DELETE FROM sticker_categories WHERE sticker_id = ?`
  2. `sticker_categories` を再 INSERT
  3. `DELETE FROM courses WHERE sticker_id = ?`
  4. `courses` を再 INSERT
  5. `UPDATE stickers SET ... WHERE id = ?`

**DELETE /api/stickers/:id**（`authenticate`、`requireOwnerOrAdmin(created_by)`）:
- courses は `ON DELETE CASCADE` で自動削除、sticker_categories も CASCADE
- 存在確認 → 404

---

### Step 9 — ユーザー API とアップロード API

**対象ファイル**  
`routes/users.js` / `routes/upload.js`

**前提条件**  
Step 5・6 完了

**SDD 参照**  
§7.1 エンドポイント一覧 / §7.4 GET /api/users レスポンス例 / §7.5 POST /api/upload / §3.3.5 ファイルアップロード検証

---

**`routes/users.js`**（全エンドポイントに `authenticate + requireAdmin`）

GET /api/users:
- `sticker_count` を LEFT JOIN でカウントして返す
- `password_hash` をレスポンスに含めない

POST /api/users:
- 必須: `username`（3〜50文字）/ `password` / `role`（'admin' | 'user'）
- `username` 重複は 409
- `hashPassword` でハッシュ化して保存

PUT /api/users/:id:
- `password` が空欄またはなければハッシュを変更しない
- 自分自身の `role` 変更は 400

DELETE /api/users/:id:
- 自分自身の削除は 400（`error: '自分自身は削除できません'`）

**`routes/upload.js`**

POST /api/upload（`authenticate`）:
- `@fastify/busboy` を使用した multipart 受信（multer は使用しない）
- `@fastify/busboy` の `file` イベントシグネチャは旧式形式: `(fieldname, stream, filename, encoding, mimeType)`
  - `info` オブジェクト形式ではないことに注意
- MIME タイプが正しく取得できない場合はファイル名拡張子からもフォールバック判定する
- `limits.fileSize: 5 * 1024 * 1024`（5MB）
- 許可 MIME: `image/jpeg` / `image/png` / `image/webp` / `image/gif`
- `prefix` パラメータ: `'stickers'` または `'categories'` のみ許可（デフォルト: `'stickers'`）
- 一時ファイルを `UPLOAD_DIR/tmp/` に書き込み、`saveImage(file, prefix)` を呼び出して `{ key, url }` を返す

DELETE /api/image/:key(\*)（`authenticate`）:
- `req.params[0]` から key を取得
- `deleteImage(key)` を呼び出す（パストラバーサル検証は `imageStore.js` 内で行う）

---

### Step 10 — Express サーバー本体

**対象ファイル**  
`server.js`

**前提条件**  
Step 5・6〜9 完了

**SDD 参照**  
§3.3 セキュリティアーキテクチャ / §3.4 システム構成図 / §10.5 起動手順

---

以下の仕様で `server.js` を実装してください。

**設定順序（重要）**:
1. `dotenv/config` の import
2. `helmet` を最初に適用（CSP 設定を含む）
3. `express.json()` と `express.urlencoded()`
4. CORS 設定（§3.3.8 参照。`APP_ENV === 'development'` の場合のみ `localhost:5173` を許可）
5. レート制限（ログイン API のみ: 15分間に10回まで）
6. ルーターのマウント:
   - `POST /api/auth/login` に `loginLimiter` を適用してから `authRoutes`
   - `/api/categories` → `categories`
   - `/api/stickers` → `stickers`
   - `/api/users` → `users`
   - `/api/upload` と `/api/image` → `upload`
7. `express.static(UPLOAD_DIR)` を `/uploads` にマウント（`UPLOAD_DIR` 起動時に作成）
8. SPA フォールバック: `client/dist/index.html` を返す（開発環境では不要）
9. グローバルエラーハンドラー（§3.3.9 参照。`APP_ENV !== 'development'` では `err.message` をクライアントに返さない）

**起動処理**:
- `UPLOAD_DIR` が存在しなければ `fs.mkdirSync` で作成
- `app.listen(PORT)` でサーバー起動

---

## フロントエンド ギャラリービュー（Step 11〜16）

### Step 11 — TypeScript・Tailwind・shadcn/ui セットアップ

**対象ファイル**  
`tsconfig.json` / `tsconfig.node.json` / `tailwind.config.ts` / `postcss.config.js` / `components.json` / `vite.config.ts` / `client/src/globals.css` / `client/src/lib/utils.ts` / `client/src/vite-env.d.ts`

**前提条件**  
Step 1 完了（package.json・npm install 済み）

**SDD 参照**  
§3.1 技術スタック / §8.6 globals.css の構成

---

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": { "@/*": ["./client/src/*"] }
  },
  "include": ["client/src"]
}
```

**`tsconfig.node.json`**:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**`tailwind.config.ts`**:
- `content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"]`
- `darkMode: ["class"]`
- `theme.extend` に shadcn/ui の CSS 変数ベースカラー（`background`, `foreground`, `primary`, `border`, `radius` 等）を定義

**`postcss.config.js`**:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

**`components.json`**（shadcn/ui 設定）:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" }
}
```

**`vite.config.ts`**:
- `root: 'client'` / `build.outDir: '../client/dist'`
- `resolve.alias: { '@': path.resolve(__dirname, './client/src') }`
- `/api` を `http://localhost:3000` へプロキシ

**`client/src/globals.css`**（§8.6 の内容を実装）:
- `@tailwind base/components/utilities`
- shadcn/ui の CSS 変数テーマ定義
- `body { font-family: 'Noto Sans JP', sans-serif; }`

**`client/src/lib/utils.ts`**:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

**`client/src/vite-env.d.ts`**:
```ts
/// <reference types="vite/client" />
```

---

### Step 12 — shadcn/ui の初期化とコンポーネントの追加

**対象ファイル**
なし（CLI コマンドのみ。ファイル生成は行わない）

**前提条件**
Step 11 完了（`tsconfig.json`〜`vite-env.d.ts` の9ファイル・`npm install` 済み）

**SDD 参照**
§3.1 技術スタック

---

以下を必ずこの順序で実施する:

1. Step 11 で生成した9ファイル（`components.json`・`tailwind.config.ts` を含む）が既に存在することを確認する
2. `components.json` を一時的に退避する（`npx shadcn@2.3.0 init` は、`components.json` が既に存在すると `Cannot read properties of undefined (reading 'resolvedPaths')` というエラーで停止する。上書き確認は出ない）：
```bash
mv components.json components.json.bak
```
3. 以下を実行する：
```bash
npx shadcn@2.3.0 init
```
4. 対話形式の質問に、以下の通り回答する（矢印キーで選択し `Enter` で確定）：
   - `Which style would you like to use?` → **`Default`**（`New York` ではない）
   - `Which color would you like to use as the base color?` → **`Slate`**
   - `Would you like to use CSS variables for theming?` → **`yes`**
5. `Success! Project initialization completed.` と表示されたら、生成された `components.json` の中身を確認する：
```bash
cat components.json
```
   `style: "default"`・`tailwind.config: "tailwind.config.ts"`・`tailwind.css: "client/src/globals.css"`・`baseColor: "slate"`・`cssVariables: true`・`aliases.components: "@/components"`・`aliases.utils: "@/lib/utils"` になっていることを確認する。`prefix`・`aliases.ui`・`aliases.lib`・`aliases.hooks`・`iconLibrary` といった項目が追加で入っている場合があるが、これは新しいスキーマの標準項目であり問題ない
6. 退避したバックアップを削除する：
```bash
rm components.json.bak
```
7. 以下でコンポーネントを追加する：
```bash
npx shadcn@2.3.0 add button card dialog badge input label select textarea checkbox alert scroll-area switch alert-dialog
```
→ `client/src/components/ui/` に各コンポーネントが生成される

---

### Step 13 — エントリーポイントと App.tsx

**対象ファイル**  
`client/index.html` / `client/src/main.tsx` / `client/src/App.tsx` / `client/src/types.ts`

**前提条件**  
Step 11 完了。バックエンドが起動済みで API が応答すること

**SDD 参照**  
§3.4 コンポーネントツリー / §3.4.3 状態管理の所在

---

**`client/index.html`**:
- `<script type="module" src="/src/main.tsx">`
- Noto Sans JP を Google Fonts から読み込む

**`client/src/main.tsx`**:
```tsx
import './globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

**`client/src/types.ts`**:  
Appendix B の型定義のうち、v9.0 時点（学生機能を除く）のものを実装する：`Category`・`Sticker`・`Course`・`StickerCategory`・`User`・`UserRole`・`StickerType`・`StickerLevel`。あわせて、`POST /api/auth/login` のレスポンス（`{ token, user }`）から組み立てるログイン中ユーザー用の型 `CurrentUser`（`{ token: string; id: string; username: string; displayName?: string; role: UserRole }`）をここで定義する（`CurrentUser` は Appendix B には存在しないクライアント側専用の型である）。

**`client/src/App.tsx`**:  
上記の `types.ts` から必要な型（`Category`・`Sticker`・`CurrentUser`）を import する。

管理する state（型付き）:
```tsx
const [cats, setCats] = useState<Category[]>([])
const [stks, setStks] = useState<Sticker[]>([])
const [view, setView] = useState<'gallery' | 'admin'>('gallery')
const [search, setSearch] = useState('')
const [catModal, setCatModal] = useState<Category | null>(null)
const [stkModal, setStkModal] = useState<Sticker | null>(null)
const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
```

データフェッチ・`authFetch`・検索フィルタリング・ビュー切り替えは v7.x と同様のロジックで実装する（§3.4.3 参照）。

**`authFetch` 実装上の注意**:
- `FormData` を `body` に渡す場合は `Content-Type` を設定しない（ブラウザが `multipart/form-data; boundary=...` を自動付与する）
- `init.body instanceof FormData` で判定し、`FormData` の場合は `Content-Type: application/json` を付与しない
- **`authFetch` という名前の関数そのものを、ファイルのトップレベル（`App` コンポーネントの外）で `export` すること。** `authFetch` はトークン（`currentUser.token`）を必要とするが、これはコンポーネントの state であり、モジュールトップレベルの関数から直接参照できない。そのため以下のパターンで実装する：
  ```tsx
  // モジュールスコープに現在のトークンを保持する変数を1つ置く
  let currentToken: string | null = null

  // authFetch 自体をトップレベルで export する（安定した1つの関数）
  export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {})
    const isFormData = init.body instanceof FormData
    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`)
    }
    return fetch(input, { ...init, headers })
  }

  export default function App() {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
    // currentUser が変わるたびにモジュール変数へ反映する
    useEffect(() => {
      currentToken = currentUser?.token ?? null
    }, [currentUser])
    // ...
  }
  ```
  この形にすることで、後続ステップのエディターコンポーネントは `import { authFetch } from '../App'`（または相対パス）と書くだけでそのまま使える。`createAuthFetch` のようなファクトリ関数を返す形にしてはならない（ファイル外から `authFetch` という名前で直接 `import` できなくなるため）。

**⚠️ 重要：この時点では画面描画（JSX）を実装しない**

`Navbar`・`CategoryCard`・`CategoryModal`・`StickerModal`・`LoginScreen`・`AdminPanel` 等の子コンポーネントは Step 14〜20 でこれから作られるため、このステップの時点ではまだ存在しない。

`App.tsx` の `return` は、存在しないコンポーネントへの `import` を書かず、以下のような最小限のプレースホルダーに留めること：

```tsx
return (
  <div className="p-4 text-sm text-muted-foreground">
    読み込み中... （UI は Step 20 で統合されます）
  </div>
)
```

state・`authFetch`・データフェッチ・検索フィルタリングのロジック自体はここで完成させてよい（`filteredCategories`・`filteredStickers` の算出まで含む）。ただし、それらを画面に描画する JSX は書かない。**代替の簡易 UI をインラインで作らないこと**（Step 20 で二度手間になり、`App.tsx` への書き込みが増える原因になるため）。

`App.tsx` への書き込みは、本ステップと Step 20・Step 30・Step 31 の合計 4 回に固定する。子コンポーネントが 1 つ完成するたびに `App.tsx` を書き換えることはしない。

---

### Step 14 — 共通コンポーネントと Navbar

**対象ファイル**  
`client/src/components/Navbar.tsx` / `client/src/components/common/StickerIcon.tsx` / `client/src/components/common/YearBadge.tsx`

**前提条件**  
Step 13 完了

**SDD 参照**  
§8.1 ナビゲーションバー / §8.5 カリキュラム年度バッジ

---

`client/src/types.ts` は Step 13 で Appendix B の型（`Category`・`Sticker`・`Course`・`StickerCategory`・`User`・`CurrentUser`・`UserRole`・`StickerType`・`StickerLevel`）を含めて作成済みのため、本ステップでの追加作業はない。

**`Navbar.tsx`**  
props: `{ view, search, currentUser, onChangeView, onSearch, onLogout }`

shadcn/ui・Tailwind で実装。Bootstrap Navbar は使わない。
- `sticky top-0 z-50 bg-background border-b` のヘッダー
- **`container mx-auto` は使用しない**。`flex flex-wrap` でモバイル（320px）対応する
- 各要素に `shrink-0` を付与してつぶれを防止
- 左端: ブランド「🏷️ スキルスタンプ」（`font-semibold`）
- ビュー切り替え: `Button variant="ghost"` で active 状態を `cn()` で制御
- ギャラリービューのみ: `Input type="search"` プレースホルダー「スタンプ・授業名…」（`flex-1 min-w-[120px]`）
- ログイン時: 表示名 + ロール `Badge`（admin: `bg-red-100 text-red-800` / user: `bg-violet-100 text-violet-800`）+ `Button variant="outline" size="sm"` ログアウト

**`StickerIcon.tsx`**  
props: `{ imageUrl?: string | null, emoji: string, color: string, size?: number }`

- `imageUrl` があれば `<img>` を `rounded-full object-cover` で表示
- なければ emoji を `rounded-full` の div に表示（背景: `style={{ background: \`\${color}22\` }}`）
- `style={{ width: size, height: size }}` でサイズ指定

**`YearBadge.tsx`**  
props: `{ year: number, isLatest: boolean }`

§8.5 の仕様通り shadcn/ui `Badge` で実装する:
- 最新: `<Badge className="bg-slate-900 text-slate-50 rounded-full">{year} ★</Badge>`
- 旧: `<Badge variant="outline" className="text-muted-foreground rounded-full">{year}</Badge>`

---

### Step 15 — CategoryCard と SkillChip

**新規作成するディレクトリ**
`client/src/components/gallery/`（本ステップで初めて必要になる）

**対象ファイル**  
`client/src/components/gallery/CategoryCard.tsx` / `client/src/components/gallery/SkillChip.tsx` / `client/src/lib/stickerTypeLabels.ts`

**前提条件**  
Step 14 完了

**SDD 参照**  
§5.1 ギャラリービュー / §8.3 カテゴリーカードの視覚設計 / §8.4 スタンプ種別バッジ

---

**`client/src/lib/stickerTypeLabels.ts`**（種別バッジの共通定義。SDD §8.4 準拠）:
- `STICKER_TYPE_BADGE_CLASS: Record<Sticker['type'], string>`：`practical` → `bg-yellow-50 text-yellow-800 border border-yellow-200` / `lecture` → `bg-slate-100 text-slate-600 border border-slate-200`
- `STICKER_TYPE_LABEL: Record<Sticker['type'], string>`：`practical` → `'実習'` / `lecture` → `'講義'`
- `SkillChip.tsx`（本ステップ）・`StickerModal.tsx`（Step 16）の両方がこのファイルから import する。定義を複製しない。

**`CategoryCard.tsx`**  
props: `{ cat, stickers, onCatClick, onStickerClick }`

`stickers` には全スタンプが渡される（CategoryCard 内で `cat.id` でフィルタする）。多対多のため、以下の表示ルールを適用する:
- `s.primaryCategoryId === cat.id` のスタンプ → 通常表示
- `s.primaryCategoryId !== cat.id` かつ `s.categories.some(c => c.id === cat.id)` のスタンプ → `opacity: 0.55` で関連表示

**ヘッダー部**:
- 背景: `linear-gradient(135deg, ${color}, ${color}cc)`
- 右上・右下に装飾円を配置する。`absolute -right-4 -top-6 h-24 w-24 rounded-full bg-white/10` のような Tailwind ユーティリティを直接組み合わせて実装する（名前付き CSS クラスは使わない）
- `StickerIcon`（size=40）/ カテゴリー名・英語名 / description
- `targetRoles` を shadcn/ui `<Badge variant="secondary">` で表示
- 実習 N 件・講義 N 件を `<Badge variant="outline" className="border-white/30 bg-white/20 text-white">` で表示

**スタンプチップ部**:
- `flex-wrap` で横並び
- 各スタンプを `SkillChip` に渡す

**`SkillChip.tsx`**  
props: `{ sticker, onClick, faded = false }`

- `faded` が true の場合は `style={{ opacity: 0.55 }}`、ボーダーなし
- `faded` が false の場合はテーマカラーのボーダー
- 内部: `StickerIcon`（size=28）/ スタンプ名 / スタンプ ID（`text-muted-foreground text-xs`）/ 種別バッジ（`stickerTypeLabels.ts` の `STICKER_TYPE_BADGE_CLASS`・`STICKER_TYPE_LABEL` を使用）
- ホバー効果は `hover:shadow-md transition-shadow` を Tailwind ユーティリティとして直接付与する（名前付き CSS クラスは使わない）

---

### Step 16 — CategoryModal と StickerModal

**対象ファイル**  
`client/src/components/gallery/CategoryModal.tsx` / `client/src/components/gallery/StickerModal.tsx`

**前提条件**  
Step 14・15 完了

**SDD 参照**  
§5.2 カテゴリー詳細モーダル / §5.3 スタンプ詳細モーダル / §8.2 shadcn/ui コンポーネント対応表

---

モーダルは shadcn/ui の `Dialog` コンポーネントを使用する。ポータル・フォーカストラップ・ESC 閉鎖はすべて Radix UI が自動処理する。

種別バッジの定義（`STICKER_TYPE_BADGE_CLASS`・`STICKER_TYPE_LABEL`）は Step 15 で作成した `client/src/lib/stickerTypeLabels.ts` を import して使う。`StickerModal.tsx` 内で重複定義しない。

**`CategoryModal.tsx`**  
props: `{ cat, stickers, onClose, onStickerClick }`

セクション構成:
1. ヘッダー: テーマカラー背景 / StickerIcon / カテゴリー名・英語名 / targetRoles バッジ
2. 採用担当者向けメッセージ: `<Alert>` + Tailwind `bg-amber-50 border-amber-200 text-amber-900`（`recruitMessage` が null の場合は非表示）
3. スタンプ一覧: `button` + Tailwind `flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent` でクリック可能。クリックで `onStickerClick` を呼び出す

**`StickerModal.tsx`**  
props: `{ sticker, cat, onClose }`

セクション構成:
1. パンくず: `{cat.name} › {sticker.name}`（小文字・グレー）
2. ヘッダー: テーマカラー薄グラデーション背景 / StickerIcon / スタンプ名 / 種別バッジ / ID / level
3. Can-Do 記述: `bg-muted rounded-md p-3` + `style={{ borderLeft: \`3px solid ${color}\` }}`
4. 習得スキル: `<Badge variant="outline">` + `style={{ background: \`${color}15\`, borderColor: \`${color}44\`, color }}`
5. 関連授業（年度別）:
   - `curriculum_year` でグループ化して年度降順に表示
   - 各グループに `<YearBadge>` を表示（`LATEST_CURRICULUM_YEAR` との比較で `isLatest` を決定）
   - 最新年度: 実線ボーダー / 旧年度: Tailwind `border-dashed opacity-85`

---

## フロントエンド 管理画面（Step 17〜20）

### Step 17 — LoginScreen

**新規作成するディレクトリ**
`client/src/components/admin/`（本ステップで初めて必要になる）

**対象ファイル**  
`client/src/components/admin/LoginScreen.tsx`

**前提条件**  
Step 12 完了（shadcn/ui の `Button`・`Input`・`Label`・`Alert` が生成済みであること）

**SDD 参照**  
§9.1 認証（LoginScreen）

---

props: `{ onLogin(token, user) }`

- フォーム: `Label` + `Input` を縦積みで username / password フィールドを実装
- 送信時に `POST /api/auth/login` を呼び出す
- 成功: `localStorage.setItem('auth_token', token)` と `localStorage.setItem('auth_user', JSON.stringify(user))` の後に `onLogin(token, user)` を呼び出す
- 失敗: エラーメッセージを `<Alert>` + Tailwind `bg-red-50 border-red-200 text-red-800` で表示
- ログイン中は `<Button disabled>` に Tailwind `animate-spin` のスピナーを表示

---

### Step 18 — AdminPanel

**対象ファイル**  
`client/src/components/admin/AdminPanel.tsx`

**前提条件**  
Step 17 完了。CategoryEditor / StickerEditor / UserEditor の型シグネチャを理解した上で実装すること（後続ステップで実装する）

**SDD 参照**  
§9.2 ロール別操作権限マトリクス / §9.3 AdminPanel レイアウト / §9.7 CRUD 操作と API 呼び出し

---

props: `{ categories, stickers, currentUser, authFetch, loadData }`（`authFetch` の型は `import type { authFetch as authFetchType } from '../../App'` の上で `authFetch: typeof authFetchType` とする）

**内部 state**: `activeTab`（'stickers' | 'categories' | 'users'）/ `selected`（選択中エンティティ）/ `users`（ユーザー一覧）

**レイアウト**: `flex h-screen` で左ペイン 340px（`w-[340px] shrink-0 border-r`）+ 右ペイン（`flex-1 overflow-auto`）

**タブ**:
- 🗂 カテゴリー: `currentUser.role === 'admin'` の場合のみ表示
- 🏷 スタンプ: 常に表示
- 👥 ユーザー管理: `currentUser.role === 'admin'` の場合のみ表示

**API 呼び出しをここに集約する（§3.4.1 の ADR 設計原則）**:

スタンプ一覧の表示: `createdBy.displayName` を表示。自分のスタンプに「あなた」バッジ。他者のスタンプを選択した場合は `canEdit = false` を Editor に渡す。

CRUD ハンドラ（`authFetch` を使用）:
- `handleSaveSticker(data)`: POST または PUT → 成功後 `loadData()` を呼び出して一覧を再取得
- `handleDeleteSticker(id)`: DELETE → 成功後 `loadData()` を呼び出して一覧を再取得
- `handleSaveCategory(data)`: POST または PUT（admin のみ）→ 成功後 `loadData()` を呼び出す
- `handleDeleteCategory(id)`: DELETE（admin のみ）、409 の場合は `Alert` でメッセージ表示。成功時は `loadData()` を呼び出す
- `handleSaveUser(data)`: POST または PUT（admin のみ）。ユーザー一覧は `categories`・`stickers` とは別の state（`users`）で管理するため、成功後は本コンポーネント内で `GET /api/users` を再取得する（`loadData` の対象外）
- `handleDeleteUser(id)`: DELETE（admin のみ）。成功後は同様に `GET /api/users` を再取得する

> **⚠️ 実装上の注意**：Step 18 では CategoryEditor / StickerEditor / UserEditor の import とコメントアウト解除を**Step 19・20 完了後に行う**。Step 18 単体の実装時点ではコメントアウトしたままにしておくこと。Step 19・20 が完了した段階で AdminPanel の該当箇所のコメントを外す。コメントアウトを解除する際、`CategoryEditor`・`StickerEditor`へは本ステップで `AdminPanel` が受け取っている `authFetch` をそのまま props として渡す（`<CategoryEditor ... authFetch={authFetch} />` のように。`UserEditor` は画像アップロードを行わないため `authFetch` を渡さない）。

---

### Step 19 — CategoryEditor と UserEditor

**対象ファイル**  
`client/src/components/admin/CategoryEditor.tsx` / `client/src/components/admin/UserEditor.tsx`

**前提条件**  
Step 18 完了

**SDD 参照**  
§9.4 CategoryEditor フォーム項目 / §9.6 UserEditor フォーム項目

---

**`CategoryEditor.tsx`**  
props: `{ cat, onSave, onDelete, onClose, authFetch }`（`authFetch` の型は Step 18 と同様 `import type { authFetch as authFetchType } from '../../App'` の上で `authFetch: typeof authFetchType` とする。画像アップロード（`POST /api/upload?prefix=categories`）に使用する）（cat が null の場合は新規作成モード）

フォーム項目（§9.4 の仕様通り）:
- 画像アップロード: `<input type="file">` → `POST /api/upload?prefix=categories` → `imageKey` と プレビュー URL を state に保持
- emoji（画像未登録時のフォールバック）
- テーマカラー: `<input type="color">` + プリセット 10 色ボタン
- カテゴリー名（必須）/ 英語名 / area_code（新規のみ編集可、既存は readOnly）
- 説明文（textarea）
- 対象職種（カンマ区切り入力 → 配列変換）
- 採用担当者向けメッセージ（textarea）

**`UserEditor.tsx`**  
props: `{ user, onSave, onDelete, onClose, currentUserId }`（user が null の場合は新規作成モード）

フォーム項目（§9.6 の仕様通り）:
- ユーザー名（新規のみ編集可、既存は readOnly）
- 表示名
- ロール: `Label` + `Select`（admin / user）
- パスワード / パスワード確認（新規時必須。既存は空欄で変更なし）

自分自身（`user.id === currentUserId`）はロール変更・削除ボタンを disabled にし、エラーメッセージを表示する。

---

### Step 20 — StickerEditor と CourseRow、および App.tsx 統合（v9.0コンポーネント編）

**対象ファイル**  
`client/src/components/admin/StickerEditor.tsx` / `client/src/components/admin/CourseRow.tsx` / `client/src/App.tsx`（更新）

**前提条件**  
Step 13〜19 完了（Navbar・CategoryCard・SkillChip・CategoryModal・StickerModal・LoginScreen・AdminPanel・CategoryEditor・UserEditor が全て存在すること）

**SDD 参照**  
§9.4 StickerEditor フォーム項目 / §9.5 CourseRow フォーム項目 / §5.1.2 複数カテゴリー所属スタンプの表示ルール

---

**`StickerEditor.tsx`**  
props: `{ sticker, categories, onSave, onDelete, onClose, canEdit, authFetch }`（`authFetch` の型は Step 18 と同様 `import type { authFetch as authFetchType } from '../../App'` の上で `authFetch: typeof authFetchType` とする。画像アップロード（`POST /api/upload?prefix=stickers`）に使用する）

`canEdit = false` の場合: フォームは表示するが保存・削除 `Button` を `disabled` にして「自分のスタンプのみ編集できます」を `<Alert>` で表示する。

**カテゴリー選択部（多対多対応、最重要）**:

```
[ ] 🌐 Webアプリ開発       Web App Development    [★ 主カテゴリー]
[✓] 🤖 AI・データサイエンス  AI & Data Science       [☆ 主に設定]
[ ] 🎨 UX・プロダクトデザイン UX & Product Design
[ ] 📋 プロジェクト・ビジネス Project & Business
```

- 各カテゴリーを `Checkbox` + `Label` で表示
- チェック済みのカテゴリーのみ「★ 主カテゴリー」or「☆ 主に設定」ボタンを表示
- 主カテゴリーを変更するとテーマカラーが自動で変わる
- バリデーション: 1件以上チェックされていること / 主カテゴリーがチェック済みであること
- スタンプ ID プレビュー（新規時）: 主カテゴリーの `area_code` を使って `NSS-{AREA}-K___v01` 形式でリアルタイム表示

その他のフォーム項目（§9.4 の仕様通り）:
- スタンプ ID（新規のみ編集可）
- バージョン: `Label` + `Select`（v01〜v09）
- 種別・レベル: `Label` + `Select`
- 画像・emoji・テーマカラー（CategoryEditor と同様）
- スタンプ名・英語名
- Can-Do 記述（textarea）
- 習得スキル（カンマ区切り）
- 関連授業リスト（`CourseRow` × N、「授業を追加」ボタン）

送信時は `categoryIds`（チェック済み配列）と `primaryCategoryId` を含める。

**`CourseRow.tsx`**  
props: `{ course, onChange, onDelete }`

フォーム項目（§9.5 の仕様通り）:
- 授業名（必須）/ 科目コード / 種別 / カリキュラム年度（必須）/ 時間数 / 授業内容メモ（`Textarea`・複数行対応・リサイズ可）/ 削除ボタン
- 変更時に `onChange(updatedCourse)` を呼び出す
- 種別（`Select`）の「未設定」選択肢は `value=""` ではなく `value="none"` を使用し、`onValueChange` で `"none"` を `undefined` に変換する（Radix UI は空文字 value を禁止している）

**`App.tsx`（更新・v9.0コンポーネント統合）**

Step 13 で骨格のみ実装した `App.tsx` に、Step 14〜19 で作成した子コンポーネントを組み込み、プレースホルダーの JSX を置き換える。state・`authFetch`・データフェッチ・検索フィルタリングのロジックは Step 13 のものをそのまま流用し、変更しない。

- マウント時（初回の `useEffect`）に `localStorage.getItem('auth_token')`・`localStorage.getItem('auth_user')` を読み、両方が存在すれば `JSON.parse` した `user` と `token` から `CurrentUser` を組み立てて `setCurrentUser` する
- `Navbar` を `authFetch`・`currentUser`・`view`・`setView` とともに描画する
- `view === 'gallery'` の場合、`filteredCategories` を `CategoryCard` で描画する。クリックで `catModal` をセットし、`CategoryModal` を表示する
- `CategoryModal` 内の `SkillChip` クリックで `stkModal` をセットし、`StickerModal` を表示する
- `view === 'admin'` かつ `currentUser === null` の場合は `LoginScreen` を表示する。`LoginScreen` の `onLogin(token, user)` が呼ばれたら、`{ token, ...user }` から `CurrentUser` を組み立てて `setCurrentUser` する
- `view === 'admin'` かつ `currentUser !== null` の場合は `AdminPanel` を表示する（`authFetch`・`categories`・`stickers`・`loadData` を props で渡す）
- `handleLogout` は `setCurrentUser(null)` に加えて `localStorage.removeItem('auth_token')`・`localStorage.removeItem('auth_user')` を行う
- `AdminPanel` 内部で `CategoryEditor`・`UserEditor`・`StickerEditor`・`CourseRow` を使用する配線は `AdminPanel.tsx` 側の責務であり、`App.tsx` はそれらを直接 import しない

このステップ以降、Step 21〜29 は `App.tsx` に触れない。次に `App.tsx` を更新するのは Step 30 である。

---

## セキュリティ仕上げ（Step 21）

### Step 21 — 入力バリデーションの強化

**対象ファイル**  
`lib/validate.js`（新規） / `routes/categories.js`（更新）/ `routes/stickers.js`（更新）/ `routes/users.js`（更新）

**前提条件**  
Step 6〜9 完了

**SDD 参照**  
§3.3.7 入力バリデーション / §3.3.9 エラーレスポンスの情報漏洩防止

---

各 routes ファイルに共通バリデーションロジックを追加してください。

**バリデーションヘルパー関数**（`lib/validate.js` として切り出し）:
- `requireFields(obj, fields)`: 必須フィールドが存在するか確認。不足があれば `{ ok: false, error }` を返す
- `isAlphaHyphen(str, max)`: 英数字・ハイフンのみ・指定文字数以下かチェック
- `isEnum(val, values)`: 列挙値に含まれるかチェック
- `isStringRange(str, min, max)`: 文字列長が範囲内かチェック

**各エンドポイントに適用するルール（§3.3.7 の表を実装）**:

POST /api/categories:
- `id`: 英数字・ハイフンのみ 50 文字以下
- `areaCode`: 英大文字・数字のみ 8 文字以下

POST /api/stickers:
- `type`: `'practical'` | `'lecture'` のみ
- `level`: `'実践'` | `'知識'` | undefined
- `categoryIds`: 配列であり 1 件以上

POST /api/users:
- `role`: `'admin'` | `'user'` のみ
- `username`: 3〜50 文字

バリデーション違反は `400 { "error": "..." }` を返す。エラーメッセージに DB エラーや内部パス情報を含めないこと。

---

## 学生機能拡張（Step 22〜31、v10.0）

### Step 22 — 学生関連ライブラリ（CSVインポート・学生用ミドルウェア）

**対象ファイル**
`lib/studentImport.js`（新規）/ `lib/auth.js`（更新）

**前提条件**
Step 2・4・5・6 完了

**SDD 参照**
§4.13 学生アカウント発行フロー / §4.7 ID 命名規則の考え方

---

**`lib/studentImport.js`**（export する関数）

- `parseStudentCsv(csvText: string) → { rows: object[], errors: {row, message}[] }`
  - ヘッダー行: `display_name,affiliation,position,graduation_year,contact_email,temp_password`
  - 外部 CSV パースライブラリは使わず、シンプルな行分割 + カンマ分割で実装する（引用符を含むフィールドがある場合のみ最小限のエスケープ処理を行う）
  - `display_name`・`temp_password` が空の行はエラーとして `errors` に積み、インポート対象から除外する
- `generateLoginId() → string`：`'stu-' + randomUUID().slice(0, 8)` 形式。`users.login_id` との重複を呼び出し側で再チェックすることを前提に、衝突時は再生成するループを持つ
- `importStudents(rows: object[], recordedBy: string) → { created: {loginId, displayName, tempPassword}[] }`
  - 各行ごとに `generateLoginId()` → `hashPassword(temp_password)`（`lib/auth.js` の関数を再利用）→ `users` へ INSERT（`role='student', must_change_password=1, status='active'`）→ `student_profiles` を空レコードで INSERT
  - トランザクション内で処理し、途中でエラーが出た行はスキップして残りは処理を続ける

**`lib/auth.js`**（追記）

- `requireStudent(req, res, next)`：`req.user.role !== 'student'` なら 403（`/api/my/*` 系エンドポイント用）
- 既存の `authenticate` は変更不要（`role` に `'student'` が増えるだけで、JWT 検証ロジック自体は共通）

> **`requireKioskToken` は実装しない**。SkillsStampConnect v11.0 ではキオスクトークン方式を採用せず、外部公開は認証不要の固定URL（`GET /api/public/profile/:loginId`、Step 26）で実現する（→ SDD Appendix E: ADR-032）。

---

### Step 23 — 学生管理 API（CSVインポート・一覧・状態変更）

**対象ファイル**
`routes/students.js`（新規）

**前提条件**
Step 2・4・6・22 完了

**SDD 参照**
§7.8 POST /api/students/import / §7.1 エンドポイント一覧 / §9.7・9.8 StudentBulkImportEditor・StudentAccountEditor

---

全エンドポイントに `authenticate + requireAdmin` を適用する（実績記録関連は Step 25 で別ファイルに実装し、🔑 職員全員に開放する）。

**POST /api/students/import**:
- `@fastify/busboy` で CSV ファイルを受信（`routes/upload.js` の実装パターンを再利用）
- `parseStudentCsv` → `importStudents` を呼び出す
- レスポンス: `{ created: [...], errors: [...] }`

**GET /api/students**:
- `login_id, display_name, affiliation, position, graduation_year, status, created_at` を一覧で返す（実名相当の列は存在しないため含まれない）
- 検索クエリパラメータ `q`（表示名・login_id の部分一致）に対応

**PUT /api/students/:loginId/status**（`:id` ではなく `login_id` を識別子とする。`GET /api/students` のレスポンスに内部 `id` を含めないため、既存の `GET /api/students/:loginId/profile` と同様 `login_id` に統一する）:
- リクエスト: `{ status: 'active' | 'suspended' }`
- 不正な値は 400

**PUT /api/students/:loginId/display-name**:
- リクエスト: `{ displayName: string }`（1〜50文字）

**DELETE /api/students/:loginId**:
- `users` から削除する（`student_id` 側の `ON DELETE CASCADE` により `student_achievements` も削除される）
- レスポンスに「削除ではなく状態変更（`PUT /api/students/:loginId/status` で `suspended`）を推奨する」という運用メッセージを含める
- 実際の DELETE は admin が確認ダイアログを経た上での最終手段とする

---

### Step 24 — マイページ API（プロフィール・実績・公開設定）

**対象ファイル**
`routes/me.js`（新規）

**前提条件**
Step 2・4・6・22 完了

**SDD 参照**
§7.9 GET/PUT /api/my/profile / §7.10 GET/PUT /api/my/achievements / §9.11 MyProfileEditor・MyAchievements

---

全エンドポイントに `authenticate + requireStudent` を適用する。

**GET /api/my/profile**:
- `users`（**loginId**・displayName・affiliation・position・graduationYear・contactEmail・emailPublic）と `student_profiles`（avatarImageKey・xHandle・linkedinUrl・otherSkills・goal・bio・**externalPublic**）を JOIN して1つのオブジェクトで返す（`loginId` は固定URL組み立てに必要なため必ず含める）

**PUT /api/my/profile**:
- 更新可能フィールド: `displayName`・`avatarImageKey`・`xHandle`・`linkedinUrl`・`otherSkills`・`goal`・`bio`・`contactEmail`・`emailPublic`・**`externalPublic`**
- `affiliation`・`position`・`graduationYear`・`loginId`・`status` は本人からの更新を拒否（リクエストに含まれていても無視する）
- `users` と `student_profiles` の両方を1トランザクションで更新
- `externalPublic` を `false → true` に切り替えるリクエストであっても、サーバー側でトークンの発行・再発行は一切行わない（`login_id` は変更されない固定の識別子であるため）

**PUT /api/my/password**:
- リクエスト: `{ newPassword }`
- `hashPassword` でハッシュ化して `password_hash` を更新し、`must_change_password = 0` に設定

**GET /api/my/achievements**:
- `student_achievements` を `req.user.sub` で絞り込み、`stickers` と JOIN して `stickerName` を含めて返す

**PUT /api/my/achievements/:id/visibility**:
- 対象実績の `student_id` が `req.user.sub` と一致することを確認（一致しなければ 403）
- リクエスト: `{ isVisible: boolean }`

---

### Step 25 — 実績記録 API・スタンプ保有者 API・公開学生一覧 API

**対象ファイル**
`routes/achievements.js`（新規）/ `routes/stickers.js`（更新）/ `routes/students.js`（更新）

**前提条件**
Step 2・4・8・23 完了

**SDD 参照**
§7.11 GET /api/stickers/:id/holders / §7.12 POST /api/achievements / §9.9 AchievementEditor

---

**`routes/achievements.js`**（全エンドポイント `authenticate` のみ。admin 限定にしない）:

POST /api/achievements:
- 必須: `studentId`・`stickerId`
- `student_id` が実在し `role='student'` であることを確認
- `recorded_by = req.user.sub` を自動設定
- `is_visible` は常に `0` で作成（クライアントからの指定は無視する）

GET /api/achievements?studentId=:
- 指定学生の実績一覧を返す（管理・記録画面の逆引き表示用）

DELETE /api/achievements/:id:
- 記録誤りの訂正用。物理削除する

**`routes/stickers.js`**（追記）:

GET /api/stickers/:id/holders（認証不要にはしない。`authenticate` のみで `role` を問わない）:
- `student_achievements.is_visible = 1 AND sticker_id = :id` の学生を `users` + `student_profiles` と JOIN し、`{ loginId, displayName, avatarImageKey }` の配列で返す（実名・所属等は含めない）

**`routes/students.js`**（追記）:

GET /api/students-public（`authenticate` のみ）:
- `student_achievements.is_visible = 1` を1件以上持つ学生を DISTINCT で抽出し、`{ loginId, displayName, avatarImageKey, bio, visibleStickerCount }` の配列で返す

GET /api/students/:loginId/profile（`authenticate` のみ）:
- 指定学生の公開プロフィールを返す。`achievements` には `is_visible=1` の実績のみ含める
- `contactEmail` は `email_public=1` の場合のみ含め、`0` の場合はレスポンスから省く

---

### Step 26 — 外部公開プロフィール API（v11.0。旧「キオスクトークン API・キオスク公開 API」を置き換え）

**対象ファイル**
`routes/publicProfile.js`（新規）

**前提条件**
Step 2・4・22・24・25 完了

**SDD 参照**
§7.13 GET /api/public/profile/:loginId / §4.9 student_profiles（`external_public`） / Appendix E: ADR-032

---

**`routes/publicProfile.js`**（認証ミドルウェアを一切適用しない。JWT・トークンいずれも不要）:

GET /api/public/profile/:loginId:
- `users`（`login_id = :loginId AND role = 'student' AND status = 'active'`）と `student_profiles` を JOIN して取得
- 該当レコードが存在しない、または `external_public = 0` の場合は **404** を返す（「非公開」であることと「存在しない」ことを区別できるメッセージにしない。存在自体を秘匿する）
- `external_public = 1` の場合、以下を返す：
  - `displayName`・`avatarImageKey`・`xHandle`・`linkedinUrl`・`otherSkills`・`goal`・`bio`
  - `contactEmail`：`email_public = 1` の場合のみ含める。`0` の場合はレスポンスのキー自体を含めない
  - `achievements`：`student_achievements.is_visible = 1 AND student_id = :userId` を `stickers` と JOIN し、`{ stickerId, stickerName, emoji, color, acquiredDate }` の配列で返す
- `affiliation`・`position`・`graduationYear`・`loginId` 自体・その他の管理情報は一切レスポンスに含めない（実名・学籍番号相当の情報が存在しないことは既存設計のまま）

> **admin 向けのトークン発行・失効エンドポイントは実装しない**。`kiosk_tokens` テーブル・`POST/DELETE /api/kiosk-tokens`・`GET /api/kiosk/*`・`requireKioskToken` はいずれも SkillsStampConnect には存在しない（v10.0 の旧設計であり、Step 2・4・22 でも作成していない）。就職説明会・オンラインイベントいずれも、本エンドポイントの URL（`/api/public/profile/:loginId`）をQRコード化して配布するだけで閲覧できる（→ SDD Appendix E: ADR-032）。

---

### Step 27 — Express サーバー本体の更新

**対象ファイル**
`server.js`（更新）

**前提条件**
Step 10・23〜26 完了

**SDD 参照**
§3.4 システム構成図 / §7.1 エンドポイント一覧

---

Step 10 で実装した `server.js` に以下を追記してください。

**ルーターの追加マウント**:
- `/api/students` → `students`
- `/api/my` → `me`（Express では `app.use('/api/my', meRouter)`。`me.js` 側のパスは `/profile`・`/password`・`/achievements`・`/achievements/:id/visibility` とする）
- `/api/achievements` → `achievements`
- `/api/public/profile` → `publicProfile`（認証ミドルウェアを一切適用しない。他のルートより後にマウントしても問題ないが、`app.use(express.json())` 等の共通ミドルウェアは通す）

**画像アップロード prefix の拡張**:
- `routes/upload.js` の `prefix` 許可リストに `'students'` を追加する（学生アバター用）。この変更は Step 9 で実装したファイルへの更新として行う

> **`kioskLimiter`・`/api/kiosk/*` のマウントは行わない**。SkillsStampConnect v11.0 ではキオスクモード自体が存在しないため、`X-Kiosk-Token` ヘッダーを前提としたレート制限ミドルウェアも不要である（→ SDD Appendix E: ADR-032）。`GET /api/public/profile/:loginId` は既存のログイン API 用レート制限（`loginLimiter`）とは別物であり、本ステップでは追加のレート制限を設けない（読み取り専用・認証不要の公開エンドポイントとして、他の公開 GET エンドポイント（例: `GET /api/categories`）と同じ扱いとする）。

---

### Step 28 — フロントエンド 学生向け画面

**新規作成するディレクトリ**
`client/src/components/student/`（本ステップで初めて必要になる）

**対象ファイル**
`client/src/types.ts`（更新） / `client/src/components/student/PasswordChangeScreen.tsx` / `client/src/components/student/MyProfileEditor.tsx` / `client/src/components/student/MyAchievements.tsx`

**前提条件**
Step 11〜14・24 完了

**SDD 参照**
§9.1 学生ログイン（v10.0） / §9.11 MyProfileEditor・MyAchievements フォーム項目

---

**`client/src/types.ts`（更新）**:  
Step 13 で定義した `UserRole`（`'admin' | 'user'`）に `'student'` を追加し、`'admin' | 'user' | 'student'` とする。あわせて `CurrentUser` に `mustChangePassword: boolean` を追加する。

さらに、`MyProfileEditor.tsx`・`MyAchievements.tsx` の props 型付けに使う以下の2つの型を新規に定義する（`routes/me.js`（Step 24）のレスポンス形に対応させる）:
- `StudentProfile`：`{ loginId: string; displayName: string; affiliation?: string; position?: string; graduationYear?: number; contactEmail?: string; emailPublic: boolean; avatarImageKey: string | null; avatarImageUrl: string | null; xHandle?: string; linkedinUrl?: string; otherSkills?: string; goal?: string; bio?: string; externalPublic: boolean }`
- `Achievement`：`{ id: string; stickerId: string; stickerName: string; emoji: string; color: string; imageUrl: string | null; acquiredDate?: string; isVisible: boolean; notes?: string; createdAt?: string }`

**`PasswordChangeScreen.tsx`**
props: `{ onComplete(user) }`

- ログイン後、`currentUser.mustChangePassword === true` の場合に `App.tsx` からこの画面へ強制遷移させる（他画面への遷移は許可しない）
- フォーム: 新しいパスワード / パスワード確認 / 表示名
- 送信時に `PUT /api/my/password` → 成功後に `PUT /api/my/profile`（`displayName`）を呼び出す
- 完了後 `onComplete` を呼び出し、`App.tsx` 側で `currentUser.mustChangePassword = false` に更新してギャラリーへ遷移させる

**`MyProfileEditor.tsx`**
props: `{ profile, onSave, authFetch }`（`authFetch` の型は Step 18 と同様 `import type { authFetch as authFetchType } from '../../App'` の上で `authFetch: typeof authFetchType` とする。画像アップロード（`POST /api/upload?prefix=students`）に使用する）

フォーム項目（§9.11 の仕様通り）:
- アバター（`POST /api/upload?prefix=students`）
- 表示名 / X ハンドル / LinkedIn URL / 一言 / やりたいこと / その他スキル
- 連絡先メールアドレス + 「公開する」`Checkbox`（`emailPublic`）
- 「QRコード・URLで外部公開する」`Switch`（`externalPublic`）
  - ONにする操作時に確認ダイアログ（`AlertDialog`）を表示し、「このQRコード・URLを知っている人は、ログインなしで誰でも公開中のスタンプを閲覧できます」という趣旨の文言を明示してから確定させる
  - ON後は、固定URL（例: `${window.location.origin}/public/profile/${loginId}`）をテキスト表示し、コピーボタンを設置する。QRコード画像の生成（ライブラリ選定含む）は本ステップの範囲外とし、別途 UI 要件を確認した上で追加のステップとして実装する（技術スタックに新規依存を追加する場合は SDD §3.1 の確定スタックの更新が必要）
- 保存時に `PUT /api/my/profile` を呼び出す

**`MyAchievements.tsx`**
props: `{ achievements, onToggleVisibility }`

- スタンプアイコン・スタンプ名・取得日のリスト表示
- 各行に `Switch`（`isVisible`）を配置し、切り替え時に `PUT /api/my/achievements/:id/visibility` を呼び出す

---

### Step 29 — フロントエンド ギャラリー拡張

**対象ファイル**
`client/src/types.ts`（更新） / `client/src/components/gallery/StickerModal.tsx`（更新）/ `client/src/components/gallery/StudentDirectory.tsx`（新規）/ `client/src/components/gallery/StudentProfilePage.tsx`（新規）

**前提条件**
Step 16・25 完了

**SDD 参照**
§8.7 StickerModal の拡張 / §8.8 StudentDirectory / §8.9 StudentProfilePage

---

**`client/src/types.ts`（更新）**:
本ステップで扱う3つのAPIレスポンス（`GET /api/stickers/:id/holders`・`GET /api/students-public`・`GET /api/students/:loginId/profile`）に対応する型を新規に定義する:
- `StudentHolder`：`{ loginId: string; displayName: string; avatarImageKey: string | null; avatarImageUrl: string | null }`
- `PublicStudentSummary`：`{ loginId: string; displayName: string; avatarImageKey: string | null; avatarImageUrl: string | null; bio?: string; visibleStickerCount: number }`
- `PublicAchievement`：`{ stickerId: string; stickerName: string; emoji: string; color: string; imageUrl: string | null; acquiredDate?: string }`
- `PublicStudentProfile`：`{ loginId: string; displayName: string; avatarImageKey: string | null; avatarImageUrl: string | null; xHandle?: string; linkedinUrl?: string; goal?: string; otherSkills?: string; bio?: string; contactEmail?: string; achievements: PublicAchievement[] }`（`GET /api/students/:loginId/profile`・`GET /api/public/profile/:loginId`（Step 31）の両方のレスポンス形として共用する）

**`StickerModal.tsx`**（更新）:
- props に `authFetch`（`GET /api/stickers/:id/holders` の呼び出しに使用。型は Step 18 と同様）・`onStudentClick(loginId: string)`（取得学生一覧の行クリック時に呼び出す）を追加する。既存の `{ sticker, cat, onClose }` と合わせて `{ sticker, cat, onClose, authFetch, onStudentClick }` とする
- 既存セクション（§5.3 準拠）の下に「取得学生一覧」セクションを追加
- `GET /api/stickers/:id/holders` を呼び出し、`{ loginId, displayName, avatarImageKey }` の配列を表示
- アバターは `StickerIcon` と同様のフォールバックパターン（画像なし時はイニシャル）
- 各行クリックで `onStudentClick(loginId)` を呼び出し、`App.tsx` 側で `StudentProfilePage` へ遷移させる

**`StudentDirectory.tsx`**（新規）:
props: `{ onStudentClick(loginId) }`

- マウント時に `GET /api/students-public` を呼び出す
- `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` のカードグリッドで表示
- 各カード: アバター・表示名・一言（`bio`）・公開スタンプ数バッジ

**`StudentProfilePage.tsx`**（新規）:
props: `{ loginId, onBack?, fetchFn? }`（`onBack` が渡されなかった場合、戻るボタン自体を表示しない）

- マウント時に `GET /api/students/:loginId/profile` を呼び出す（`fetchFn` が渡された場合はそちらを使う。デフォルトは `authFetch`）
- §8.9 の表に従い、アバター・表示名・一言・SNSリンク（`target="_blank" rel="noopener noreferrer"` 必須）・連絡先メール（`emailPublic` が true の場合のみ）・やりたいこと・自由入力スキル・公開スタンプ一覧を表示
- 本コンポーネントは Step 31 の外部公開プロフィール画面（`GET /api/public/profile/:loginId`、認証不要）でもレイアウトをそのまま再利用する。`fetchFn` を差し替えられる設計にしておくことで、認証あり／なしの両方の呼び出し元に対応する

**`Navbar.tsx`（更新）**：ギャラリー／学生一覧／管理画面の切り替えに「学生一覧」を追加し、クリックで `StudentDirectory` ビューに切り替える。あわせて `currentUser.role === 'student'` の場合のみ「マイページ」導線を追加し、クリックで `myPage` ビューに切り替える。Step 28 で `UserRole` に `'student'` が追加されたことを受け、`ROLE_BADGE_CLASS`・`ROLE_LABEL`（Step 14 で `'admin' | 'user'` の2キーのみ定義済み）に `student` キーを追加する。

---

### Step 30 — フロントエンド 管理画面拡張、および App.tsx 統合（学生系コンポーネント編）

**対象ファイル**
`client/src/components/admin/StudentBulkImportEditor.tsx` / `client/src/components/admin/StudentAccountEditor.tsx` / `client/src/components/admin/AchievementEditor.tsx` / `client/src/components/admin/AdminPanel.tsx`（更新） / `client/src/App.tsx`（更新）

**前提条件**
Step 20（App.tsx v9.0統合済み）・23・25・26・28・29 完了（PasswordChangeScreen・MyProfileEditor・MyAchievements・StudentDirectory・StudentProfilePage が全て存在すること）

**SDD 参照**
§9.3 AdminPanel レイアウト（v10.0更新） / §9.7〜9.10 各エディタのフォーム項目

---

**`StudentBulkImportEditor.tsx`**:
- `<input type="file" accept=".csv">` → `POST /api/students/import`
- 結果テーブル（loginId・表示名・仮パスワード）をコンポーネントの state にのみ保持し、画面遷移で消えることを明示する `<Alert>` を Tailwind `border-amber-200 bg-amber-50 text-amber-900` で表示する
- エラー行がある場合は別テーブルで行番号と理由を表示する

**`StudentAccountEditor.tsx`**:
- `GET /api/students` を呼び出し、検索フィールド（`Input`）でクライアントサイドフィルタ
- 行ごとに「表示名変更」ダイアログ（`PUT /api/students/:loginId/display-name`）と「停止／再有効化」ボタン（`PUT /api/students/:loginId/status`）

**`AchievementEditor.tsx`**:
- 学生検索（`Combobox`、`GET /api/students?q=` を呼び出す）とスタンプ選択（`Select`）
- 取得日（`Input type="date"`）・メモ（`Input`）
- 「記録する」ボタンで `POST /api/achievements`
- 学生を選択すると `GET /api/achievements?studentId=` で逆引き一覧を右側に表示し、各行に削除ボタン（`DELETE /api/achievements/:id`）

**`KioskTokenEditor.tsx`は実装しない**。SkillsStampConnect v11.0 ではキオスクトークンという概念自体が存在しないため、管理画面にトークン発行・失効のUIは設けない（→ SDD Appendix E: ADR-032）。

**`AdminPanel.tsx`（更新）**:
- 左ペインに「学生」セクション（名簿インポート／学生アカウント／実績記録）を追加（§9.3 のレイアウト図の通り。キオスクトークンの項目は含めない）
- 「実績記録」タブのみ `currentUser.role` を問わず表示（🔑 職員全員）。他の学生関連タブは `currentUser.role === 'admin'` のみ表示

**`App.tsx`（更新・学生系コンポーネント統合）**

Step 20 で v9.0コンポーネントを統合した `App.tsx` に対し、以下のみを追加する。Step 20 時点の配線（Navbar・CategoryCard・CategoryModal・StickerModal・LoginScreen・AdminPanel）は変更しない。

- `currentUser.role === 'student'` かつ `currentUser.mustChangePassword === true` の場合、他の全ての画面より優先して `PasswordChangeScreen` へ強制遷移する分岐を追加する
- `Navbar` に「学生一覧」導線が追加されたことを受け、`view` の型に `'studentDirectory'` を追加し、`StudentDirectory` を描画する分岐を追加する
- `Navbar` に「マイページ」導線が追加されたことを受け、`view` の型に `'myPage'` を追加する。`view === 'myPage'` になった際、`authFetch` で `GET /api/my/profile`・`GET /api/my/achievements` を取得して `profile`・`achievements` state にセットし、`MyProfileEditor`（`onSave` は `PUT /api/my/profile` 呼び出し後に再取得）・`MyAchievements`（`onToggleVisibility` は `PUT /api/my/achievements/:id/visibility` 呼び出し後に再取得）を並べて描画する
- `StickerModal` に「取得学生一覧」セクションが追加されたことを受け、`GET /api/stickers/:id/holders` の呼び出しに必要な `authFetch` を渡す（`StickerModal` 側の実装は Step 28〜29 で完了済み）
- 表示名クリックで `StudentProfilePage` に遷移する導線のため、`view` に `'studentProfile'` と対象 `loginId` を保持する state を追加する

このステップ以降、`App.tsx` を更新するのは Step 31（外部公開プロフィール専用ルート）のみである。

---

### Step 31 — 外部公開プロフィール専用ルート（v11.0。旧「キオスクモード専用ルート」を置き換え）

**対象ファイル**
`client/src/App.tsx`（更新）

**前提条件**
Step 26・30（App.tsx 学生系統合済み）完了

**SDD 参照**
§8.10 外部公開プロフィール画面（v11.0） / Appendix E: ADR-032

---

**`App.tsx`（更新）**:
- URL パス `/public/profile/:loginId` を検出した場合、通常のギャラリー／管理画面のルーティングとは別に「外部公開ビュー」の状態に入る
- **⚠️ 実装上の注意（React のフックのルール）**：この判定による早期 `return` は、`App` コンポーネント内の全ての `useState`・`useEffect`・`useCallback` 呼び出しの**後**（関数宣言の直前など）に置くこと。フック呼び出しより前に早期 `return` を置くと、`publicProfileLoginId` の有無によってフックの呼び出し回数・順序が変わってしまい、React のフックのルール違反になる。判定自体（`window.location.pathname` の解析）はコンポーネント冒頭で行ってよいが、`return` 文自体は全フック呼び出しの後に置く。
- 外部公開ビューでは：
  - Navbar・ログイン導線・管理画面リンクを一切表示しない（ページ全体を `StudentProfilePage` のみで構成する）
  - `StudentProfilePage` に `fetchFn` として認証ヘッダーを付与しない素の `fetch` ラッパーを渡し、`GET /api/public/profile/:loginId` を呼び出す
  - レスポンスが 404（`externalPublic=false` または該当学生が存在しない）の場合は、「このプロフィールは非公開です」等の案内画面を表示する（存在しないのか非公開なのかを区別する文言にはしない）
- 本ルートはログイン不要でアクセスされるため、`authFetch` を使う既存のコンポーネント（`StickerModal` 等）は外部公開ビューでは使用しない（プロフィール表示に必要な情報のみを単独ページとして構成する）

> **`client/src/lib/kioskFetch.ts` は作成しない**。`X-Kiosk-Token` ヘッダーを付与する専用の fetch ラッパーという概念自体が SkillsStampConnect v11.0 には存在しない。本ステップで必要なのは「認証ヘッダーを付与しない」だけの単純な fetch であり、既存の `fetch` をそのまま使えば十分である（→ SDD Appendix E: ADR-032）。

---

### Step 32 — デプロイ設定ファイル（学生機能反映済み）

**対象ファイル**  
`nginx.conf` / `SkillsStampConnect.service`（systemd unit）/ `README.md`

**前提条件**  
Step 1〜31 完了

**SDD 参照**  
§11.5 staging 構成 / §11.6 production 構成 / §11.7 データ永続化とバックアップ / §11.8 セキュリティチェックリスト

---

**`nginx.conf`**（§11.6 の Nginx 設定をそのまま実装）:
- HTTP → HTTPS リダイレクト
- SSL 設定（証明書パスはプレースホルダー）
- `proxy_pass http://localhost:3000`
- `client_max_body_size 10m`
- `proxy_set_header` の適切な設定

**`SkillsStampConnect.service`**（§11.4 の systemd unit）:
- `ExecStart=/usr/bin/npm start`
- `WorkingDirectory` / `EnvironmentFile` / `Restart=on-failure` を設定
- `User=www-data`

**`README.md`**:
以下のセクションを含む運用ドキュメント:

1. **前提条件**: Node.js 24 LTS、Ubuntu 22.04/24.04

2. **セットアップ手順**（§11.3 の手順を bash コマンドで記述）:
   ```bash
   git clone ... && cd SkillsStampConnect
   cp .env.example .env  # JWT_SECRET を必ず変更
   npm install

   # components.json は既にリポジトリに含まれているため、
   # そのまま npx shadcn@2.3.0 init を実行すると
   # 「Cannot read properties of undefined (reading 'resolvedPaths')」で失敗する。
   # 一時的に退避してから初期化する。
   mv components.json components.json.bak
   npx shadcn@2.3.0 init
   # 対話質問への回答: style → Default / base color → Slate / CSS variables → yes
   # 完了後、生成された components.json の内容
   # （style: "default" / baseColor: "slate" / cssVariables: true 等）を確認してから:
   rm components.json.bak

   npx shadcn@2.3.0 add button card dialog badge input label select textarea checkbox alert scroll-area switch alert-dialog
   npm run build && node db/migrate.js
   ```

3. **起動方法**: `npm run dev`（開発）/ `npm start`（本番）/ systemctl コマンド

4. **バックアップ手順**: SQLite のホットバックアップコマンドと uploads の tar コマンド（§11.7 の内容）

5. **セキュリティチェックリスト**: production 公開前に確認すべき項目（§11.8 の内容）

6. **初回ログイン**: `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` での管理画面アクセス手順と、初回ログイン後にパスワードを変更する手順

**`README.md`（続き）**：

上記の運用ドキュメントには、Step 1〜31 で実装した学生機能（学生アカウント・実績記録・QRコード外部公開）も以下の内容で含める。

**「6. 初回ログイン」セクションの更新**:
- 既存の admin 初回ログイン手順に加え、学生の初回ログイン手順を追記する：`login_id`（CSV インポート時に発行される）と仮パスワードでログインし、`must_change_password = 1` の場合は `PasswordChangeScreen` へ強制遷移してパスワードと表示名を設定すること

**新規セクションの追加**:
- **学生アカウントの発行**：`AdminPanel` の「学生」タブから CSV（`display_name,affiliation,position,graduation_year,contact_email,temp_password`）をインポートする手順。インポート結果（`loginId`・仮パスワード）はその場でのみ表示され、再表示できないため必ずその場で控えることを明記する
- **実績記録**：職員が `AdminPanel` の「実績記録」タブから学生にスタンプを記録する手順（admin 限定ではなく職員全員が可能であることを明記）
- **QRコード外部公開**：学生本人が `MyProfileEditor` で `externalPublic` を ON にすると、`GET /api/public/profile/:loginId` の固定URLがログイン不要で閲覧可能になること。この URL は `login_id` が変わらない限り恒久的に同一であり、印刷したQRコード・ステッカー・チャームは公開設定を OFF にしても失効しない（`external_public` の値をその都度参照するため）ことを明記する

---
