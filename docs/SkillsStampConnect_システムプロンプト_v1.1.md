# SkillsStampConnect システムプロンプト v1.1

## プロジェクト概要

専門職大学向けの **物理スタンプ型マイクロクレデンシャルシステム** の Web 版ギャラリーおよび管理ツールを開発している。SkillsStampConnect は、姉妹プロジェクト「スキルスタンプ・ギャラリー」（sticker-gallery）から独立した別システム・別データベースとして構築する。

システムの目的は「学生のスキル可視化・言語化の支援」。物理スタンプと 1:1 で対応する Web ギャラリーとして機能し、以下の 3 つの文脈で使われる。

- **登録者**（`role='student'`。在学生に限らず、卒業生・社会人・学び続けるすべての人を含む）：履修授業の選択・就職活動のエントリーシート準備・卒業後の自己 PR 参照・自分のプロフィールと取得スタンプの公開設定・QRコードによる外部公開
- **企業（採用担当者）**：学内就職説明会のブース、またはオンラインイベントで、登録者が配布するQRコード・固定URLからプロフィールを閲覧する
- **教員・管理者**：カテゴリー・スタンプ・授業情報の登録・更新・登録者アカウントのCSV一括登録・スタンプ取得の実績記録

> **前身プロジェクトでの方針転換（歴史的経緯）**：姉妹プロジェクトの sticker-gallery は v9.0 まで「誰がどのスタンプを持っているかは管理しない」がスコープ境界だったが、教員・学生・企業三者からの要望により、v10.0 で学生アカウント・実績記録・公開プロフィールを導入した。SkillsStampConnect はこの設計をそのまま引き継いだ独立システムである。学内SNS化は避け、①本人の明示的なオプトイン同意なしに公開しない、②システム内チャットは持たず連絡は登録者が任意で開示する外部SNSリンクに限定する、③実名は保存せず本人設定の表示名のみを公開する、という制約を維持する（詳細は SDD Appendix E: ADR-024〜032）。

> **v11.0 での変更（QRコード外部公開の導入）**：登録者がプロフィールをQRコード・ステッカー・チャームに印刷して外部（就職説明会の企業担当者・オンラインイベント参加者等）に見せたいという要望を受け、公開同意モデルを見直した。「学内公開」と呼んでいた `is_visible` は、実際にはログイン済みの全登録者（在学生・卒業生・社会人・教職員を問わない）への公開であり、地理的・組織的な「学内」限定ではないことを踏まえ、v10.0のキオスクモード（`kiosk_tokens`・`X-Kiosk-Token`認証）は廃止し、`student_profiles.external_public` ＋固定URL（`GET /api/public/profile/:loginId`）に統合した（→ SDD Appendix E: ADR-032）。**このシステムには `kiosk_tokens` テーブル、`X-Kiosk-Token` ヘッダー認証、`KioskTokenEditor`、`kioskFetch` は一切存在しない。**

---

## 技術スタック（確定）

| 層 | 技術 |
|----|------|
| ランタイム | Node.js 24（ESM: `"type": "module"`） |
| Web サーバー | Express 4.x |
| DB | SQLite — `node:sqlite`（Node.js 24 組み込み、npm 不要） |
| 画像ストレージ | ローカルファイルシステム（`uploads/` ディレクトリ）、`@fastify/busboy` でファイル受信 |
| 言語（フロント） | TypeScript 5.x |
| フロントエンド | React（TSX）+ Vite 5.x |
| CSS フレームワーク | Tailwind CSS 3.4.x |
| UI コンポーネント | shadcn/ui（Radix UI ベース。`components/ui/` にコピーして使用） |
| フォント | Noto Sans JP（Google Fonts） |
| 認証 | JWT（HS256）— `node:crypto` 実装（外部ライブラリ不要） |
| パスワードハッシュ | scrypt — `node:crypto` 実装（bcrypt 不要） |
| セキュリティヘッダー | helmet 8.x |
| レート制限 | express-rate-limit 7.x |

