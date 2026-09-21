import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import StickerIcon from '../common/StickerIcon';
import YearBadge from '../common/YearBadge';
import { STICKER_TYPE_BADGE_CLASS, STICKER_TYPE_LABEL } from '../../lib/stickerTypeLabels';
import type { Category, Sticker, StudentHolder } from '../../types';
import type { authFetch as authFetchType } from '../../App';

interface StickerModalProps {
  sticker: Sticker;
  cat: Category;
  onClose: () => void;
  authFetch: typeof authFetchType;
  onStudentClick: (loginId: string) => void;
}

const LATEST_CURRICULUM_YEAR = Number(import.meta.env.VITE_LATEST_CURRICULUM_YEAR ?? 2025);

export default function StickerModal({
  sticker,
  cat,
  onClose,
  authFetch,
  onStudentClick,
}: StickerModalProps) {
  const [holders, setHolders] = useState<StudentHolder[]>([]);

  useEffect(() => {
    authFetch(`/api/stickers/${sticker.id}/holders`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setHolders)
      .catch(() => setHolders([]));
  }, [sticker.id]);

  const coursesByYear = new Map<number, typeof sticker.courses>();
  for (const course of sticker.courses) {
    const list = coursesByYear.get(course.curriculumYear) ?? [];
    list.push(course);
    coursesByYear.set(course.curriculumYear, list);
  }
  const years = [...coursesByYear.keys()].sort((a, b) => b - a);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {/* 1. パンくず */}
        <div className="text-xs text-muted-foreground">
          {cat.name} <span className="mx-1">›</span> {sticker.name}
        </div>

        {/* 2. ヘッダー */}
        <div
          className="-mx-6 mt-1 rounded-t-lg p-4"
          style={{ background: `linear-gradient(135deg, ${sticker.color}22, ${sticker.color}08)` }}
        >
          <div className="flex items-center gap-3">
            <StickerIcon
              imageUrl={sticker.imageUrl}
              emoji={sticker.emoji}
              color={sticker.color}
              size={48}
            />
            <div className="min-w-0">
              <div className="font-bold">{sticker.name}</div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span className={`rounded px-1.5 py-0.5 ${STICKER_TYPE_BADGE_CLASS[sticker.type]}`}>
                  {STICKER_TYPE_LABEL[sticker.type]}
                </span>
                <span>{sticker.id}</span>
                <span>{sticker.level}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Can-Do 記述 */}
        <div
          className="mt-3 rounded-md bg-muted p-3 text-sm"
          style={{ borderLeft: `3px solid ${sticker.color}` }}
        >
          {sticker.description}
        </div>

        {/* 4. 習得スキル */}
        <div className="mt-3 flex flex-wrap gap-1">
          {sticker.skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="rounded-full"
              style={{
                background: `${sticker.color}15`,
                borderColor: `${sticker.color}44`,
                color: sticker.color,
              }}
            >
              {skill}
            </Badge>
          ))}
        </div>

        {/* 5. 関連授業（年度別） */}
        <div className="mt-4 flex flex-col gap-3">
          {years.map((year) => {
            const isLatest = year === LATEST_CURRICULUM_YEAR;
            return (
              <div
                key={year}
                className={`rounded-md p-2 ${
                  isLatest ? 'border' : 'border border-dashed opacity-85'
                }`}
              >
                <YearBadge year={year} isLatest={isLatest} />
                <div className="mt-2 flex flex-col gap-2">
                  {coursesByYear.get(year)!.map((course) => (
                    <div key={course.id} className="text-sm">
                      <div className="font-medium">
                        {course.name}
                        {course.code && (
                          <span className="ml-1 text-xs text-muted-foreground">{course.code}</span>
                        )}
                      </div>
                      {course.hours != null && (
                        <div className="text-xs text-muted-foreground">{course.hours} 時間</div>
                      )}
                      {course.contentNote && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                          {course.contentNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. 取得学生一覧 */}
        {holders.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">取得学生一覧</div>
            <ul className="flex flex-col gap-1">
              {holders.map((holder) => (
                <li key={holder.loginId}>
                  <button
                    type="button"
                    onClick={() => onStudentClick(holder.loginId)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
                  >
                    {holder.avatarImageUrl ? (
                      <img
                        src={holder.avatarImageUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                        {holder.displayName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-sm">{holder.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
