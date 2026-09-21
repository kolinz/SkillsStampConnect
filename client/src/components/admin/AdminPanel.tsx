import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Category, CurrentUser, Sticker, User } from '../../types';
import type { authFetch as authFetchType } from '../../App';

import CategoryEditor from './CategoryEditor';
import StickerEditor from './StickerEditor';
import UserEditor from './UserEditor';
import StudentBulkImportEditor from './StudentBulkImportEditor';
import StudentAccountEditor from './StudentAccountEditor';
import AchievementEditor from './AchievementEditor';

type Tab =
  | 'stickers'
  | 'categories'
  | 'users'
  | 'studentImport'
  | 'studentAccounts'
  | 'achievements';
type SelectedEntity = Category | Sticker | User | null;

interface AdminPanelProps {
  categories: Category[];
  stickers: Sticker[];
  currentUser: CurrentUser;
  authFetch: typeof authFetchType;
  loadData: () => Promise<void>;
}

export default function AdminPanel({
  categories,
  stickers,
  currentUser,
  authFetch,
  loadData,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stickers');
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  async function loadUsers() {
    const res = await authFetch('/api/users');
    if (res.ok) {
      setUsers(await res.json());
    }
  }

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ============================================================
  // スタンプ CRUD
  // ============================================================
  async function handleSaveSticker(data: Partial<Sticker> & { id: string }) {
    const existing = stickers.find((s) => s.id === data.id);
    const method = existing ? 'PUT' : 'POST';
    const url = existing ? `/api/stickers/${data.id}` : '/api/stickers';

    const res = await authFetch(url, { method, body: JSON.stringify(data) });
    if (res.ok) {
      await loadData();
      setSelected(null);
    }
  }

  async function handleDeleteSticker(id: string) {
    const res = await authFetch(`/api/stickers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
      setSelected(null);
    }
  }

  // ============================================================
  // カテゴリー CRUD（admin のみ）
  // ============================================================
  async function handleSaveCategory(data: Partial<Category> & { id: string }) {
    const existing = categories.find((c) => c.id === data.id);
    const method = existing ? 'PUT' : 'POST';
    const url = existing ? `/api/categories/${data.id}` : '/api/categories';

    const res = await authFetch(url, { method, body: JSON.stringify(data) });
    if (res.ok) {
      await loadData();
      setSelected(null);
    }
  }

  async function handleDeleteCategory(id: string) {
    setErrorMessage(null);
    const res = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.status === 409) {
      const body = await res.json();
      setErrorMessage(body.error ?? 'このカテゴリーは削除できません');
      return;
    }
    if (res.ok) {
      await loadData();
      setSelected(null);
    }
  }

  // ============================================================
  // ユーザー CRUD（admin のみ、users は loadData の対象外）
  // ============================================================
  async function handleSaveUser(data: Partial<User> & { id?: string }) {
    const existing = data.id ? users.find((u) => u.id === data.id) : undefined;
    const method = existing ? 'PUT' : 'POST';
    const url = existing ? `/api/users/${data.id}` : '/api/users';

    const res = await authFetch(url, { method, body: JSON.stringify(data) });
    if (res.ok) {
      await loadUsers();
      setSelected(null);
    }
  }

  async function handleDeleteUser(id: string) {
    const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadUsers();
      setSelected(null);
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-[340px] shrink-0 overflow-auto border-r">
        <div className="flex flex-col border-b">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={
                activeTab === 'categories'
                  ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                  : 'w-full whitespace-nowrap p-2 text-left'
              }
            >
              🗂 カテゴリー
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            className={
              activeTab === 'stickers'
                ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                : 'w-full whitespace-nowrap p-2 text-left'
            }
          >
            🏷 スタンプ
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={
                activeTab === 'users'
                  ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                  : 'w-full whitespace-nowrap p-2 text-left'
              }
            >
              👥 ユーザー管理
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('studentImport')}
              className={
                activeTab === 'studentImport'
                  ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                  : 'w-full whitespace-nowrap p-2 text-left'
              }
            >
              📋 名簿インポート
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('studentAccounts')}
              className={
                activeTab === 'studentAccounts'
                  ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                  : 'w-full whitespace-nowrap p-2 text-left'
              }
            >
              🎓 学生アカウント
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={
              activeTab === 'achievements'
                ? 'w-full whitespace-nowrap p-2 text-left bg-accent'
                : 'w-full whitespace-nowrap p-2 text-left'
            }
          >
            🏅 実績記録
          </button>
        </div>

        {errorMessage && (
          <Alert className="m-2 border-red-200 bg-red-50 text-red-800">
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {activeTab === 'stickers' && (
          <ul>
            {stickers.map((sticker) => (
              <li key={sticker.id}>
                <button
                  type="button"
                  onClick={() => setSelected(sticker)}
                  className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent"
                >
                  <span>{sticker.name}</span>
                  {sticker.createdBy && (
                    <span className="text-xs text-muted-foreground">
                      {sticker.createdBy.id === currentUser.id ? (
                        <Badge variant="secondary">あなた</Badge>
                      ) : (
                        sticker.createdBy.displayName
                      )}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'categories' && isAdmin && (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setSelected(category)}
                  className="w-full p-2 text-left hover:bg-accent"
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'users' && isAdmin && (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => setSelected(user)}
                  className="w-full p-2 text-left hover:bg-accent"
                >
                  {user.username}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="p-2">
          <Button type="button" onClick={() => setSelected(null)}>
            新規作成
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'stickers' && (
          <StickerEditor
            sticker={selected as Sticker | null}
            categories={categories}
            onSave={handleSaveSticker}
            onDelete={handleDeleteSticker}
            onClose={() => setSelected(null)}
            canEdit={
              !selected || (selected as Sticker).createdBy?.id === currentUser.id || isAdmin
            }
            authFetch={authFetch}
          />
        )}
        {activeTab === 'categories' && isAdmin && (
          <CategoryEditor
            cat={selected as Category | null}
            onSave={handleSaveCategory}
            onDelete={handleDeleteCategory}
            onClose={() => setSelected(null)}
            authFetch={authFetch}
          />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserEditor
            user={selected as User | null}
            onSave={handleSaveUser}
            onDelete={handleDeleteUser}
            onClose={() => setSelected(null)}
            currentUserId={currentUser.id}
          />
        )}
        {activeTab === 'studentImport' && isAdmin && (
          <StudentBulkImportEditor authFetch={authFetch} />
        )}
        {activeTab === 'studentAccounts' && isAdmin && (
          <StudentAccountEditor authFetch={authFetch} />
        )}
        {activeTab === 'achievements' && <AchievementEditor stickers={stickers} authFetch={authFetch} />}
      </div>
    </div>
  );
}
