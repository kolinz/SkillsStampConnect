// lib/database.js
// SkillsStampConnect SQLite 接続シングルトン
// SDD §6.1 SQLite 準拠
//
// node:sqlite は Node.js 24 の組み込みモジュールであり、npm パッケージは不要。
// DatabaseSync は同期 API のため await は不要。

import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH ?? './db/stickers.db';

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export default db;
