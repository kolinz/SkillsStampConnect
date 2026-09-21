import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StickerIcon from '../common/StickerIcon';
import SkillChip from './SkillChip';
import type { Category, Sticker } from '../../types';

interface CategoryCardProps {
  cat: Category;
  stickers: Sticker[];
  onCatClick: (cat: Category) => void;
  onStickerClick: (sticker: Sticker) => void;
}

export default function CategoryCard({
  cat,
  stickers,
  onCatClick,
  onStickerClick,
}: CategoryCardProps) {
  const relatedStickers = stickers.filter((s) => s.categories.some((c) => c.id === cat.id));

  const practicalCount = relatedStickers.filter((s) => s.type === 'practical').length;
  const lectureCount = relatedStickers.filter((s) => s.type === 'lecture').length;

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-lg">
      <button
        type="button"
        onClick={() => onCatClick(cat)}
        className="relative block w-full overflow-hidden p-4 text-left text-white"
        style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` }}
      >
        {/* 装飾円（SDD §8.3：Tailwind ユーティリティクラスで実装、名前付きクラスは使わない） */}
        <div className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/10" />

        <div className="relative flex items-start gap-3">
          <StickerIcon imageUrl={cat.imageUrl} emoji={cat.emoji} color="#ffffff" size={40} />
          <div className="min-w-0">
            <div className="font-bold">{cat.name}</div>
            {cat.nameEn && <div className="text-xs text-white/80">{cat.nameEn}</div>}
          </div>
        </div>

        <p className="relative mt-2 text-sm text-white/90">{cat.description}</p>

        <div className="relative mt-3 flex flex-wrap gap-1">
          {cat.targetRoles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>

        <div className="relative mt-2 flex gap-1">
          <Badge variant="outline" className="border-white/30 bg-white/20 text-white">
            実習 {practicalCount} 件
          </Badge>
          <Badge variant="outline" className="border-white/30 bg-white/20 text-white">
            講義 {lectureCount} 件
          </Badge>
        </div>
      </button>

      <div className="flex flex-wrap gap-2 p-3">
        {relatedStickers.map((sticker) => (
          <SkillChip
            key={sticker.id}
            sticker={sticker}
            onClick={onStickerClick}
            faded={sticker.primaryCategoryId !== cat.id}
          />
        ))}
      </div>
    </Card>
  );
}
