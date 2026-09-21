import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Category } from '../../types';
import type { authFetch as authFetchType } from '../../App';

const PRESET_COLORS = [
  '#2563EB',
  '#059669',
  '#DB2777',
  '#DC2626',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#65A30D',
  '#EA580C',
  '#4B5563',
];

interface CategoryEditorProps {
  cat: Category | null;
  onSave: (data: Partial<Category> & { id: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  authFetch: typeof authFetchType;
}

export default function CategoryEditor({
  cat,
  onSave,
  onDelete,
  onClose,
  authFetch,
}: CategoryEditorProps) {
  const isNew = cat === null;

  const [id, setId] = useState(cat?.id ?? '');
  const [name, setName] = useState(cat?.name ?? '');
  const [nameEn, setNameEn] = useState(cat?.nameEn ?? '');
  const [areaCode, setAreaCode] = useState(cat?.areaCode ?? '');
  const [emoji, setEmoji] = useState(cat?.emoji ?? '📌');
  const [color, setColor] = useState(cat?.color ?? PRESET_COLORS[0]);
  const [imageKey, setImageKey] = useState<string | null>(cat?.imageKey ?? null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(cat?.imageUrl ?? null);
  const [description, setDescription] = useState(cat?.description ?? '');
  const [targetRolesText, setTargetRolesText] = useState((cat?.targetRoles ?? []).join(', '));
  const [recruitMessage, setRecruitMessage] = useState(cat?.recruitMessage ?? '');

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await authFetch('/api/upload?prefix=categories', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setImageKey(data.key);
      setImagePreviewUrl(data.url);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id,
      name,
      nameEn,
      areaCode,
      emoji,
      color,
      imageKey,
      description,
      targetRoles: targetRolesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      recruitMessage,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-image">画像</Label>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        )}
        <input id="cat-image" type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-emoji">絵文字（画像未登録時のフォールバック）</Label>
        <Input id="cat-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>テーマカラー</Label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <div className="flex gap-1">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className="h-6 w-6 rounded-full border"
              style={{ background: preset }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-name">カテゴリー名</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-name-en">英語名</Label>
        <Input id="cat-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-area-code">エリアコード</Label>
        <Input
          id="cat-area-code"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          readOnly={!isNew}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-description">説明文</Label>
        <Textarea
          id="cat-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-target-roles">対象職種（カンマ区切り）</Label>
        <Input
          id="cat-target-roles"
          value={targetRolesText}
          onChange={(e) => setTargetRolesText(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-recruit-message">採用担当者向けメッセージ</Label>
        <Textarea
          id="cat-recruit-message"
          value={recruitMessage}
          onChange={(e) => setRecruitMessage(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">保存</Button>
        {!isNew && (
          <Button type="button" variant="destructive" onClick={() => onDelete(id)}>
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
