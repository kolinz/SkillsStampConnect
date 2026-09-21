import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authFetch } from '../../App';

interface PasswordChangeScreenProps {
  onComplete: (user: { displayName: string }) => void;
}

export default function PasswordChangeScreen({ onComplete }: PasswordChangeScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== passwordConfirm) {
      setError('パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      const passwordRes = await authFetch('/api/my/password', {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
      if (!passwordRes.ok) {
        const body = await passwordRes.json();
        setError(body.error ?? 'パスワードの変更に失敗しました');
        return;
      }

      const profileRes = await authFetch('/api/my/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName }),
      });
      if (!profileRes.ok) {
        const body = await profileRes.json();
        setError(body.error ?? '表示名の変更に失敗しました');
        return;
      }

      onComplete({ displayName });
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm p-4">
      <h1 className="mb-4 text-lg font-bold">初回パスワード変更</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">新しいパスワード</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password-confirm">パスワード確認</Label>
          <Input
            id="password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">表示名</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading}>
          設定する
        </Button>
      </form>
    </div>
  );
}
