import StickerIcon from '../common/StickerIcon';
import { STICKER_TYPE_BADGE_CLASS, STICKER_TYPE_LABEL } from '../../lib/stickerTypeLabels';
import type { Sticker } from '../../types';

interface SkillChipProps {
  sticker: Sticker;
  onClick: (sticker: Sticker) => void;
  faded?: boolean;
}

export default function SkillChip({ sticker, onClick, faded = false }: SkillChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(sticker)}
      style={faded ? { opacity: 0.55 } : { borderColor: sticker.color }}
      className={
        faded
          ? 'flex items-center gap-2 rounded-full border border-transparent bg-background px-2 py-1 text-left transition-shadow hover:shadow-md'
          : 'flex items-center gap-2 rounded-full border bg-background px-2 py-1 text-left transition-shadow hover:shadow-md'
      }
    >
      <StickerIcon imageUrl={sticker.imageUrl} emoji={sticker.emoji} color={sticker.color} size={28} />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{sticker.name}</span>
        <span className="text-xs text-muted-foreground">{sticker.id}</span>
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs ${STICKER_TYPE_BADGE_CLASS[sticker.type]}`}
      >
        {STICKER_TYPE_LABEL[sticker.type]}
      </span>
    </button>
  );
}
