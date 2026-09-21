import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { authFetch as authFetchType } from '../../App';

interface StudentRow {
  loginId: string;
  displayName: string;
  affiliation?: string;
  position?: string;
  graduationYear?: number;
  status: 'active' | 'suspended';
  createdAt?: string;
}

interface StudentAccountEditorProps {
  authFetch: typeof authFetchType;
}

export default function StudentAccountEditor({ authFetch }: StudentAccountEditorProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [editingLoginId, setEditingLoginId] = useState<string | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');

  async function loadStudents() {
    const res = await authFetch('/api/students');
    if (res.ok) {
      setStudents(await res.json());
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = students.filter(
    (s) =>
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.loginId.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSaveDisplayName(loginId: string) {
    await authFetch(`/api/students/${loginId}/display-name`, {
      method: 'PUT',
      body: JSON.stringify({ displayName: newDisplayName }),
    });
    setEditingLoginId(null);
    await loadStudents();
  }

  async function handleToggleStatus(loginId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await authFetch(`/api/students/${loginId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadStudents();
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="表示名・ログインIDで検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-1">ログインID</th>
            <th className="p-1">表示名</th>
            <th className="p-1">状態</th>
            <th className="p-1">操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((student) => (
            <tr key={student.loginId} className="border-b">
              <td className="p-1">{student.loginId}</td>
              <td className="p-1">{student.displayName}</td>
              <td className="p-1">{student.status === 'active' ? '有効' : '停止中'}</td>
              <td className="flex gap-2 p-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingLoginId(student.loginId);
                        setNewDisplayName(student.displayName);
                      }}
                    >
                      表示名変更
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>表示名の変更</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-display-name">新しい表示名</Label>
                      <Input
                        id="new-display-name"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={() => editingLoginId && handleSaveDisplayName(editingLoginId)}
                      >
                        保存
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(student.loginId, student.status)}
                >
                  {student.status === 'active' ? '停止' : '再有効化'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
