// server.js
// SkillsStampConnect Express サーバー本体
// SDD §3.3・§3.4・§10.5 準拠

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import authRoutes from './routes/authRoutes.js';
import categoriesRoutes from './routes/categories.js';
import stickersRoutes from './routes/stickers.js';
import usersRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';
import studentsRoutes from './routes/students.js';
import meRoutes from './routes/me.js';
import achievementsRoutes from './routes/achievements.js';
import publicProfileRoutes from './routes/publicProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ENV = process.env.APP_ENV ?? 'development';
const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
const CLIENT_DIST_DIR = path.join(__dirname, 'client', 'dist');

const app = express();

// ============================================================
// 1. helmet（セキュリティヘッダー、CSP は inline script を禁止）
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// ============================================================
// 2. ボディパーサー
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 3. CORS（development のみ localhost:5173 を許可。staging/production は同一オリジンのため未適用）
// ============================================================
if (APP_ENV === 'development') {
  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    })
  );
}

// ============================================================
// 4. レート制限（ログイン API のみ: 15分間に10回まで）
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ログイン試行回数が上限に達しました。しばらくしてから再試行してください' },
});

// ============================================================
// 5. ルーターのマウント
// ============================================================
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stickers', stickersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', uploadRoutes); // POST /api/upload, DELETE /api/image/:key(*)
app.use('/api/students', studentsRoutes); // GET /api/students-public もこのルーターが担う
app.use('/api/my', meRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/public/profile', publicProfileRoutes); // 認証ミドルウェアなし

// ============================================================
// 6. アップロード画像の静的配信
// ============================================================
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR));

// ============================================================
// 7. SPA フォールバック（本番ビルドが存在する場合のみ）
// ============================================================
if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
  });
}

// ============================================================
// 8. グローバルエラーハンドラー
// ============================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);

  const status = err.status ?? 500;
  const message =
    APP_ENV !== 'development' ? 'サーバーエラーが発生しました' : err.message;

  res.status(status).json({ error: message });
});

// ============================================================
// 起動
// ============================================================
app.listen(PORT, () => {
  console.log(`SkillsStampConnect server listening on port ${PORT} (${APP_ENV})`);
});
