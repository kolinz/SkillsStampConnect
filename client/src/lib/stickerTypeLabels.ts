// client/src/lib/stickerTypeLabels.ts
// SDD §8.4 スタンプ種別バッジ 準拠
// SkillChip.tsx（Step 14）・StickerModal.tsx（Step 15）が共通で import する。

import type { Sticker } from '../types';

export const STICKER_TYPE_BADGE_CLASS: Record<Sticker['type'], string> = {
  practical: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  lecture: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export const STICKER_TYPE_LABEL: Record<Sticker['type'], string> = {
  practical: '実習',
  lecture: '講義',
};
