// routes/users.js
// GET/POST/PUT/DELETE /api/users（全エンドポイント authenticate + requireAdmin）
// SDD §7.1・§7.4 準拠

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../lib/database.js';
import { authenticate, requireAdmin, hashPassword } from '../lib/auth.js';
import { requireFields, isEnum, isStringRange } from '../lib/validate.js';

const router = Router();

router.use(authenticate, requireAdmin);

function toApiShape(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    stickerCount: row.sticker_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// GET /api/users
// ============================================================
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         u.id, u.username, u.display_name, u.role, u.created_at, u.updated_at,
         COUNT(s.id) AS sticker_count
       FROM users u
       LEFT JOIN stickers s ON s.created_by = u.id
       GROUP BY u.id
       ORDER BY u.created_at ASC`
    )
    .all();

  return res.json(rows.map(toApiShape));
});

// ============================================================
// POST /api/users
// ============================================================
router.post('/', async (req, res) => {
  const { username, password, role, displayName } = req.body ?? {};

  const fieldsCheck = requireFields(req.body, ['username', 'password', 'role']);
  if (!fieldsCheck.ok) {
    return res.status(400).json({ error: fieldsCheck.error });
  }
  if (!isStringRange(username, 3, 50)) {
    return res.status(400).json({ error: 'username は3〜50文字で指定してください' });
  }
  if (!isEnum(role, ['admin', 'user'])) {
    return res.status(400).json({ error: "role は 'admin' または 'user' で指定してください" });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'このユーザー名は既に使用されています' });
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  db.prepare(
    `INSERT INTO users (id, username, password_hash, role, display_name)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, username, passwordHash, role, displayName ?? null);

  const row = db
    .prepare(
      `SELECT id, username, display_name, role, created_at, updated_at, 0 AS sticker_count
       FROM users WHERE id = ?`
    )
    .get(id);

  return res.status(201).json(toApiShape(row));
});

// ============================================================
// PUT /api/users/:id
// ============================================================
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }

  const { username, password, role, displayName } = req.body ?? {};

  if (role && role !== existing.role && req.user.sub === id) {
    return res.status(400).json({ error: '自分自身のロールは変更できません' });
  }
  if (role && !isEnum(role, ['admin', 'user'])) {
    return res.status(400).json({ error: "role は 'admin' または 'user' で指定してください" });
  }

  const passwordHash = password ? await hashPassword(password) : existing.password_hash;

  db.prepare(
    `UPDATE users SET
       username = ?,
       password_hash = ?,
       role = ?,
       display_name = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    username ?? existing.username,
    passwordHash,
    role ?? existing.role,
    displayName ?? existing.display_name,
    id
  );

  const row = db
    .prepare(
      `SELECT
         u.id, u.username, u.display_name, u.role, u.created_at, u.updated_at,
         COUNT(s.id) AS sticker_count
       FROM users u
       LEFT JOIN stickers s ON s.created_by = u.id
       WHERE u.id = ?
       GROUP BY u.id`
    )
    .get(id);

  return res.json(toApiShape(row));
});

// ============================================================
// DELETE /api/users/:id
// ============================================================
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (req.user.sub === id) {
    return res.status(400).json({ error: '自分自身は削除できません' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'ユーザーが見つかりません' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.status(204).send();
});

export default router;
