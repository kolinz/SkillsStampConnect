// client/src/types.ts
// SDD Appendix B：型定義（TypeScript 形式）より、v9.0 時点（学生機能を除く）のものを実装する。

export type StickerType = 'practical' | 'lecture';
export type StickerLevel = '実践' | '知識';
export type UserRole = 'admin' | 'user' | 'student';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  stickerCount?: number; // GET /api/users のみ付与
  createdAt?: string;
}

export interface Course {
  id: string;
  stickerId: string;
  name: string;
  code?: string;
  type?: StickerType; // null の場合は親 sticker.type を継承
  hours?: number;
  curriculumYear: number;
  contentNote?: string;
  sortOrder?: number;
}

export interface StickerCategory {
  id: string;
  name: string;
  areaCode: string;
  color: string;
}

export interface Sticker {
  id: string; // NSS-{AREA}-{TYPE}{SEQ}{VER}
  primaryCategoryId: string; // 表示色・ID AREA の基準
  categories: StickerCategory[]; // 全所属カテゴリー（primaryCategory 含む）
  createdBy: { id: string; displayName: string } | null;
  name: string;
  nameEn?: string;
  type: StickerType;
  color: string; // HEX 例: "#2563EB"
  emoji: string;
  imageKey: string | null; // ファイルパスキー
  imageUrl: string | null; // API レスポンス時に組み立て済み URL
  description: string; // Can-Do 記述
  skills: string[];
  level: StickerLevel;
  version: string; // 例: "v01"
  sortOrder?: number;
  courses: Course[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  areaCode: string; // スタンプ ID の AREA 部分
  emoji: string;
  color: string;
  imageKey: string | null;
  imageUrl: string | null;
  description: string;
  targetRoles: string[];
  recruitMessage?: string;
  sortOrder?: number;
  stickerCount?: number; // GET /api/categories のみ付与
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ログイン中のユーザーとして App.tsx の state に保持する型。
 * POST /api/auth/login のレスポンス（{ token, user }）から組み立てる。
 * Appendix B には存在しないクライアント側専用の型。
 */
export interface CurrentUser {
  token: string;
  id: string;
  username: string;
  displayName?: string;
  role: UserRole;
  mustChangePassword: boolean;
}

/**
 * GET/PUT /api/my/profile のレスポンス形（Step 23）に対応するクライアント側の型。
 */
export interface StudentProfile {
  loginId: string;
  displayName: string;
  affiliation?: string;
  position?: string;
  graduationYear?: number;
  contactEmail?: string;
  emailPublic: boolean;
  avatarImageKey: string | null;
  avatarImageUrl: string | null;
  xHandle?: string;
  linkedinUrl?: string;
  otherSkills?: string;
  goal?: string;
  bio?: string;
  externalPublic: boolean;
}

/**
 * GET /api/my/achievements のレスポンス形（Step 23）に対応するクライアント側の型。
 */
export interface Achievement {
  id: string;
  stickerId: string;
  stickerName: string;
  emoji: string;
  color: string;
  imageUrl: string | null;
  acquiredDate?: string;
  isVisible: boolean;
  notes?: string;
  createdAt?: string;
}

/**
 * GET /api/stickers/:id/holders のレスポンス形（Step 24）に対応するクライアント側の型。
 */
export interface StudentHolder {
  loginId: string;
  displayName: string;
  avatarImageKey: string | null;
  avatarImageUrl: string | null;
}

/**
 * GET /api/students-public のレスポンス形（Step 24）に対応するクライアント側の型。
 */
export interface PublicStudentSummary {
  loginId: string;
  displayName: string;
  avatarImageKey: string | null;
  avatarImageUrl: string | null;
  bio?: string;
  visibleStickerCount: number;
}

/**
 * 公開プロフィールの実績1件分の型。
 * GET /api/students/:loginId/profile・GET /api/public/profile/:loginId（Step 30）で共用する。
 */
export interface PublicAchievement {
  stickerId: string;
  stickerName: string;
  emoji: string;
  color: string;
  imageUrl: string | null;
  acquiredDate?: string;
}

/**
 * GET /api/students/:loginId/profile・GET /api/public/profile/:loginId（Step 30）の
 * レスポンス形に対応するクライアント側の型。
 */
export interface PublicStudentProfile {
  loginId: string;
  displayName: string;
  avatarImageKey: string | null;
  avatarImageUrl: string | null;
  xHandle?: string;
  linkedinUrl?: string;
  goal?: string;
  otherSkills?: string;
  bio?: string;
  contactEmail?: string;
  achievements: PublicAchievement[];
}
