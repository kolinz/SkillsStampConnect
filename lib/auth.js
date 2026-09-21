// lib/auth.js
// SkillsStampConnect 認証ライブラリ（JWT・パスワードハッシュ・認可ミドルウェア）
// node:crypto のみを使用し、外部ライブラリには依存しない。
// SDD §7.2〜7.3 / Appendix E ADR-016 準拠

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN ?? 28800); // 秒（デフォルト8時間）

// ============================================================
// パスワードハッシュ（scrypt）
// ============================================================

const SCRYPT_KEYLEN = 64;
// verifyPassword でユーザーが存在しない場合でもタイミングを揃えるためのダミーハッシュ
const DUMMY_HASH = `${randomBytes(16).toString('hex')}:${'0'.repeat(SCRYPT_KEYLEN * 2)}`;

/**
 * パスワードを scrypt でハッシュ化する。
 * @param {string} password
 * @returns {Promise<string>} "{salt}:{hash}" 形式（いずれも hex 文字列）
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * パスワードを検証する。timingSafeEqual によりタイミング攻撃を防ぐ。
 * @param {string} password - 検証対象の平文パスワード
 * @param {string} stored - "{salt}:{hash}" 形式の保存済みハッシュ
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const source = stored || DUMMY_HASH;
  const [salt, hashHex] = source.split(':');

  const derivedKey = await scrypt(password, salt, SCRYPT_KEYLEN);
  const storedHashBuffer = Buffer.from(hashHex, 'hex');

  if (derivedKey.length !== storedHashBuffer.length) {
    return false;
  }

  const isMatch = timingSafeEqual(derivedKey, storedHashBuffer);
  // stored が渡されていなかった（＝ユーザーが存在しなかった）場合は
  // ダミーハッシュとの比較結果に関わらず常に false を返す
  return Boolean(stored) && isMatch;
}

// ============================================================
// JWT（HS256、node:crypto のみで実装）
// ============================================================

function base64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, 'base64');
}

function sign(data) {
  const hmac = createHmac('sha256', JWT_SECRET);
  hmac.update(data);
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * JWT（HS256）を発行する。
 * @param {object} payload
 * @returns {string}
 */
export function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRES_IN,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * JWT を検証する。署名不正・期限切れの場合は Error を throw する。
 * @param {string} token
 * @returns {object} デコードされたペイロード
 */
export function verifyToken(token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    throw new Error('不正なトークン形式です');
  }

  const [encodedHeader, encodedPayload, signature] = token.split('.');

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('トークンの署名が不正です');
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf-8'));

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && now >= payload.exp) {
    throw new Error('トークンの有効期限が切れています');
  }

  return payload;
}

// ============================================================
// 認可ミドルウェア
// ============================================================

/**
 * Authorization: Bearer {token} ヘッダーを検証し、req.user にペイロードをセットする。
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: '認証トークンが必要です' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: '認証トークンが無効です' });
  }
}

/**
 * admin ロールのみ許可する。
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'この操作には管理者権限が必要です' });
  }
  return next();
}

/**
 * リソースの所有者（createdBy）または admin のみ許可する。
 * createdBy が null の場合は admin のみ許可する。
 *
 * @param {string | null} createdBy
 */
export function requireOwnerOrAdmin(createdBy) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '認証トークンが必要です' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = createdBy !== null && req.user.sub === createdBy;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'この操作を行う権限がありません' });
    }

    return next();
  };
}

/**
 * student ロールのみ許可する（/api/my/* 系エンドポイント用）。
 */
export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'この操作には学生アカウントが必要です' });
  }
  return next();
}
