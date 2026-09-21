import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StickerIcon from '../common/StickerIcon';
import type { Category, Sticker } from '../../types';

interface CategoryModalProps {
  cat: Category;
  stickers: Sticker[];
  onClose: () => void;
  onStickerClick: (sticker: Sticker) => void;
}

export default function CategoryModal({
  cat,
  stickers,
  onClose,
  onStickerClick,
}: CategoryModalProps) {
  const relatedStickers = stickers.filter((s) => s.categories.some((c) => c.id === cat.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {/* 1. ヘッダー */}
        <div
          className="-m-6 mb-4 rounded-t-lg p-4 text-white"
          style={{ background: cat.color }}
        >
          <div className="flex items-start gap-3">
            <StickerIcon imageUrl={cat.imageUrl} emoji={cat.emoji} color="#ffffff" size={40} />
            <div className="min-w-0">
              <div className="font-bold">{cat.name}</div>
              {cat.nameEn && <div className="text-xs text-white/80">{cat.nameEn}</div>}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {cat.targetRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* 2. 採用担当者向けメッセージ */}
        {cat.recruitMessage && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription className="text-amber-900">{cat.recruitMessage}</AlertDescription>
          </Alert>
        )}

        {/* 3. スタンプ一覧 */}
        <div className="mt-3 flex flex-col gap-1">
          {relatedStickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => onStickerClick(sticker)}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
            >
              <StickerIcon
                imageUrl={sticker.imageUrl}
                emoji={sticker.emoji}
                color={sticker.color}
                size={32}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{sticker.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{sticker.id}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
