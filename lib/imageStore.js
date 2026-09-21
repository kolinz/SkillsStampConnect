// lib/imageStore.js
// SkillsStampConnect 画像ストレージ（ローカルファイルシステム）
// SDD §6.2 ファイルシステム / §3.3.4 パストラバーサル対策 準拠

import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

/** MIME タイプ → 拡張子マッピング */
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * アップロードされた一時ファイルを永続化する。
 *
 * @param {{ path: string, mimetype: string }} file - 一時ファイルのパスと MIME タイプ
 * @param {string} prefix - 保存先サブディレクトリ（categories / stickers / students）
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function saveImage(file, prefix) {
  const ext = MIME_TO_EXT[file.mimetype];
  if (!ext) {
    throw new Error(`サポートされていない画像形式です: ${file.mimetype}`);
  }

  const filename = `${randomUUID()}${ext}`;
  const key = `${prefix}/${filename}`;
  const destDir = path.join(UPLOAD_DIR, prefix);
  const destPath = path.join(destDir, filename);

  await mkdir(destDir, { recursive: true });
  await rename(file.path, destPath);

  return {
    key,
    url: imageUrl(key),
  };
}

/**
 * 画像ファイルを削除する。パストラバーサル対策として、
 * 解決後のパスが UPLOAD_DIR 配下であることを検証する。
 *
 * @param {string} key - 例: "stickers/550e8400-....png"
 * @returns {Promise<void>}
 */
export async function deleteImage(key) {
  const resolvedPath = path.resolve(UPLOAD_DIR, key);
  const uploadDirWithSep = UPLOAD_DIR.endsWith(path.sep)
    ? UPLOAD_DIR
    : `${UPLOAD_DIR}${path.sep}`;

  if (!resolvedPath.startsWith(uploadDirWithSep)) {
    throw new Error('不正な画像キーです（パストラバーサルの可能性）');
  }

  try {
    await unlink(resolvedPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // ファイルが存在しない場合は無視する
  }
}

/**
 * 画像キーから配信用 URL を組み立てる。
 *
 * @param {string | null | undefined} key
 * @returns {string | null}
 */
export function imageUrl(key) {
  if (key === null || key === undefined) {
    return null;
  }
  return `/uploads/${key}`;
}
