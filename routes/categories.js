// routes/categories.js
// GET/POST/PUT/DELETE /api/categories
// SDD §7.1・§7.5・§4.3・§4.8 準拠

import { Router } from 'express';
import db from '../lib/database.js';
import { imageUrl } from '../lib/imageStore.js';
import { authenticate, requireAdmin } from '../lib/auth.js';
import { requireFields, isAlphaHyphen } from '../lib/validate.js';

const router = Router();

const AREA_CODE_PATTERN = /^[A-Z0-9]+$/;

/**
 * DB の row（snake_case）を API レスポンス用（camelCase）に変換する。
 */
function toApiShape(row) {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en,
    areaCode: row.area_code,
    emoji: row.emoji,
    color: row.color,
    imageKey: row.image_key,
    imageUrl: imageUrl(row.image_key),
    description: row.description,
    targetRoles: JSON.parse(row.target_roles ?? '[]'),
    recruitMessage: row.recruit_message,
    sortOrder: row.sort_order,
    stickerCount: row.sticker_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// GET /api/categories（認証不要）
// ============================================================
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         c.*,
         COUNT(s.id) AS sticker_count
       FROM categories c
       LEFT JOIN stickers s ON s.primary_category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.created_at ASC`
    )
    .all();

  return res.json(rows.map(toApiShape));
});

// ============================================================
// POST /api/categories（authenticate + requireAdmin）
// ============================================================
router.post('/', authenticate, requireAdmin, (req, res) => {
  const {
    id,
    name,
    nameEn,
    areaCode,
    emoji,
    color,
    imageKey,
    description,
    targetRoles,
    recruitMessage,
    sortOrder,
  } = req.body ?? {};

  const fieldsCheck = requireFields(req.body, ['id', 'name', 'areaCode']);
  if (!fieldsCheck.ok) {
    return res.status(400).json({ error: fieldsCheck.error });
  }
  if (!isAlphaHyphen(id, 50)) {
    return res
      .status(400)
      .json({ error: 'id は英数字・ハイフンのみ、50文字以下で指定してください' });
  }
  if (!AREA_CODE_PATTERN.test(areaCode) || areaCode.length > 8) {
    return res
      .status(400)
      .json({ error: 'areaCode は英大文字・数字のみ、8文字以下で指定してください' });
  }

  try {
    db.prepare(
      `INSERT INTO categories (
         id, name, name_en, area_code, emoji, color, image_key,
         description, target_roles, recruit_message, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      nameEn ?? null,
      areaCode,
      emoji ?? '📌',
      color ?? '#2563EB',
      imageKey ?? null,
      description ?? null,
      JSON.stringify(targetRoles ?? []),
      recruitMessage ?? null,
      sortOrder ?? null
    );
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'このカテゴリーは既に存在します' });
    }
    throw err;
  }

  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return res.status(201).json(toApiShape({ ...row, sticker_count: 0 }));
});

// ============================================================
// PUT /api/categories/:id（authenticate + requireAdmin）
// ============================================================
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'カテゴリーが見つかりません' });
  }

  const {
    name,
    nameEn,
    areaCode,
    emoji,
    color,
    imageKey,
    description,
    targetRoles,
    recruitMessage,
    sortOrder,
  } = req.body ?? {};

  if (areaCode !== undefined && areaCode !== existing.area_code) {
    return res.status(400).json({ error: 'areaCode は変更できません' });
  }

  db.prepare(
    `UPDATE categories SET
       name = ?,
       name_en = ?,
       emoji = ?,
       color = ?,
       image_key = ?,
       description = ?,
       target_roles = ?,
       recruit_message = ?,
       sort_order = ?,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    nameEn ?? existing.name_en,
    emoji ?? existing.emoji,
    color ?? existing.color,
    imageKey ?? existing.image_key,
    description ?? existing.description,
    JSON.stringify(targetRoles ?? JSON.parse(existing.target_roles ?? '[]')),
    recruitMessage ?? existing.recruit_message,
    sortOrder ?? existing.sort_order,
    id
  );

  const row = db
    .prepare(
      `SELECT c.*, COUNT(s.id) AS sticker_count
       FROM categories c
       LEFT JOIN stickers s ON s.primary_category_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`
    )
    .get(id);

  return res.json(toApiShape(row));
});

// ============================================================
// DELETE /api/categories/:id（authenticate + requireAdmin）
// ============================================================
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'カテゴリーが見つかりません' });
  }

  const stickerCount = db
    .prepare('SELECT COUNT(*) AS count FROM stickers WHERE primary_category_id = ?')
    .get(id).count;

  if (stickerCount > 0) {
    return res
      .status(409)
      .json({ error: '配下のスタンプの主カテゴリーを変更してから再試行してください' });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);

  return res.status(204).send();
});

export default router;
