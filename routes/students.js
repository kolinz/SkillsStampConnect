// routes/students.js
// 学生管理API（CSVインポート・一覧・状態変更）／公開学生一覧API
// SDD §7.8・§7.1・§7.11・§9.7・9.8 準拠

import { Router } from 'express';
import Busboy from '@fastify/busboy';
import db from '../lib/database.js';
import { authenticate, requireAdmin } from '../lib/auth.js';
import { imageUrl } from '../lib/imageStore.js';
import { parseStudentCsv, importStudents } from '../lib/studentImport.js';
import { requireFields, isEnum, isStringRange } from '../lib/validate.js';

const router = Router();

function toApiShape(row) {
  return {
    loginId: row.login_id,
    displayName: row.display_name,
    affiliation: row.affiliation,
    position: row.position,
    graduationYear: row.graduation_year,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ============================================================
// POST /api/students/import（authenticate + requireAdmin）
// ============================================================
router.post('/import', authenticate, requireAdmin, (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  let csvText = '';
  let responded = false;
  let handledFile = false;

  function respondOnce(statusCode, body) {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(body);
  }

  busboy.on('file', (fieldname, fileStream) => {
    handledFile = true;
    fileStream.setEncoding('utf-8');
    fileStream.on('data', (chunk) => {
      csvText += chunk;
    });
  });

  busboy.on('finish', async () => {
    if (!handledFile) {
      return respondOnce(400, { error: 'CSVファイルが送信されていません' });
    }

    try {
      const { rows, errors: parseErrors } = parseStudentCsv(csvText);
      const { created, errors: importErrors } = await importStudents(rows, req.user.sub);
      return respondOnce(201, {
        created,
        errors: [...parseErrors, ...importErrors],
      });
    } catch (err) {
      return respondOnce(500, { error: 'インポート処理中にエラーが発生しました' });
    }
  });

  busboy.on('error', () => {
    respondOnce(500, { error: 'アップロード処理中にエラーが発生しました' });
  });

  req.pipe(busboy);
});

// ============================================================
// GET /api/students（authenticate + requireAdmin）
// ============================================================
router.get('/', authenticate, requireAdmin, (req, res) => {
  const { q } = req.query;

  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(
        `SELECT login_id, display_name, affiliation, position, graduation_year, status, created_at
         FROM users
         WHERE role = 'student' AND (display_name LIKE ? OR login_id LIKE ?)
         ORDER BY created_at DESC`
      )
      .all(like, like);
  } else {
    rows = db
      .prepare(
        `SELECT login_id, display_name, affiliation, position, graduation_year, status, created_at
         FROM users
         WHERE role = 'student'
         ORDER BY created_at DESC`
      )
      .all();
  }

  return res.json(rows.map(toApiShape));
});

// ============================================================
// GET /api/students-public（authenticate のみ）
// ============================================================
router.get('/-public', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT u.login_id, u.display_name, sp.avatar_image_key, sp.bio,
         (SELECT COUNT(*) FROM student_achievements sa2
          WHERE sa2.student_id = u.id AND sa2.is_visible = 1) AS visible_sticker_count
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'student'
         AND EXISTS (
           SELECT 1 FROM student_achievements sa
           WHERE sa.student_id = u.id AND sa.is_visible = 1
         )`
    )
    .all();

  return res.json(
    rows.map((row) => ({
      loginId: row.login_id,
      displayName: row.display_name,
      avatarImageKey: row.avatar_image_key,
      avatarImageUrl: imageUrl(row.avatar_image_key),
      bio: row.bio,
      visibleStickerCount: row.visible_sticker_count,
    }))
  );
});

// ============================================================
// GET /api/students/:loginId/profile（authenticate のみ）
// ============================================================
router.get('/:loginId/profile', authenticate, (req, res) => {
  const user = db
    .prepare(`SELECT * FROM users WHERE login_id = ? AND role = 'student'`)
    .get(req.params.loginId);

  if (!user) {
    return res.status(404).json({ error: '学生が見つかりません' });
  }

  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(user.id);

  const achievements = db
    .prepare(
      `SELECT sa.id, sa.sticker_id, sa.acquired_date, s.name AS sticker_name, s.emoji, s.color, s.image_key
       FROM student_achievements sa
       JOIN stickers s ON s.id = sa.sticker_id
       WHERE sa.student_id = ? AND sa.is_visible = 1
       ORDER BY sa.acquired_date DESC`
    )
    .all(user.id);

  const response = {
    loginId: user.login_id,
    displayName: user.display_name,
    avatarImageKey: profile?.avatar_image_key ?? null,
    avatarImageUrl: imageUrl(profile?.avatar_image_key),
    xHandle: profile?.x_handle ?? null,
    linkedinUrl: profile?.linkedin_url ?? null,
    goal: profile?.goal ?? null,
    otherSkills: profile?.other_skills ?? null,
    bio: profile?.bio ?? null,
    achievements: achievements.map((row) => ({
      id: row.id,
      stickerId: row.sticker_id,
      stickerName: row.sticker_name,
      emoji: row.emoji,
      color: row.color,
      imageUrl: imageUrl(row.image_key),
      acquiredDate: row.acquired_date,
    })),
  };

  if (user.email_public) {
    response.contactEmail = user.contact_email;
  }

  return res.json(response);
});

// ============================================================
// PUT /api/students/:loginId/status（authenticate + requireAdmin）
// ============================================================
router.put('/:loginId/status', authenticate, requireAdmin, (req, res) => {
  const { status } = req.body ?? {};

  const fieldsCheck = requireFields(req.body, ['status']);
  if (!fieldsCheck.ok) {
    return res.status(400).json({ error: fieldsCheck.error });
  }
  if (!isEnum(status, ['active', 'suspended'])) {
    return res.status(400).json({ error: "status は 'active' または 'suspended' で指定してください" });
  }

  const existing = db
    .prepare(`SELECT id FROM users WHERE login_id = ? AND role = 'student'`)
    .get(req.params.loginId);
  if (!existing) {
    return res.status(404).json({ error: '学生が見つかりません' });
  }

  db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE login_id = ?`).run(
    status,
    req.params.loginId
  );

  return res.status(204).send();
});

// ============================================================
// PUT /api/students/:loginId/display-name（authenticate + requireAdmin）
// ============================================================
router.put('/:loginId/display-name', authenticate, requireAdmin, (req, res) => {
  const { displayName } = req.body ?? {};

  if (!isStringRange(displayName, 1, 50)) {
    return res.status(400).json({ error: 'displayName は1〜50文字で指定してください' });
  }

  const existing = db
    .prepare(`SELECT id FROM users WHERE login_id = ? AND role = 'student'`)
    .get(req.params.loginId);
  if (!existing) {
    return res.status(404).json({ error: '学生が見つかりません' });
  }

  db.prepare(
    `UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE login_id = ?`
  ).run(displayName, req.params.loginId);

  return res.status(204).send();
});

// ============================================================
// DELETE /api/students/:loginId（authenticate + requireAdmin）
// ============================================================
router.delete('/:loginId', authenticate, requireAdmin, (req, res) => {
  const existing = db
    .prepare(`SELECT id FROM users WHERE login_id = ? AND role = 'student'`)
    .get(req.params.loginId);
  if (!existing) {
    return res.status(404).json({ error: '学生が見つかりません' });
  }

  db.prepare('DELETE FROM users WHERE login_id = ?').run(req.params.loginId);

  return res.status(200).json({
    message:
      '削除ではなく、PUT /api/students/:loginId/status で status を suspended に変更することを推奨します',
  });
});

export default router;
