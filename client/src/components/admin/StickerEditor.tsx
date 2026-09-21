import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CourseRow from './CourseRow';
import type { Category, Course, Sticker, StickerLevel, StickerType } from '../../types';
import type { authFetch as authFetchType } from '../../App';

const VERSIONS = Array.from({ length: 9 }, (_, i) => `v0${i + 1}`);

interface StickerEditorProps {
  sticker: Sticker | null;
  categories: Category[];
  onSave: (data: Partial<Sticker> & { id: string; categoryIds: string[] }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  canEdit: boolean;
  authFetch: typeof authFetchType;
}

export default function StickerEditor({
  sticker,
  categories,
  onSave,
  onDelete,
  onClose,
  canEdit,
  authFetch,
}: StickerEditorProps) {
  const isNew = sticker === null;

  const [id, setId] = useState(sticker?.id ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(
    sticker?.categories.map((c) => c.id) ?? []
  );
  const [primaryCategoryId, setPrimaryCategoryId] = useState(sticker?.primaryCategoryId ?? '');
  const [name, setName] = useState(sticker?.name ?? '');
  const [nameEn, setNameEn] = useState(sticker?.nameEn ?? '');
  const [type, setType] = useState<StickerType>(sticker?.type ?? 'practical');
  const [level, setLevel] = useState<StickerLevel>(sticker?.level ?? '実践');
  const [version, setVersion] = useState(sticker?.version ?? 'v01');
  const [emoji, setEmoji] = useState(sticker?.emoji ?? '🏷️');
  const [color, setColor] = useState(sticker?.color ?? '#2563EB');
  const [imageKey, setImageKey] = useState<string | null>(sticker?.imageKey ?? null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(sticker?.imageUrl ?? null);
  const [description, setDescription] = useState(sticker?.description ?? '');
  const [skillsText, setSkillsText] = useState((sticker?.skills ?? []).join(', '));
  const [courses, setCourses] = useState<Course[]>(sticker?.courses ?? []);
  const [error, setError] = useState<string | null>(null);

  const primaryCategory = categories.find((c) => c.id === primaryCategoryId);
  const areaCode = primaryCategory?.areaCode ?? '???';

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId]
    );
  }

  function handlePrimarySelect(categoryId: string) {
    setPrimaryCategoryId(categoryId);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setColor(cat.color);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await authFetch('/api/upload?prefix=stickers', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setImageKey(data.key);
      setImagePreviewUrl(data.url);
    }
  }

  function handleCourseChange(index: number, updated: Course) {
    setCourses((prev) => prev.map((c, i) => (i === index ? updated : c)));
  }

  function handleCourseDelete(index: number) {
    setCourses((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddCourse() {
    setCourses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        stickerId: id,
        name: '',
        curriculumYear: new Date().getFullYear(),
      },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (categoryIds.length === 0) {
      setError('カテゴリーを1件以上選択してください');
      return;
    }
    if (!primaryCategoryId || !categoryIds.includes(primaryCategoryId)) {
      setError('主カテゴリーを選択してください');
      return;
    }

    onSave({
      id,
      primaryCategoryId,
      categoryIds,
      name,
      nameEn,
      type,
      level,
      version,
      emoji,
      color,
      imageKey,
      description,
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      courses,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!canEdit && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription className="text-amber-900">
            自分のスタンプのみ編集できます
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label>カテゴリー</Label>
        {categories.map((cat) => {
          const checked = categoryIds.includes(cat.id);
          const isPrimary = primaryCategoryId === cat.id;
          return (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleCategory(cat.id)}
                disabled={!canEdit}
              />
              <Label>
                {cat.emoji} {cat.name}{' '}
                <span className="text-xs text-muted-foreground">{cat.nameEn}</span>
              </Label>
              {checked && (
                <Button
                  type="button"
                  variant={isPrimary ? 'default' : 'outline'}
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => handlePrimarySelect(cat.id)}
                >
                  {isPrimary ? '★ 主カテゴリー' : '☆ 主に設定'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {isNew && (
        <p className="text-sm text-muted-foreground">
          スタンプ ID プレビュー: NSS-{areaCode}-K___v01
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-id">スタンプ ID</Label>
        <Input
          id="sticker-id"
          value={id}
          onChange={(e) => setId(e.target.value)}
          readOnly={!isNew}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>バージョン</Label>
        <Select value={version} onValueChange={setVersion} disabled={!canEdit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERSIONS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>種別</Label>
        <Select value={type} onValueChange={(v) => setType(v as StickerType)} disabled={!canEdit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="practical">実習</SelectItem>
            <SelectItem value="lecture">講義</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>レベル</Label>
        <Select
          value={level}
          onValueChange={(v) => setLevel(v as StickerLevel)}
          disabled={!canEdit}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="実践">実践</SelectItem>
            <SelectItem value="知識">知識</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-image">画像</Label>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        )}
        <input
          id="sticker-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-emoji">絵文字</Label>
        <Input
          id="sticker-emoji"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>テーマカラー</Label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-name">スタンプ名</Label>
        <Input
          id="sticker-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-name-en">英語名</Label>
        <Input
          id="sticker-name-en"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-description">Can-Do 記述</Label>
        <Textarea
          id="sticker-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-skills">習得スキル（カンマ区切り）</Label>
        <Input
          id="sticker-skills"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>関連授業</Label>
        {courses.map((course, index) => (
          <CourseRow
            key={course.id}
            course={course}
            onChange={(updated) => handleCourseChange(index, updated)}
            onDelete={() => handleCourseDelete(index)}
          />
        ))}
        <Button type="button" variant="outline" onClick={handleAddCourse} disabled={!canEdit}>
          授業を追加
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!canEdit}>
          保存
        </Button>
        {!isNew && (
          <Button
            type="button"
            variant="destructive"
            disabled={!canEdit}
            onClick={() => onDelete(id)}
          >
            削除
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </form>
  );
}
