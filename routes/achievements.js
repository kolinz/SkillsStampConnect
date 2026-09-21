// routes/achievements.js
// 実績記録API（🔑 職員全員が使用可、admin限定にしない）
// SDD §7.12・§9.9 準拠

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../lib/database.js';
import { authenticate } from '../lib/auth.js';
import { requireFields } from '../lib/validate.js';

const router = Router();

router.use(authenticate);

// ============================================================
// POST /api/achievements
// ============================================================
router.post('/', (req, res) => {
  const { studentId, stickerId, acquiredDate, notes } = req.body ?? {};

  const fieldsCheck = requireFields(req.body, ['studentId', 'stickerId']);
  if (!fieldsCheck.ok) {
    return res.status(400).json({ error: fieldsCheck.error });
  }

  const student = db
    .prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`)
    .get(studentId);
  if (!student) {
    return res.status(400).json({ error: '指定された学生が見つかりません' });
  }

  const sticker = db.prepare('SELECT id FROM stickers WHERE id = ?').get(stickerId);
  if (!sticker) {
    return res.status(400).json({ error: '指定されたスタンプが見つかりません' });
  }

  const id = randomUUID();

  db.prepare(
    `INSERT INTO student_achievements (
       id, student_id, sticker_id, acquired_date, is_visible, recorded_by, notes
     ) VALUES (?, ?, ?, ?, 0, ?, ?)`
  ).run(id, studentId, stickerId, acquiredDate ?? null, req.user.sub, notes ?? null);

  const row = db.prepare('SELECT * FROM student_achievements WHERE id = ?').get(id);

  return res.status(201).json({
    id: row.id,
    studentId: row.student_id,
    stickerId: row.sticker_id,
    acquiredDate: row.acquired_date,
    isVisible: Boolean(row.is_visible),
    recordedBy: row.recorded_by,
    notes: row.notes,
    createdAt: row.created_at,
  });
});

// ============================================================
// GET /api/achievements?studentId=
// ============================================================
router.get('/', (req, res) => {
  const { studentId } = req.query;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId は必須です' });
  }

  const rows = db
    .prepare(
      `SELECT sa.*, s.name AS sticker_name
       FROM student_achievements sa
       JOIN stickers s ON s.id = sa.sticker_id
       WHERE sa.student_id = ?
       ORDER BY sa.created_at DESC`
    )
    .all(studentId);

  return res.json(
    rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      stickerId: row.sticker_id,
      stickerName: row.sticker_name,
      acquiredDate: row.acquired_date,
      isVisible: Boolean(row.is_visible),
      notes: row.notes,
      createdAt: row.created_at,
    }))
  );
});

// ============================================================
// DELETE /api/achievements/:id
// ============================================================
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM student_achievements WHERE id = ?')
    .get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '実績記録が見つかりません' });
  }

  db.prepare('DELETE FROM student_achievements WHERE id = ?').run(req.params.id);

  return res.status(204).send();
});

export default router;
