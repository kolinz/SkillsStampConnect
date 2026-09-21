import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Sticker } from '../../types';
import type { authFetch as authFetchType } from '../../App';

interface StudentSearchResult {
  loginId: string;
  displayName: string;
}

interface AchievementRow {
  id: string;
  stickerId: string;
  stickerName: string;
  acquiredDate?: string;
  notes?: string;
}

interface AchievementEditorProps {
  stickers: Sticker[];
  authFetch: typeof authFetchType;
}

export default function AchievementEditor({ stickers, authFetch }: AchievementEditorProps) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [stickerId, setStickerId] = useState('');
  const [acquiredDate, setAcquiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);

  useEffect(() => {
    if (!query) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await authFetch(`/api/students?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        setCandidates(await res.json());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadAchievements(loginId: string) {
    const res = await authFetch(`/api/achievements?studentId=${encodeURIComponent(loginId)}`);
    if (res.ok) {
      setAchievements(await res.json());
    }
  }

  function handleSelectStudent(student: StudentSearchResult) {
    setSelectedStudent(student);
    setQuery(student.displayName);
    setCandidates([]);
    loadAchievements(student.loginId);
  }

  async function handleRecord() {
    if (!selectedStudent || !stickerId) return;

    await authFetch('/api/achievements', {
      method: 'POST',
      body: JSON.stringify({
        studentId: selectedStudent.loginId,
        stickerId,
        acquiredDate: acquiredDate || undefined,
        notes: notes || undefined,
      }),
    });

    setAcquiredDate('');
    setNotes('');
    await loadAchievements(selectedStudent.loginId);
  }

  async function handleDelete(id: string) {
    await authFetch(`/api/achievements/${id}`, { method: 'DELETE' });
    if (selectedStudent) {
      await loadAchievements(selectedStudent.loginId);
    }
  }

  return (
    <div className="flex gap-6">
      <div className="relative flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="student-search">学生検索</Label>
          <Input
            id="student-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedStudent(null);
            }}
            placeholder="表示名またはログインIDで検索"
          />
          {candidates.length > 0 && (
            <ul className="absolute top-full z-10 w-full rounded-md border bg-background shadow-md">
              {candidates.map((c) => (
                <li key={c.loginId}>
                  <button
                    type="button"
                    onClick={() => handleSelectStudent(c)}
                    className="w-full p-2 text-left hover:bg-accent"
                  >
                    {c.displayName}（{c.loginId}）
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>スタンプ</Label>
          <Select value={stickerId} onValueChange={setStickerId}>
            <SelectTrigger>
              <SelectValue placeholder="スタンプを選択" />
            </SelectTrigger>
            <SelectContent>
              {stickers.map((sticker) => (
                <SelectItem key={sticker.id} value={sticker.id}>
                  {sticker.emoji} {sticker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="acquired-date">取得日</Label>
          <Input
            id="acquired-date"
            type="date"
            value={acquiredDate}
            onChange={(e) => setAcquiredDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">メモ</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="button" onClick={handleRecord} disabled={!selectedStudent || !stickerId}>
          記録する
        </Button>
      </div>

      <div className="flex-1">
        <div className="mb-2 text-sm font-medium">
          {selectedStudent
            ? `${selectedStudent.displayName} の取得済みスタンプ`
            : '学生を選択してください'}
        </div>
        <ul className="flex flex-col gap-1">
          {achievements.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border p-2">
              <div>
                <div className="text-sm font-medium">{a.stickerName}</div>
                {a.acquiredDate && (
                  <div className="text-xs text-muted-foreground">{a.acquiredDate}</div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(a.id)}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
