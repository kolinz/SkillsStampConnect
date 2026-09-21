// lib/validate.js
// 入力バリデーションヘルパー
// SDD §3.3.7 入力バリデーション / §3.3.9 エラーレスポンスの情報漏洩防止 準拠

/**
 * 必須フィールドが存在するか確認する。
 * @param {object} obj
 * @param {string[]} fields
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function requireFields(obj, fields) {
  const missing = fields.filter((field) => {
    const value = obj?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return { ok: false, error: `${missing.join(', ')} は必須です` };
  }
  return { ok: true };
}

/**
 * 英数字・ハイフンのみ・指定文字数以下かチェックする。
 * @param {string} str
 * @param {number} max
 * @returns {boolean}
 */
export function isAlphaHyphen(str, max) {
  if (typeof str !== 'string') return false;
  return /^[a-zA-Z0-9-]+$/.test(str) && str.length <= max;
}

/**
 * 列挙値に含まれるかチェックする。
 * @param {*} val
 * @param {Array} values
 * @returns {boolean}
 */
export function isEnum(val, values) {
  return values.includes(val);
}

/**
 * 文字列長が範囲内かチェックする。
 * @param {string} str
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function isStringRange(str, min, max) {
  if (typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
}
