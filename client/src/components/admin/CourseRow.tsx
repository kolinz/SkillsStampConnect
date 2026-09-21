import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Course, StickerType } from '../../types';

interface CourseRowProps {
  course: Course;
  onChange: (updatedCourse: Course) => void;
  onDelete: () => void;
}

export default function CourseRow({ course, onChange, onDelete }: CourseRowProps) {
  function update(patch: Partial<Course>) {
    onChange({ ...course, ...patch });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-col gap-2">
        <Label>授業名</Label>
        <Input value={course.name} onChange={(e) => update({ name: e.target.value })} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label>科目コード</Label>
        <Input value={course.code ?? ''} onChange={(e) => update({ code: e.target.value })} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>種別</Label>
        <Select
          value={course.type ?? 'none'}
          onValueChange={(v) => update({ type: v === 'none' ? undefined : (v as StickerType) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">未設定</SelectItem>
            <SelectItem value="practical">実習</SelectItem>
            <SelectItem value="lecture">講義</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>カリキュラム年度</Label>
        <Input
          type="number"
          value={course.curriculumYear}
          onChange={(e) => update({ curriculumYear: Number(e.target.value) })}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>時間数</Label>
        <Input
          type="number"
          value={course.hours ?? ''}
          onChange={(e) => update({ hours: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>授業内容メモ</Label>
        <Textarea
          value={course.contentNote ?? ''}
          onChange={(e) => update({ contentNote: e.target.value })}
          className="resize-y"
        />
      </div>

      <Button type="button" variant="destructive" onClick={onDelete}>
        削除
      </Button>
    </div>
  );
}
