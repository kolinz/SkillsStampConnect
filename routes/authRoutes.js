// routes/authRoutes.js
// POST /api/auth/login
// SDD §7.2 準拠

import { Router } from 'express';
import db from '../lib/database.js';
import { verifyPassword, signToken } from '../lib/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username と password は必須です' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username);

  // ユーザーが存在しない場合でも verifyPassword を必ず呼び出し、
  // タイミング攻撃によるユーザー存在有無の推測を防ぐ。
  const isValid = await verifyPassword(password, user ? user.password_hash : null);

  if (!user || !isValid) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    },
  });
});

export default router;
