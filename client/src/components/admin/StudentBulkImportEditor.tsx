import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { authFetch as authFetchType } from '../../App';

interface ImportResult {
  created: { loginId: string; displayName: string; tempPassword: string }[];
  errors: { row: number; message: string }[];
}

interface StudentBulkImportEditorProps {
  authFetch: typeof authFetchType;
}

export default function StudentBulkImportEditor({ authFetch }: StudentBulkImportEditorProps) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authFetch('/api/students/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={loading} />

      {result && (
        <>
          {result.created.length > 0 && (
            <>
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertDescription className="text-amber-900">
                  この結果は画面遷移すると消えます。仮パスワードは今のうちに控えてください。
                </AlertDescription>
              </Alert>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-1">ログインID</th>
                    <th className="p-1">表示名</th>
                    <th className="p-1">仮パスワード</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((row) => (
                    <tr key={row.loginId} className="border-b">
                      <td className="p-1">{row.loginId}</td>
                      <td className="p-1">{row.displayName}</td>
                      <td className="p-1 font-mono">{row.tempPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {result.errors.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-1">行番号</th>
                  <th className="p-1">理由</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((err, i) => (
                  <tr key={i} className="border-b text-destructive">
                    <td className="p-1">{err.row}</td>
                    <td className="p-1">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