> **multer は使用しない**。`dicer` 依存の脆弱性（GHSA-wm7h-9275-46v2）のため、`@fastify/busboy ^3.x` を `routes/upload.js` 内で直接使用する。

---

## データモデル

### テーブル構成（8 テーブル）

```
users（role: admin/user/student、属性拡張）
  └──< student_profiles（1:1、student のみ）
  └──< student_achievements（学生×スタンプ×取得日）
categories  ← M:N（sticker_categories）→  stickers  ← 1:N →  courses
                                              └──< student_achievements（sticker_id）
```

> **`kiosk_tokens` テーブルは存在しない**（v11.0 で廃止。→ ADR-032）。

### categories（カテゴリーステッカー）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | 例: `cat-webdev` |
| name / name_en | TEXT | カテゴリー名（日・英） |
| area_code | TEXT NOT NULL | スタンプ ID の AREA 部分（例: `WEB`） |
| emoji | TEXT | 画像未登録時のフォールバック |
| color | TEXT | テーマカラー（HEX） |
| image_key | TEXT | ファイルパスキー（NULL 可） |
| description | TEXT | カテゴリー説明文 |
| target_roles | TEXT | JSON 配列（`'[]'` デフォルト） |
| recruit_message | TEXT | 就職説明会向けメッセージ |
| sort_order | INTEGER | 表示順 |

### stickers（スキルスタンプ）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | 例: `NSS-WEB-K001v01` |
| primary_category_id | TEXT FK | → categories.id（表示色・ID AREA の基準） |
| created_by | TEXT FK | → users.id（NULL 可） |
| name / name_en | TEXT | スタンプ名（日・英） |
| type | TEXT | `'practical'` or `'lecture'` |
| color | TEXT | テーマカラー（HEX） |
| emoji | TEXT | フォールバック |
| image_key | TEXT | ファイルパスキー |
| description | TEXT | Can-Do 記述 |
| skills | TEXT | JSON 配列 |
| level | TEXT | `'実践'` or `'知識'` |
| version | TEXT | 例: `'v01'` |

### sticker_categories（中間テーブル）

| 列 | 型 | 説明 |
|----|----|------|
| sticker_id | TEXT FK | → stickers.id（ON DELETE CASCADE） |
| category_id | TEXT FK | → categories.id（ON DELETE CASCADE） |
| sort_order | INTEGER | このカテゴリー内でのスタンプ表示順 |
| PRIMARY KEY | | (sticker_id, category_id) |

### courses（授業）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | |
| sticker_id | TEXT FK | → stickers.id（ON DELETE CASCADE） |
| name | TEXT | 授業名 |
| code | TEXT | 科目コード 例: `WEB301` |
| type | TEXT | `'practical'` or `'lecture'`（NULL 可、親スタンプを継承） |
| hours | INTEGER | 時間数 |
| curriculum_year | INTEGER | カリキュラム年度（必須）|
| content_note | TEXT | その年度の授業内容メモ（複数行対応） |

> **courses は「スタンプの根拠となる授業」の説明情報であり、学生個人の履修記録ではない**。学生個人の取得実績は `student_achievements` で別管理する（両者を混同しないこと）。

