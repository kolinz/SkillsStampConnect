// routes/upload.js
// POST /api/upload・DELETE /api/image/:key(*)
// @fastify/busboy を直接使用する（multer は使用しない）
// SDD §7.5・§3.3.5 準拠

import { Router } from 'express';
import Busboy from '@fastify/busboy';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { authenticate } from '../lib/auth.js';
import { saveImage, deleteImage } from '../lib/imageStore.js';

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PREFIXES = ['stickers', 'categories', 'students'];

const EXT_FALLBACK_BY_FILENAME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
const TMP_DIR = path.join(UPLOAD_DIR, 'tmp');

/**
 * ファイル名の拡張子から MIME タイプを推測する（フォールバック用）。
 */
function guessMimeFromFilename(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return EXT_FALLBACK_BY_FILENAME[ext] ?? null;
}

// ============================================================
// POST /api/upload（authenticate）
// ============================================================
router.post('/upload', authenticate, async (req, res) => {
  const prefix = ALLOWED_PREFIXES.includes(req.query.prefix) ? req.query.prefix : 'stickers';

  await mkdir(TMP_DIR, { recursive: true });

  const busboy = new Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  let responded = false;
  let handledFile = false;

  function respondOnce(statusCode, body) {
    if (responded) return;
    responded = true;
    res.status(statusCode).json(body);
  }

  busboy.on(
    'file',
    (fieldname, fileStream, filename, encoding, mimeType) => {
      handledFile = true;

      const effectiveMimeType = mimeType || guessMimeFromFilename(filename);

      if (!effectiveMimeType || !ALLOWED_MIME_TYPES.includes(effectiveMimeType)) {
        fileStream.resume(); // ストリームを読み捨てて busboy の finish を発火させる
        return respondOnce(400, {
          error: '許可されていないファイル形式です（jpeg/png/webp/gif のみ）',
        });
      }

      const tmpPath = path.join(TMP_DIR, randomUUID());
      const writeStream = createWriteStream(tmpPath);

      let tooLarge = false;

      fileStream.on('limit', () => {
        tooLarge = true;
        writeStream.destroy();
      });

      fileStream.pipe(writeStream);

      writeStream.on('finish', async () => {
        if (tooLarge) {
          await unlink(tmpPath).catch(() => {});
          return respondOnce(400, { error: 'ファイルサイズは5MB以内にしてください' });
        }
        if (responded) {
          await unlink(tmpPath).catch(() => {});
          return;
        }

        try {
          const { key, url } = await saveImage(
            { path: tmpPath, mimetype: effectiveMimeType },
            prefix
          );
          return respondOnce(201, { key, url });
        } catch (err) {
          await unlink(tmpPath).catch(() => {});
          return respondOnce(500, { error: 'ファイルの保存に失敗しました' });
        }
      });

      writeStream.on('error', async () => {
        await unlink(tmpPath).catch(() => {});
        return respondOnce(500, { error: 'ファイルの保存に失敗しました' });
      });
    }
  );

  busboy.on('finish', () => {
    if (!handledFile) {
      respondOnce(400, { error: 'ファイルが送信されていません' });
    }
  });

  busboy.on('error', () => {
    respondOnce(500, { error: 'アップロード処理中にエラーが発生しました' });
  });

  req.pipe(busboy);
});

// ============================================================
// DELETE /api/image/:key(*)（authenticate）
// ============================================================
router.delete('/image/:key(*)', authenticate, async (req, res) => {
  const key = req.params[0] ?? req.params.key;

  try {
    await deleteImage(key);
    return res.status(204).send();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
