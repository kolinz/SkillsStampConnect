import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User, UserRole } from '../../types';

interface UserEditorProps {
  user: User | null;
  onSave: (data: Partial<User> & { id?: string; password?: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export default function UserEditor({
  user,
  onSave,
  onDelete,
  onClose,
  currentUserId,
}: UserEditorProps) {
  const isNew = user === null;
  const isSelf = user?.id === currentUserId;

  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'user');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isNew && !password) {
      setError('パスワードは必須です');
      return;
    }
    if (password && password !== passwordConfirm) {
      setError('パスワードが一致しません');
      return;
    }

    onSave({
      id: user?.id,
      username,
      displayName,
      role,
      ...(password ? { password } : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-username">ユーザー名</Label>
        <Input
          id="user-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          readOnly={!isNew}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-display-name">表示名</Label>
        <Input
          id="user-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-role">ロール</Label>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isSelf}>
          <SelectTrigger id="user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="user">user</SelectItem>
          </SelectContent>
        </Select>
        {isSelf && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription className="text-amber-900">
              自分自身のロールは変更できません
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-password">パスワード{isNew ? '' : '（変更する場合のみ入力）'}</Label>
        <Input
          id="user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-password-confirm">パスワード確認</Label>
        <Input
          id="user-password-confirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="submit">保存</Button>
        {!isNew && (
          <Button
            type="button"
            variant="destructive"
            disabled={isSelf}
            onClick={() => user && onDelete(user.id)}
          >
            削除
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </div>
      {isSelf && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription className="text-amber-900">自分自身は削除できません</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
