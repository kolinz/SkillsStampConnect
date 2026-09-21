// routes/publicProfile.js
// 外部公開プロフィールAPI（v11.0。認証不要）
// SDD §7.13・§4.9・Appendix E: ADR-032 準拠
//
// 認証ミドルウェアは一切適用しない。JWT・トークンいずれも不要。

import { Router } from 'express';
import db from '../lib/database.js';
import { imageUrl } from '../lib/imageStore.js';

const router = Router();

// ============================================================
// GET /api/public/profile/:loginId（認証不要）
// ============================================================
router.get('/:loginId', (req, res) => {
  const user = db
    .prepare(
      `SELECT u.*, sp.avatar_image_key, sp.x_handle, sp.linkedin_url,
              sp.other_skills, sp.goal, sp.bio, sp.external_public
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.login_id = ? AND u.role = 'student' AND u.status = 'active'`
    )
    .get(req.params.loginId);

  // 存在しない場合・非公開の場合、いずれも同一の404で存在自体を秘匿する
  if (!user || !user.external_public) {
    return res.status(404).json({ error: 'このプロフィールは見つかりません' });
  }

  const achievements = db
    .prepare(
      `SELECT sa.sticker_id, s.name AS sticker_name, s.emoji, s.color, sa.acquired_date
       FROM student_achievements sa
       JOIN stickers s ON s.id = sa.sticker_id
       WHERE sa.student_id = ? AND sa.is_visible = 1
       ORDER BY sa.acquired_date DESC`
    )
    .all(user.id);

  const response = {
    displayName: user.display_name,
    avatarImageKey: user.avatar_image_key,
    avatarImageUrl: imageUrl(user.avatar_image_key),
    xHandle: user.x_handle,
    linkedinUrl: user.linkedin_url,
    otherSkills: user.other_skills,
    goal: user.goal,
    bio: user.bio,
    achievements: achievements.map((row) => ({
      stickerId: row.sticker_id,
      stickerName: row.sticker_name,
      emoji: row.emoji,
      color: row.color,
      acquiredDate: row.acquired_date,
    })),
  };

  if (user.email_public) {
    response.contactEmail = user.contact_email;
  }

  return res.json(response);
});

export default router;