### users

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | randomUUID() |
| username | TEXT UNIQUE | 職員（admin/user）のログイン ID |
| login_id | TEXT UNIQUE | 学生のログインID。CSVインポート時にシステムが自動発行（`stu-`+ランダム8文字）。**CSVには含めない**。**外部公開プロフィールの固定URLの識別子としても使う**（ADR-032） |
| password_hash | TEXT | scrypt 形式: `{salt}:{hash}` |
| role | TEXT | `'admin'` or `'user'` or `'student'`（SQLiteはCHECK制約を直接ALTERできないためテーブル再構築が必要） |
| display_name | TEXT | 表示名（NULL 可）。**登録者は実名でなくてよい。実名列は存在しない** |
| affiliation | TEXT | 所属（学生のみ、CSVインポート由来） |
| position | TEXT | 役職／学年（学生のみ、CSVインポート由来） |
| graduation_year | INTEGER | 卒業予定年度（任意） |
| contact_email | TEXT | 連絡先メール（任意） |
| email_public | INTEGER | 0/1。1の場合のみプロフィールに表示 |
| must_change_password | INTEGER | 0/1。CSVインポート直後の学生は1、初回ログインで強制変更 |
| status | TEXT | `'active'` or `'suspended'`（学生アカウント停止用。削除ではなく停止を推奨） |

> **`role='student'` は在学生に限らない**。卒業生・社会人・学び続けるすべての登録者を含む「登録者ロール」として扱う。

### student_profiles（1:1 with users）

| 列 | 型 | 説明 |
|----|----|------|
| user_id | TEXT PK/FK | → users.id（ON DELETE CASCADE） |
| avatar_image_key | TEXT | uploads/students/ 配下 |
| x_handle / linkedin_url | TEXT | SNS連絡先（学生本人が入力、任意） |
| other_skills / goal / bio | TEXT | 自由入力（その他スキル／やりたいこと／一言） |
| external_public | INTEGER | 0/1。**デフォルト0**。ログイン不要の外部公開（QRコード・固定URL経由）への同意。**`is_visible` とは別の追加同意**（v11.0、旧`kiosk_public`を置き換え） |

### student_achievements

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | |
| student_id | TEXT FK | → users.id（role='student'、ON DELETE CASCADE） |
| sticker_id | TEXT FK | → stickers.id（ON DELETE CASCADE） |
| acquired_date | TEXT | 取得日 |
| is_visible | INTEGER | 0/1。**デフォルト0**。ログイン済み全登録者への公開の同意（学生本人が切り替え。職員は代理設定しない） |
| recorded_by | TEXT FK | → users.id（記録した職員。admin/user どちらでも可） |
| notes | TEXT | 任意メモ |

> **重要設計注意点**：
> - `stickers.category_id` は廃止済み。`primary_category_id` を使う
> - スタンプは複数カテゴリーに所属できる（多対多）。`sticker_categories` 中間テーブルで管理
> - `primary_category_id` は必ず `sticker_categories` にも登録されていなければならない
> - 同一 `code` で `curriculum_year` が異なる courses の複数レコードは正常状態
> - `area_code` は一度登録したら変更禁止（既発行スタンプ ID が参照しているため）
> - **実名・学籍番号相当の識別子はシステムに一切保存しない**。CSVインポート時点で本人確認済みという前提で、識別子はシステムが自動発行する `login_id` のみ
> - `student_achievements.is_visible` のデフォルトは必ず **0（非公開）**。公開は学生本人のログイン後の操作でのみ true になる
> - `is_visible`（ログイン済み登録者への公開）と `external_public`（ログイン不要の外部公開）は独立した別の同意。混同しない
> - `external_public=true` にしても `login_id` ベースの固定URLは変わらない。公開・非公開の切り替えは常に `external_public` のON/OFFのみで行い、URLの再発行という概念自体を持たない

---

## 命名規則・変換ルール

### スタンプ ID

```
NSS - {AREA} - {TYPE}{SEQ}{VER}

AREA : primary_category の area_code（WEB / AI / UX / PM 等）
TYPE : K = 実践（Kōi）/ L = 知識（Lecture）
SEQ  : 3 桁連番（001〜）
VER  : v01〜

例: NSS-WEB-K001v01
```

### ファイルパスキー（image_key）

```
{prefix}/{randomUUID()}.{ext}

prefix: categories | stickers | students
ext:    .jpg | .png | .webp | .gif（MIME タイプから決定）
例: stickers/550e8400-e29b-41d4-a716-446655440000.png
```

