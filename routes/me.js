// routes/me.js
// マイページAPI（プロフィール・実績・公開設定）
// SDD §7.9・§7.10・§9.11 準拠

import { Router } from 'express';
import db from '../lib/database.js';
import { authenticate, requireStudent, hashPassword } from '../lib/auth.js';
import { imageUrl } from '../lib/imageStore.js';

const router = Router();

router.use(authenticate, requireStudent);

function toProfileShape(row) {
  return {
    loginId: row.login_id,
    displayName: row.display_name,
    affiliation: row.affiliation,
    position: row.position,
    graduationYear: row.graduation_year,
    contactEmail: row.contact_email,
    emailPublic: Boolean(row.email_public),
    avatarImageKey: row.avatar_image_key,
    avatarImageUrl: imageUrl(row.avatar_image_key),
    xHandle: row.x_handle,
    linkedinUrl: row.linkedin_url,
    otherSkills: row.other_skills,
    goal: row.goal,
    bio: row.bio,
    externalPublic: Boolean(row.external_public),
  };
}

const PROFILE_SELECT = `SELECT
     u.login_id, u.display_name, u.affiliation, u.position, u.graduation_year,
     u.contact_email, u.email_public,
     sp.avatar_image_key, sp.x_handle, sp.linkedin_url,
     sp.other_skills, sp.goal, sp.bio, sp.external_public
   FROM users u
   JOIN student_profiles sp ON sp.user_id = u.id
   WHERE u.id = ?`;

// ============================================================
// GET /api/my/profile
// ============================================================
router.get('/profile', (req, res) => {
  const row = db.prepare(PROFILE_SELECT).get(req.user.sub);

  if (!row) {
    return res.status(404).json({ error: 'プロフィールが見つかりません' });
  }

  return res.json(toProfileShape(row));
});

// ============================================================
// PUT /api/my/profile
// ============================================================
router.put('/profile', (req, res) => {
  const {
    displayName,
    avatarImageKey,
    xHandle,
    linkedinUrl,
    otherSkills,
    goal,
    bio,
    contactEmail,
    emailPublic,
    externalPublic,
  } = req.body ?? {};

  // affiliation・position・graduationYear・loginId・status は
  // リクエストに含まれていても無視する（本人からの更新を拒否）

  const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
  const existingProfile = db
    .prepare('SELECT * FROM student_profiles WHERE user_id = ?')
    .get(req.user.sub);

  if (!existingUser || !existingProfile) {
    return res.status(404).json({ error: 'プロフィールが見つかりません' });
  }

  db.exec('BEGIN');
  try {
    db.prepare(
      `UPDATE users SET
         display_name = ?,
         contact_email = ?,
         email_public = ?,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      displayName ?? existingUser.display_name,
      contactEmail ?? existingUser.contact_email,
      emailPublic !== undefined ? Number(Boolean(emailPublic)) : existingUser.email_public,
      req.user.sub
    );

    // externalPublic を true にする際もトークンの発行・再発行は一切行わない。
    // login_id は固定の識別子であり、この更新の影響を受けない。
    db.prepare(
      `UPDATE student_profiles SET
         avatar_image_key = ?,
         x_handle = ?,
         linkedin_url = ?,
         other_skills = ?,
         goal = ?,
         bio = ?,
         external_public = ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(
      avatarImageKey ?? existingProfile.avatar_image_key,
      xHandle ?? existingProfile.x_handle,
      linkedinUrl ?? existingProfile.linkedin_url,
      otherSkills ?? existingProfile.other_skills,
      goal ?? existingProfile.goal,
      bio ?? existingProfile.bio,
      externalPublic !== undefined
        ? Number(Boolean(externalPublic))
        : existingProfile.external_public,
      req.user.sub
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const row = db.prepare(PROFILE_SELECT).get(req.user.sub);
  return res.json(toProfileShape(row));
});

// ============================================================
// PUT /api/my/password
// ============================================================
router.put('/password', async (req, res) => {
  const { newPassword } = req.body ?? {};

  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword は必須です' });
  }

  const passwordHash = await hashPassword(newPassword);

  db.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
     WHERE id = ?`
  ).run(passwordHash, req.user.sub);

  return res.status(204).send();
});

// ============================================================
// GET /api/my/achievements
// ============================================================
router.get('/achievements', (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         sa.id, sa.sticker_id, sa.acquired_date, sa.is_visible, sa.notes, sa.created_at,
         s.name AS sticker_name, s.emoji, s.color, s.image_key
       FROM student_achievements sa
       JOIN stickers s ON s.id = sa.sticker_id
       WHERE sa.student_id = ?
       ORDER BY sa.acquired_date DESC`
    )
    .all(req.user.sub);

  return res.json(
    rows.map((row) => ({
      id: row.id,
      stickerId: row.sticker_id,
      stickerName: row.sticker_name,
      emoji: row.emoji,
      color: row.color,
      imageUrl: imageUrl(row.image_key),
      acquiredDate: row.acquired_date,
      isVisible: Boolean(row.is_visible),
      notes: row.notes,
      createdAt: row.created_at,
    }))
  );
});

// ============================================================
// PUT /api/my/achievements/:id/visibility
// ============================================================
router.put('/achievements/:id/visibility', (req, res) => {
  const { isVisible } = req.body ?? {};

  const achievement = db
    .prepare('SELECT * FROM student_achievements WHERE id = ?')
    .get(req.params.id);

  if (!achievement) {
    return res.status(404).json({ error: '実績が見つかりません' });
  }
  if (achievement.student_id !== req.user.sub) {
    return res.status(403).json({ error: 'この操作を行う権限がありません' });
  }

  db.prepare('UPDATE student_achievements SET is_visible = ? WHERE id = ?').run(
    Number(Boolean(isVisible)),
    req.params.id
  );

  return res.status(204).send();
});

export default router;
