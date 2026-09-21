// db/migrate.js
// SkillsStampConnect データベースマイグレーションスクリプト
// SDD §6.1 SQLite / §10.2 INITIAL_ADMIN_* 環境変数 準拠
//
// 実行方法: node db/migrate.js（package.json の "migrate" スクリプト経由）

import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, scryptSync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH ?? './db/stickers.db';
const INITIAL_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME ?? 'admin';
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD ?? 'changeme';

/**
 * scrypt でパスワードをハッシュ化する。
 * 形式: "{salt}:{hash}"（salt・hash はいずれも hex 文字列）
 */
function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * schema_migrations テーブルの存在を保証する（bootstrap 用）。
 * db/schema.sql 本体にも同一定義が含まれるが、001_schema 適用前に
 * 適用済みチェックを行うために先行して作成しておく必要がある。
 */
function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function isApplied(db, version) {
  const row = db
    .prepare('SELECT version FROM schema_migrations WHERE version = ?')
    .get(version);
  return Boolean(row);
}

function markApplied(db, version) {
  db.prepare(
    'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, datetime(\'now\'))'
  ).run(version);
}

function runSqlFile(db, relativePath) {
  const filePath = path.join(__dirname, relativePath);
  const sql = readFileSync(filePath, 'utf-8');
  db.exec(sql);
}

function migrate001Schema(db) {
  const version = '001_schema';
  if (isApplied(db, version)) {
    console.log(`⏭ ${version}: スキップ（適用済み）`);
    return;
  }
  runSqlFile(db, 'schema.sql');
  markApplied(db, version);
  console.log(`✅ ${version}: 適用完了`);
}

function migrate002Seed(db) {
  const version = '002_seed';
  if (isApplied(db, version)) {
    console.log(`⏭ ${version}: スキップ（適用済み）`);
    return;
  }
  runSqlFile(db, 'seed.sql');
  markApplied(db, version);
  console.log(`✅ ${version}: 適用完了`);
}

function migrate003InitAdmin(db) {
  const version = '003_init_admin';
  if (isApplied(db, version)) {
    console.log(`⏭ ${version}: スキップ（適用済み）`);
    return;
  }

  const id = randomUUID();
  const passwordHash = hashPassword(INITIAL_ADMIN_PASSWORD);

  db.prepare(
    `INSERT INTO users (id, username, password_hash, role, display_name)
     VALUES (?, ?, ?, 'admin', ?)`
  ).run(id, INITIAL_ADMIN_USERNAME, passwordHash, INITIAL_ADMIN_USERNAME);

  markApplied(db, version);
  console.log(`✅ ${version}: 適用完了（管理者ユーザー "${INITIAL_ADMIN_USERNAME}" を作成しました）`);
}

function main() {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  ensureMigrationsTable(db);

  migrate001Schema(db);
  migrate002Seed(db);
  migrate003InitAdmin(db);

  db.close();
  console.log('マイグレーションが完了しました。');
}

main();