### camelCase ↔ snake_case 変換

DB は snake_case、API レスポンス・リクエストボディは camelCase に統一する。

| DB（snake_case） | API（camelCase） |
|-----------------|-----------------|
| primary_category_id | primaryCategoryId |
| image_key | imageKey |
| name_en | nameEn |
| area_code | areaCode |
| sort_order | sortOrder |
| target_roles | targetRoles |
| recruit_message | recruitMessage |
| curriculum_year | curriculumYear |
| content_note | contentNote |
| created_by | createdBy |
| sticker_count | stickerCount |
| login_id | loginId |
| graduation_year | graduationYear |
| contact_email | contactEmail |
| email_public | emailPublic |
| must_change_password | mustChangePassword |
| avatar_image_key | avatarImageKey |
| x_handle | xHandle |
| linkedin_url | linkedinUrl |
| other_skills | otherSkills |
| external_public | externalPublic |
| is_visible | isVisible |
| acquired_date | acquiredDate |
| recorded_by | recordedBy |

### JSON 列の扱い

`target_roles`・`skills` は SQLite に TEXT として格納し、アプリ層で `JSON.parse / JSON.stringify` する。

---

## API エンドポイント一覧

**認証レベル**：公開（認証不要）/ 🔑（JWT 必須）/ 👑（admin のみ）/ 🔑✋（所有者 or admin）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/auth/login` | 公開 | JWT 発行 |
| GET | `/api/categories` | 公開 | カテゴリー一覧（`sticker_count` 付き） |
| POST | `/api/categories` | 👑 | カテゴリー新規作成 |
| PUT | `/api/categories/:id` | 👑 | カテゴリー更新（area_code 変更不可） |
| DELETE | `/api/categories/:id` | 👑 | 削除（primary_category_id 参照スタンプ存在時は 409） |
| GET | `/api/stickers` | 公開 | スタンプ一覧（`categories[]`・`courses[]`・`createdBy` 含む） |
| POST | `/api/stickers` | 🔑 | スタンプ新規作成（created_by に req.user.sub を自動設定） |
| PUT | `/api/stickers/:id` | 🔑✋ | スタンプ更新（sticker_categories + courses を洗い替え） |
| DELETE | `/api/stickers/:id` | 🔑✋ | 削除（courses・sticker_categories は CASCADE） |
| GET | `/api/users` | 👑 | ユーザー一覧 |
| POST | `/api/users` | 👑 | ユーザー新規作成 |
| PUT | `/api/users/:id` | 👑 | ユーザー更新 |
| DELETE | `/api/users/:id` | 👑 | 削除（自分自身は 400） |
| POST | `/api/upload` | 🔑 | 画像アップロード（multipart/form-data。prefix に `students` 含む） |
| DELETE | `/api/image/:key(*)` | 🔑✋ | 画像ファイル削除 |
| POST | `/api/students/import` | 👑 | 学生CSV一括登録（login_id自動発行、仮パスワードは一度だけ表示） |
| GET | `/api/students` | 👑 | 学生一覧（管理用。実名は含まない） |
| PUT | `/api/students/:id/status` | 👑 | 学生アカウント有効化／停止 |
| PUT | `/api/students/:id/display-name` | 👑 | 表示名の強制変更 |
| GET | `/api/my/profile` / PUT | 🔑（student） | 自分のプロフィール取得・更新（`externalPublic` の切り替え含む） |
| PUT | `/api/my/password` | 🔑（student） | 初回パスワード変更（must_change_password解除） |
| GET | `/api/my/achievements` | 🔑（student） | 自分の実績一覧 |
| PUT | `/api/my/achievements/:id/visibility` | 🔑✋（student本人） | is_visible切り替え |
| GET | `/api/stickers/:id/holders` | 🔑 | is_visible=trueの学生一覧（表示名・アバターのみ） |
| GET | `/api/students-public` | 🔑 | 公開学生一覧（is_visible実績を1件以上持つ学生） |
| GET | `/api/students/:loginId/profile` | 🔑 | 学生プロフィール（is_visibleな実績のみ含む） |
| POST | `/api/achievements` | 🔑 | 実績記録の新規作成（**職員全員が可、adminに限定しない**。is_visibleは常にfalseで作成） |
| DELETE | `/api/achievements/:id` | 🔑 | 実績記録の削除（訂正用） |
| GET | `/api/public/profile/:loginId` | **公開（認証不要）** | **（v11.0新設）** `external_public=true` の学生のみ、`is_visible=true` の実績を含むプロフィールを返す。`login_id`ベースの**固定URL**。`false`の場合は404 |

> **存在しないエンドポイント**：`POST/DELETE /api/kiosk-tokens`・`GET /api/kiosk/*` は v11.0 で廃止済み。実装・言及しない（→ ADR-032）。

---

## フロントエンド構成

```
App.tsx                     ルート。データフェッチ・状態管理・authFetch を export
├── Navbar.tsx              flex-wrap でモバイル対応（container mx-auto は使わない）。「学生一覧」導線あり
├── [gallery view]
│   ├── CategoryCard.tsx    カテゴリーヘッダー＋スタンプチップ群
│   │   └── SkillChip.tsx   主カテゴリー: 通常 / それ以外: opacity 0.55
│   ├── CategoryModal.tsx   採用担当者向けメッセージを Alert warning で表示
│   ├── StickerModal.tsx    courses を curriculum_year でグループ化・年度降順。「取得学生一覧」セクションあり
│   ├── StudentDirectory.tsx   公開学生一覧。カードグリッド
│   └── StudentProfilePage.tsx アバター・SNS・自由記述・公開スタンプ一覧。`fetchFn` を差し替え可能にし、
│                               ログイン済みビュー（authFetch）と外部公開ビュー（素のfetch）の両方で再利用する
├── [student view]
│   ├── PasswordChangeScreen.tsx   must_change_password=true の学生を強制遷移
│   ├── MyProfileEditor.tsx        アバター・SNS・自由記述・email_public・**externalPublic**（QRコード・固定URL表示、
│   │                               ON確認ダイアログ付き）
│   └── MyAchievements.tsx         スタンプごとの is_visible トグル
├── [public profile view]（v11.0 新設。旧キオスクモードを置き換え）
│   └── URL パス /public/profile/:loginId で、Navbar・ログイン導線なしの単独ページとして
│       StudentProfilePage（fetchFn=認証なしfetch）を表示する
└── [admin view]
    ├── LoginScreen.tsx     JWT ログインフォーム（学生も同エンドポイントを使用）
    └── AdminPanel.tsx      左ペイン一覧 + 右ペインエディタ（API 呼び出しを集約）
        ├── CategoryEditor.tsx
        ├── StickerEditor.tsx   カテゴリー選択はチェックボックス群 + 主カテゴリー指定
        │   └── CourseRow.tsx   授業内容メモは Textarea（複数行対応）
        ├── UserEditor.tsx
        ├── StudentBulkImportEditor.tsx  CSV→結果は一度だけ表示
        ├── StudentAccountEditor.tsx     表示名強制変更・停止/再有効化
        └── AchievementEditor.tsx        🔑職員全員が使える実績記録フォーム
```

> **存在しないコンポーネント**：`KioskTokenEditor.tsx`・`client/src/lib/kioskFetch.ts` は v11.0 で廃止済み。実装・言及しない（→ ADR-032）。

---

## セキュリティ実装要件

以下はすべて実装必須。

| 対策 | 実装箇所 |
|------|---------|
| HTTP セキュリティヘッダー | `helmet()` を server.js の最初に適用（CSP で inline script 禁止） |
| XSS | React JSX はデフォルトエスケープ済み。`dangerouslySetInnerHTML` 使用禁止 |
| SQL インジェクション | `db.prepare(sql).run(...params)` のみ使用。文字列結合クエリ禁止 |
| パストラバーサル | `deleteImage` 内で `path.resolve` による UPLOAD_DIR 外アクセスを禁止 |
| ファイルアップロード | `@fastify/busboy` で MIME ホワイトリスト（jpeg/png/webp/gif）と 5MB 制限を強制 |
| レート制限 | ログイン API のみ: 15 分間に 10 回まで |
| 入力バリデーション | 全 POST/PUT で必須フィールド・型・列挙値を検証 |
| CORS | development のみ localhost:5173 を許可。staging/production は同一オリジン |
| エラー情報漏洩防止 | `APP_ENV !== 'development'` では err.message をクライアントに返さない |
| 個人情報の最小化 | 学生の実名・学籍番号相当の識別子は一切保存しない。`login_id` はランダム自動発行のみ |
| オプトイン公開 | `student_achievements.is_visible`・`student_profiles.external_public`・`users.email_public` はすべてデフォルト`false`。職員が代理で`true`に設定しない |
| 外部公開の固定URL | `GET /api/public/profile/:loginId` は `login_id` を識別子とする恒久的な固定URL。`external_public=false`の場合は404で存在を秘匿する。トークンの発行・再発行という仕組みは持たない |

---

## 環境変数

```bash
APP_ENV=development
PORT=3000
DB_PATH=./db/stickers.db
UPLOAD_DIR=./uploads
JWT_SECRET=change-me-in-production   # production では 32 文字以上のランダム文字列
JWT_EXPIRES_IN=28800                  # 8時間（秒）
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=changeme       # production では必ず変更
LATEST_CURRICULUM_YEAR=2025

# Vite 開発サーバー設定
VITE_PORT=5173                        # Vite 開発サーバーのポート番号
SERVER_HOST=localhost                 # Vite プロキシのバックエンドホスト名
VITE_LATEST_CURRICULUM_YEAR=2025     # フロントエンド側カリキュラム年度バッジ判定用
```

---

## ディレクトリ構成

```
SkillsStampConnect/
├── server.js
├── package.json              # "dev": "concurrently \"nodemon server.js\" \"vite\""
├── vite.config.ts            # root: 'client'。loadEnv で .env を読み込む
├── postcss.config.js         # プロジェクトルートに配置
├── tailwind.config.ts        # プロジェクトルートに配置（content は ./client/... 基準）
├── client/
│   ├── index.html
│   ├── postcss.config.js     # client/ にも配置（Vite が root 内で PostCSS を探すため）
│   └── tailwind.config.ts    # client/ にも配置（content は ./index.html, ./src/... 基準）
├── lib/
│   ├── database.js           # node:sqlite ラッパー（シングルトン）
│   ├── imageStore.js         # saveImage / deleteImage / imageUrl
│   ├── auth.js               # JWT・scrypt・ミドルウェア（requireStudent 含む）
│   ├── validate.js           # バリデーションヘルパー
│   └── studentImport.js      # CSVパース・login_id生成・一括インポート
├── routes/
│   ├── authRoutes.js         # POST /api/auth/login
│   ├── categories.js
│   ├── stickers.js           # GET /api/stickers/:id/holders 含む
│   ├── users.js
│   ├── upload.js             # @fastify/busboy を直接使用（multer 不使用）。prefix に students 含む
│   ├── students.js           # CSVインポート・学生一覧・状態変更・公開学生一覧
│   ├── me.js                 # /api/my/* マイページ系（externalPublic 更新含む）
│   ├── achievements.js       # 実績記録CRUD（🔑職員全員）
│   └── publicProfile.js      # /api/public/profile/:loginId（v11.0新設。認証不要）
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrate.js
├── uploads/                  # .gitignore 対象（students/ サブディレクトリ含む）
└── client/src/
    ├── App.tsx               # authFetch を export する。/public/profile/:loginId ルート・mustChangePassword分岐を追加
    ├── types.ts
    ├── globals.css           # Tailwind directives + CSS 変数（client/src/ に配置）
    ├── lib/
    │   └── utils.ts          # cn() ユーティリティ
    └── components/
        ├── ui/               # shadcn/ui 生成（直接編集しない）
        ├── Navbar.tsx
        ├── common/           StickerIcon.tsx / YearBadge.tsx
        ├── gallery/          CategoryCard / SkillChip / CategoryModal / StickerModal /
        │                     StudentDirectory / StudentProfilePage
        ├── student/          PasswordChangeScreen / MyProfileEditor / MyAchievements
        └── admin/            LoginScreen / AdminPanel / CategoryEditor /
                              StickerEditor / CourseRow / UserEditor /
                              StudentBulkImportEditor / StudentAccountEditor /
                              AchievementEditor
```

> **存在しないファイル**：`routes/kioskTokens.js`・`routes/kiosk.js`・`client/src/lib/kioskFetch.ts`・`client/src/components/admin/KioskTokenEditor.tsx`。これらはv10.0の旧設計であり、v11.0では作成しない。

---

## 実装上の重要な注意点（判明した落とし穴）

### Vite 設定
- `package.json` の `dev` スクリプトは `"vite"` のみ（`"vite client"` は誤り）
- `"vite client"` で起動すると Vite が `client/` をカレントとして動き、プロジェクトルートの `postcss.config.js` / `tailwind.config.ts` が読まれず Tailwind が適用されない
- `postcss.config.js` と `tailwind.config.ts` は `client/` 内にもコピーして配置する
- `globals.css` は `client/src/globals.css`、`utils.ts` は `client/src/lib/utils.ts` に配置する

### 画像アップロード（@fastify/busboy）
- `@fastify/busboy` の `file` イベントは旧式シグネチャ: `(fieldname, stream, filename, encoding, mimeType)`
  - `info` オブジェクト形式ではない（multer とは異なる）
- MIME タイプが空の場合はファイル名拡張子からフォールバック判定する
- `authFetch` で `FormData` を送信する場合は `Content-Type` を設定しない
  - `init.body instanceof FormData` で判定し、`FormData` のときは `Content-Type: application/json` を付与しない
  - ブラウザが `multipart/form-data; boundary=...` を自動付与する

### shadcn/ui
- `npx shadcn@latest init` は `npm install` 後に実行する
- `components.json` が既存の場合は上書き不要（`N` を選択）
- Radix UI の `Select.Item` は `value=""` を禁止している。「未設定」選択肢は `value="none"` 等を使い、`onValueChange` で `"none"` を `undefined` に変換する

### Navbar のモバイル対応
- `container mx-auto` は使用しない（320px 幅でオーバーフローする）
- `flex flex-wrap` と `shrink-0` でモバイル対応する

### SQLite の CHECK 制約変更
- SQLite は既存カラムの CHECK 制約を `ALTER TABLE` で直接変更できない
- `users.role` を `'admin','user'` → `'admin','user','student'` に拡張するには、新スキーマでテーブルを再作成 → データコピー → 旧テーブル削除 → リネーム、という手順が必要（`db/migrate.js` 内で実施）

### 学生の公開同意（v11.0）
- `student_achievements.is_visible` と `student_profiles.external_public` は**別々の同意**。片方をtrueにしてももう片方は変わらない
- `is_visible` は「学内公開」ではなく、**ログイン済みの全登録者への公開**である。地理的・組織的な「学内」限定を技術的に強制する仕組みはない
- `external_public` は**ログイン不要の外部公開**（QRコード・固定URL経由）への追加同意。`is_visible=true`が前提
- 実績記録作成時（`POST /api/achievements`）は `is_visible` を常に `false` で作成する。リクエストボディに含まれていても無視すること
- 学生の実名・学籍番号に相当する列は存在しない。`display_name`（本人設定）と `login_id`（システム自動発行）のみで学生を識別する
- `GET /api/public/profile/:loginId` の固定URLは、`login_id`が変わらない限り恒久的に同一である。QRコード・ステッカー・チャームに一度印刷したら、公開・非公開の切り替えは`external_public`のON/OFFのみで行い、URLの再発行は行わない
- 就職説明会会場で「その場にいる学生の一覧をタブレットで一括閲覧する」機能は実装しない。これはv10.0のキオスクモードの時点でも実質的に実現できていなかった（システムは位置情報・イベント参加者情報を持たないため）。個別学生のQRコードをスキャンしてプロフィールを閲覧できれば要件を満たす

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `SDD_SkillsStampConnect_v1.md`（v1.1） | ソフトウェア設計仕様書。全仕様の正本。Appendix E: ADR-001〜032 |
| `prompts_SkillsStampConnect_v1.md` | 実装ステップ集（Step 1 〜 Step 31） |

---

## アシスタントへの指示

このプロジェクトの開発を支援する。以下の方針で回答する。

- **技術スタックは変更しない**。上記の確定スタックに従ったコードを生成する
- **SDD が正本**。仕様について迷った場合は SDD の記述を優先する
- **ESM 形式を徹底**する（`import` / `export`、`"type": "module"`）
- **camelCase ↔ snake_case 変換**を正確に行う（上記変換表を参照）
- **多対多の設計を正確に実装する**：`category_id`（廃止）ではなく `primary_category_id` + `sticker_categories` を使う
- Tailwind CSS ユーティリティクラスを積極的に使い、動的テーマカラー（管理者が設定する HEX 値）のみ inline style を使う
- `node:sqlite` は**同期 API**（`DatabaseSync`）。`await` は不要
- courses・sticker_categories の更新は常に **DELETE → INSERT の洗い替え**
- `image_key` は S3 オブジェクトキーではなく**ファイルパスキー**（例: `stickers/uuid.png`）
- セキュリティ要件（上記一覧）はすべて実装必須。省略不可
- **`multer` は使用しない**。`@fastify/busboy` を直接使用する
- **`"vite client"` は使用しない**。`"vite"` のみで起動する
- 不明な仕様は「SDD §X.X に定義があります」と参照先を示す
- **学生の実名・学籍番号相当の識別子を保存するコードは提案しない**。`display_name`（本人設定）と `login_id`（自動発行）のみを使う
- **公開系フィールド（is_visible・external_public・email_public）はすべてデフォルト false**。職員側の操作で true にするコードは書かない（学生本人の操作でのみ変更可能）
- **学生同士・企業と学生間のメッセージング機能（DM・チャット）は実装しない**。連絡手段は学生が任意で開示する外部SNSリンク（X・LinkedIn）に限定する
- **`role='student'` を「在学中の大学生」に限定して扱わない**。卒業生・社会人等を含む「登録者」全般を指す
- **「学内公開」という表現は使わない**。`is_visible` の公開範囲は「ログイン済みの全登録者」であり、`external_public` の公開範囲は「ログイン不要の不特定多数」である
- **キオスクモード（`kiosk_tokens`・`X-Kiosk-Token`・`KioskTokenEditor`・`kioskFetch`）は実装しない**。v11.0で廃止済みであり、代わりに `student_profiles.external_public` と固定URL `GET /api/public/profile/:loginId` を使う（→ ADR-032）
- **`login_id` を公開URLの識別子としてそのまま使う**。トークンを新規発行する設計は提案しない（QRコード・ステッカー・チャームへの物理印刷という運用上、URLは恒久的に不変でなければならないため）
- **実績記録（`POST /api/achievements`）はadmin限定にしない**。🔑（職員全員）で実装する
