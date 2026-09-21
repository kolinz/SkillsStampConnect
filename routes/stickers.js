// routes/stickers.js
// GET/POST/PUT/DELETE /api/stickers
// SDD §7.6・§7.7・§4.4・§4.4b 準拠

import { Router } from 'express';
import db from '../lib/database.js';
import { imageUrl } from '../lib/imageStore.js';
import { authenticate, requireOwnerOrAdmin } from '../lib/auth.js';
import { requireFields, isEnum } from '../lib/validate.js';

const router = Router();

const STICKER_ID_PATTERN = /^NSS-[A-Z0-9]+-[KL]\d{3}v\d{2}$/;

// ============================================================
// ヘルパー
// ============================================================

function getCategoriesForSticker(stickerId) {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.area_code, c.color
       FROM sticker_categories sc
       JOIN categories c ON c.id = sc.category_id
       WHERE sc.sticker_id = ?
       ORDER BY sc.sort_order ASC`
    )
    .all(stickerId);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    areaCode: row.area_code,
    color: row.color,
  }));
}

function getCoursesForSticker(stickerId) {
  const rows = db
    .prepare(
      `SELECT * FROM courses
       WHERE sticker_id = ?
       ORDER BY curriculum_year DESC, sort_order ASC`
    )
    .all(stickerId);

  return rows.map((row) => ({
    id: row.id,
    stickerId: row.sticker_id,
    name: row.name,
    code: row.code,
    type: row.type,
    hours: row.hours,
    curriculumYear: row.curriculum_year,
    contentNote: row.content_note,
    sortOrder: row.sort_order,
  }));
}

function getCreatedByInfo(createdById) {
  if (!createdById) {
    return null;
  }
  const user = db
    .prepare('SELECT id, display_name FROM users WHERE id = ?')
    .get(createdById);

  if (!user) {
    return null;
  }
  return { id: user.id, displayName: user.display_name };
}

function toApiShape(row) {
  return {
    id: row.id,
    primaryCategoryId: row.primary_category_id,
    createdBy: getCreatedByInfo(row.created_by),
    name: row.name,
    nameEn: row.name_en,
    type: row.type,
    color: row.color,
    emoji: row.emoji,
    imageKey: row.image_key,
    imageUrl: imageUrl(row.image_key),
    description: row.description,
    skills: JSON.parse(row.skills ?? '[]'),
    level: row.level,
    version: row.version,
    sortOrder: row.sort_order,
    categories: getCategoriesForSticker(row.id),
    courses: getCoursesForSticker(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * POST/PUT 共通のリクエストボディバリデーション。
 * 問題があればエラーメッセージの文字列を、なければ null を返す。
 */
function validateStickerBody(body) {
  const { id, primaryCategoryId, categoryIds, name, type, level } = body ?? {};

  const fieldsCheck = requireFields(body, ['id', 'primaryCategoryId', 'name', 'type']);
  if (!fieldsCheck.ok) {
    return fieldsCheck.error;
  }
  if (!STICKER_ID_PATTERN.test(id)) {
    return 'id はスタンプ ID 形式（例: NSS-WEB-K001v01）で指定してください';
  }
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return 'categoryIds は1件以上指定してください';
  }
  if (!categoryIds.includes(primaryCategoryId)) {
    return 'categoryIds には primaryCategoryId を含めてください';
  }
  if (!isEnum(type, ['practical', 'lecture'])) {
    return "type は 'practical' または 'lecture' で指定してください";
  }
  if (level !== undefined && !isEnum(level, ['実践', '知識'])) {
    return "level は '実践' または '知識' で指定してください";
  }
  return null;
}

/**
 * 対象スタンプの created_by を取得し、requireOwnerOrAdmin を動的に適用する
 * ミドルウェアを生成する。スタンプが存在しない場合は 404 を返す。
 */
function loadStickerAndCheckOwnership(req, res, next) {
  const sticker = db.prepare('SELECT * FROM stickers WHERE id = ?').get(req.params.id);
  if (!sticker) {
    return res.status(404).json({ error: 'スタンプが見つかりません' });
  }
  req.sticker = sticker;
  return requireOwnerOrAdmin(sticker.created_by)(req, res, next);
}

// ============================================================
// GET /api/stickers（認証不要）
// ============================================================
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM stickers ORDER BY sort_order ASC, created_at ASC')
    .all();

  return res.json(rows.map(toApiShape));
});

// ============================================================
// POST /api/stickers（authenticate）
// ============================================================
router.post('/', authenticate, (req, res) => {
  const errorMessage = validateStickerBody(req.body);
  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }

  const {
    id,
    primaryCategoryId,
    categoryIds,
    name,
    nameEn,
    type,
    color,
    emoji,
    imageKey,
    description,
    skills,
    level,
    version,
    sortOrder,
    courses,
  } = req.body;

  const createdBy = req.user.sub;

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO stickers (
         id, primary_category_id, created_by, name, name_en, type, color,
         emoji, image_key, description, skills, level, version, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      primaryCategoryId,
      createdBy,
      name,
      nameEn ?? null,
      type,
      color ?? null,
      emoji ?? null,
      imageKey ?? null,
      description ?? null,
      JSON.stringify(skills ?? []),
      level ?? null,
      version ?? 'v01',
      sortOrder ?? null
    );

    const insertCategory = db.prepare(
      'INSERT INTO sticker_categories (sticker_id, category_id, sort_order) VALUES (?, ?, ?)'
    );
    categoryIds.forEach((categoryId, index) => {
      insertCategory.run(id, categoryId, index);
    });

    const insertCourse = db.prepare(
      `INSERT INTO courses (
         id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (courses ?? []).forEach((course, index) => {
      insertCourse.run(
        course.id,
        id,
        course.name ?? null,
        course.code ?? null,
        course.type ?? null,
        course.hours ?? null,
        course.curriculumYear,
        course.contentNote ?? null,
        course.sortOrder ?? index
      );
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'このスタンプ ID は既に存在します' });
    }
    throw err;
  }

  const row = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);
  return res.status(201).json(toApiShape(row));
});

