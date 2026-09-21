// lib/studentImport.js
// 学生CSV一括インポート
// SDD §4.13 学生アカウント発行フロー / §4.7 ID命名規則の考え方 準拠

import { randomUUID } from 'node:crypto';
import db from './database.js';
import { hashPassword } from './auth.js';

const CSV_HEADER = [
  'display_name',
  'affiliation',
  'position',
  'graduation_year',
  'contact_email',
  'temp_password',
];

/**
 * シンプルな1行分のCSVパース（引用符で囲まれたフィールドのみ最小限対応）。
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * 学生CSVをパースする。
 * @param {string} csvText
 * @returns {{ rows: object[], errors: {row: number, message: string}[] }}
 */
export function parseStudentCsv(csvText) {
  const lines = csvText.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  const rows = [];
  const errors = [];

  if (lines.length === 0) {
    return { rows, errors };
  }

  // 1行目はヘッダー行として読み飛ばす
  const dataLines = lines.slice(1);

  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // ヘッダー行を1行目とした実際の行番号
    const fields = parseCsvLine(line);

    const row = {};
    CSV_HEADER.forEach((key, i) => {
      row[key] = fields[i] ?? '';
    });

    if (!row.display_name || !row.temp_password) {
      errors.push({
        row: rowNumber,
        message: 'display_name と temp_password は必須です',
      });
      return;
    }

    rows.push(row);
  });

  return { rows, errors };
}

/**
 * ユニークな学生ログインIDを生成する。
 * users.login_id との重複チェックは呼び出し側（importStudents）で行う。
 * @returns {string}
 */
export function generateLoginId() {
  return `stu-${randomUUID().slice(0, 8)}`;
}

/**
 * 学生アカウントを一括作成する。
 * 1行ごとに SAVEPOINT を張り、エラーが出た行だけロールバックしてスキップする。
 *
 * @param {object[]} rows - parseStudentCsv が返した rows
 * @param {string} recordedBy - インポートを実行した職員の users.id（現状は未使用だが将来の監査ログ用に受け取る）
 * @returns {Promise<{ created: {loginId: string, displayName: string, tempPassword: string}[], errors: {row: number, message: string}[] }>}
 */
export async function importStudents(rows, recordedBy) {
  const created = [];
  const errors = [];

  db.exec('BEGIN');

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;
    db.exec('SAVEPOINT student_import_row');

    try {
      let loginId = generateLoginId();
      let attempts = 0;
      while (
        db.prepare('SELECT id FROM users WHERE login_id = ?').get(loginId) &&
        attempts < 10
      ) {
        loginId = generateLoginId();
        attempts++;
      }

      const passwordHash = await hashPassword(row.temp_password);
      const id = randomUUID();

      db.prepare(
        `INSERT INTO users (
           id, login_id, password_hash, role, display_name,
           affiliation, position, graduation_year, contact_email,
           must_change_password, status
         ) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, 1, 'active')`
      ).run(
        id,
        loginId,
        passwordHash,
        row.display_name,
        row.affiliation || null,
        row.position || null,
        row.graduation_year ? Number(row.graduation_year) : null,
        row.contact_email || null
      );

      db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(id);

      db.exec('RELEASE student_import_row');

      created.push({
        loginId,
        displayName: row.display_name,
        tempPassword: row.temp_password,
      });
    } catch (err) {
      db.exec('ROLLBACK TO student_import_row');
      db.exec('RELEASE student_import_row');
      errors.push({ row: rowNumber, message: '登録に失敗しました' });
    }
  }

  db.exec('COMMIT');

  return { created, errors };
}
