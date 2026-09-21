-- SkillsStampConnect データベーススキーマ
-- SDD §4.1〜4.6・§4.8〜4.10・§4.12 準拠
--
-- v11.0 の学生機能（役割拡張・student_profiles・student_achievements）を
-- 最初から含む完全な8テーブル構成として一度に作成する。
-- ALTER TABLE による段階的な追記は行わない（旧 Step 22 は本ファイルに統合済み）。

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. schema_migrations（マイグレーション管理）
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                     TEXT PRIMARY KEY,
  username               TEXT UNIQUE,       -- 職員のログインID。学生は NULL
  login_id               TEXT UNIQUE,       -- 学生のログインID。CSVインポート時にシステムが自動発行
  password_hash          TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('admin', 'user', 'student')),
  display_name           TEXT,
  affiliation            TEXT,              -- 所属（学生のみ、CSVインポート由来）
  position               TEXT,              -- 役職／学年（学生のみ、CSVインポート由来）
  graduation_year        INTEGER,           -- 卒業予定年度（任意）
  contact_email          TEXT,              -- 連絡先メール（任意）
  email_public           INTEGER NOT NULL DEFAULT 0,
  must_change_password   INTEGER NOT NULL DEFAULT 0,
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 3. categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id               TEXT PRIMARY KEY,
  name             TEXT,
  name_en          TEXT,
  area_code        TEXT NOT NULL,
  emoji            TEXT DEFAULT '📌',
  color            TEXT DEFAULT '#2563EB',
  image_key        TEXT,
  description      TEXT,
  target_roles     TEXT DEFAULT '[]',
  recruit_message  TEXT,
  sort_order       INTEGER,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 4. stickers
-- ============================================================
CREATE TABLE IF NOT EXISTS stickers (
  id                   TEXT PRIMARY KEY,
  primary_category_id  TEXT NOT NULL REFERENCES categories(id),
  created_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  name                 TEXT,
  name_en              TEXT,
  type                 TEXT CHECK (type IN ('practical', 'lecture')),
  color                TEXT,
  emoji                TEXT,
  image_key            TEXT,
  description          TEXT,
  skills               TEXT DEFAULT '[]',
  level                TEXT CHECK (level IN ('実践', '知識')),
  version              TEXT DEFAULT 'v01',
  sort_order           INTEGER,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 5. sticker_categories（中間テーブル）
-- ============================================================
CREATE TABLE IF NOT EXISTS sticker_categories (
  sticker_id   TEXT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort_order   INTEGER,
  PRIMARY KEY (sticker_id, category_id)
);

-- ============================================================
-- 6. courses
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id                TEXT PRIMARY KEY,
  sticker_id        TEXT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  name              TEXT,
  code              TEXT,
  type              TEXT CHECK (type IN ('practical', 'lecture')),
  hours             INTEGER,
  curriculum_year   INTEGER NOT NULL,
  content_note      TEXT,
  sort_order        INTEGER
);

-- ============================================================
-- 7. student_profiles（1:1 with users）
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_image_key   TEXT,
  x_handle           TEXT,
  linkedin_url       TEXT,
  other_skills       TEXT,
  goal               TEXT,
  bio                TEXT,
  -- ログイン不要の外部公開（QRコード・固定URL経由）への同意。デフォルトは非公開。
  -- 「kiosk_public」という列名は使わない（v11.0 でキオスクモードは廃止済み）。
  external_public    INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 8. student_achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS student_achievements (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id    TEXT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  acquired_date TEXT,
  -- ログイン済み全登録者への公開の同意。デフォルトは非公開。学生本人のみが切り替える。
  is_visible    INTEGER NOT NULL DEFAULT 0,
  recorded_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- インデックス（全 10 件）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stickers_primary_cat  ON stickers(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_stickers_created_by   ON stickers(created_by);
CREATE INDEX IF NOT EXISTS idx_sticker_cats_sticker   ON sticker_categories(sticker_id);
CREATE INDEX IF NOT EXISTS idx_sticker_cats_cat       ON sticker_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_sticker        ON courses(sticker_id);
CREATE INDEX IF NOT EXISTS idx_courses_year           ON courses(curriculum_year);
CREATE INDEX IF NOT EXISTS idx_users_login_id         ON users(login_id);
CREATE INDEX IF NOT EXISTS idx_achievements_student   ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_achievements_sticker   ON student_achievements(sticker_id);
CREATE INDEX IF NOT EXISTS idx_achievements_visible   ON student_achievements(is_visible);