// ============================================================
// PUT /api/stickers/:id（authenticate + requireOwnerOrAdmin）
// ============================================================
router.put('/:id', authenticate, loadStickerAndCheckOwnership, (req, res) => {
  const errorMessage = validateStickerBody(req.body);
  if (errorMessage) {
    return res.status(400).json({ error: errorMessage });
  }
  if (req.body.id !== req.params.id) {
    return res.status(400).json({ error: 'id は変更できません' });
  }

  const {
    primaryCategoryId,
    categoryIds,
    name,
    nameEn,
    type,
    color,
    emoji,
    imageKey,
    description,
    skills,
    level,
    version,
    sortOrder,
    courses,
  } = req.body;

  const stickerId = req.params.id;

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM sticker_categories WHERE sticker_id = ?').run(stickerId);
    const insertCategory = db.prepare(
      'INSERT INTO sticker_categories (sticker_id, category_id, sort_order) VALUES (?, ?, ?)'
    );
    categoryIds.forEach((categoryId, index) => {
      insertCategory.run(stickerId, categoryId, index);
    });

    db.prepare('DELETE FROM courses WHERE sticker_id = ?').run(stickerId);
    const insertCourse = db.prepare(
      `INSERT INTO courses (
         id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (courses ?? []).forEach((course, index) => {
      insertCourse.run(
        course.id,
        stickerId,
        course.name ?? null,
        course.code ?? null,
        course.type ?? null,
        course.hours ?? null,
        course.curriculumYear,
        course.contentNote ?? null,
        course.sortOrder ?? index
      );
    });

    db.prepare(
      `UPDATE stickers SET
         primary_category_id = ?,
         name = ?,
         name_en = ?,
         type = ?,
         color = ?,
         emoji = ?,
         image_key = ?,
         description = ?,
         skills = ?,
         level = ?,
         version = ?,
         sort_order = ?,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      primaryCategoryId,
      name,
      nameEn ?? null,
      type,
      color ?? null,
      emoji ?? null,
      imageKey ?? null,
      description ?? null,
      JSON.stringify(skills ?? []),
      level ?? null,
      version ?? 'v01',
      sortOrder ?? null,
      stickerId
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const row = db.prepare('SELECT * FROM stickers WHERE id = ?').get(stickerId);
  return res.json(toApiShape(row));
});

// ============================================================
// DELETE /api/stickers/:id（authenticate + requireOwnerOrAdmin）
// ============================================================
router.delete('/:id', authenticate, loadStickerAndCheckOwnership, (req, res) => {
  // courses・sticker_categories は ON DELETE CASCADE により自動削除される
  db.prepare('DELETE FROM stickers WHERE id = ?').run(req.params.id);
  return res.status(204).send();
});

// ============================================================
// GET /api/stickers/:id/holders（authenticate のみ、role は問わない）
// ============================================================
router.get('/:id/holders', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.login_id, u.display_name, sp.avatar_image_key
       FROM student_achievements sa
       JOIN users u ON u.id = sa.student_id
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE sa.sticker_id = ? AND sa.is_visible = 1
       ORDER BY sa.acquired_date DESC`
    )
    .all(req.params.id);

  return res.json(
    rows.map((row) => ({
      loginId: row.login_id,
      displayName: row.display_name,
      avatarImageKey: row.avatar_image_key,
      avatarImageUrl: imageUrl(row.avatar_image_key),
    }))
  );
});

export default router;
