import { useCallback, useEffect, useState } from 'react';
import type { Category, CurrentUser, Sticker, StudentProfile, Achievement } from './types';
import Navbar, { type NavbarView } from './components/Navbar';
import CategoryCard from './components/gallery/CategoryCard';
import CategoryModal from './components/gallery/CategoryModal';
import StickerModal from './components/gallery/StickerModal';
import StudentDirectory from './components/gallery/StudentDirectory';
import StudentProfilePage from './components/gallery/StudentProfilePage';
import LoginScreen from './components/admin/LoginScreen';
import AdminPanel from './components/admin/AdminPanel';
import PasswordChangeScreen from './components/student/PasswordChangeScreen';
import MyProfileEditor from './components/student/MyProfileEditor';
import MyAchievements from './components/student/MyAchievements';

// モジュールスコープに現在のトークンを保持する変数を1つ置く
let currentToken: string | null = null;

// authFetch 自体をトップレベルで export する（安定した1つの関数）。
// 後続ステップの各エディターコンポーネントは
// `import { authFetch } from '../App'`（または相対パス）とそのまま import して使用する。
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});

  // FormData を body に渡す場合は Content-Type を設定しない
  // （ブラウザが multipart/form-data; boundary=... を自動付与するため）
  const isFormData = init.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  return fetch(input, { ...init, headers });
}

// URL パス /public/profile/:loginId を検出するためのヘルパー
function matchPublicProfilePath(pathname: string): string | null {
  const match = pathname.match(/^\/public\/profile\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  // 外部公開ビュー（/public/profile/:loginId）の判定。
  // 実際の分岐（早期return）はコンポーネント末尾、全フック呼び出しの後で行う
  // （フックの呼び出し順序を条件で変えないため）。
  const publicProfileLoginId = matchPublicProfilePath(window.location.pathname);

  const [cats, setCats] = useState<Category[]>([]);
  const [stks, setStks] = useState<Sticker[]>([]);
  const [view, setView] = useState<NavbarView>('gallery');
  const [search, setSearch] = useState('');
  const [catModal, setCatModal] = useState<Category | null>(null);
  const [stkModal, setStkModal] = useState<Sticker | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [studentProfileLoginId, setStudentProfileLoginId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);
  const [myAchievements, setMyAchievements] = useState<Achievement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // currentUser が変わるたびにモジュール変数へ反映する
  useEffect(() => {
    currentToken = currentUser?.token ?? null;
  }, [currentUser]);

  // マウント時に localStorage からログイン状態を復元する
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      const user = JSON.parse(userJson);
      setCurrentUser({ token, ...user });
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catsRes, stksRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/stickers'),
      ]);

      if (!catsRes.ok || !stksRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const [catsData, stksData] = await Promise.all([catsRes.json(), stksRes.json()]);
      setCats(catsData);
      setStks(stksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // view === 'myPage' になった際に自分のプロフィール・実績を取得する
  const loadMyPage = useCallback(async () => {
    const [profileRes, achievementsRes] = await Promise.all([
      authFetch('/api/my/profile'),
      authFetch('/api/my/achievements'),
    ]);
    if (profileRes.ok) setMyProfile(await profileRes.json());
    if (achievementsRes.ok) setMyAchievements(await achievementsRes.json());
  }, []);

  useEffect(() => {
    if (view === 'myPage') {
      loadMyPage();
    }
  }, [view, loadMyPage]);

  function handlePasswordChangeComplete(user: { displayName: string }) {
    setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false, displayName: user.displayName } : prev));
    setView('gallery');
  }

  async function handleSaveMyProfile(data: Partial<StudentProfile>) {
    const res = await authFetch('/api/my/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await loadMyPage();
    }
  }

  async function handleToggleAchievementVisibility(id: string, isVisible: boolean) {
    const res = await authFetch(`/api/my/achievements/${id}/visibility`, {
      method: 'PUT',
      body: JSON.stringify({ isVisible }),
    });
    if (res.ok) {
      await loadMyPage();
    }
  }

  const searchLower = search.trim().toLowerCase();

  const filteredStickers = searchLower
    ? stks.filter((sticker) => {
        return (
          sticker.id.toLowerCase().includes(searchLower) ||
          sticker.name.toLowerCase().includes(searchLower) ||
          sticker.skills.some((skill) => skill.toLowerCase().includes(searchLower))
        );
      })
    : stks;

  const filteredCategories = searchLower
    ? cats.filter((category) => {
        const hasMatchingSticker = filteredStickers.some((sticker) =>
          sticker.categories.some((c) => c.id === category.id)
        );
        return (
          category.name.toLowerCase().includes(searchLower) ||
          category.areaCode.toLowerCase().includes(searchLower) ||
          hasMatchingSticker
        );
      })
    : cats;

  // 外部公開ビュー：通常のギャラリー／管理画面のルーティングとは別に、
  // Navbar・ログイン導線・管理画面リンクを一切表示しない単独ページを返す。
  // authFetch を使う既存コンポーネントはここでは使用せず、認証ヘッダーを付与しない
  // 素の fetch を fetchFn として渡す。
  if (publicProfileLoginId) {
    return <StudentProfilePage loginId={publicProfileLoginId} fetchFn={fetch} />;
  }

  function handleLogin(token: string, user: Omit<CurrentUser, 'token'>) {
    setCurrentUser({ token, ...user });
  }

  function handleLogout() {
    setCurrentUser(null);
    setView('gallery');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {currentUser?.role === 'student' && currentUser.mustChangePassword ? (
        <PasswordChangeScreen onComplete={handlePasswordChangeComplete} />
      ) : (
        <>
          <Navbar
            view={view}
            search={search}
            currentUser={currentUser}
            onChangeView={setView}
            onSearch={setSearch}
            onLogout={handleLogout}
          />

          <main className="p-4">
            {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!loading && !error && view === 'gallery' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    cat={category}
                    stickers={filteredStickers}
                    onCatClick={setCatModal}
                    onStickerClick={setStkModal}
                  />
                ))}
              </div>
            )}

            {view === 'studentDirectory' && (
              <StudentDirectory
                onStudentClick={(loginId) => {
                  setStudentProfileLoginId(loginId);
                  setView('studentProfile');
                }}
              />
            )}

            {view === 'myPage' && myProfile && (
              <div className="flex flex-col gap-6">
                <MyProfileEditor
                  profile={myProfile}
                  onSave={handleSaveMyProfile}
                  authFetch={authFetch}
                />
                <MyAchievements
                  achievements={myAchievements}
                  onToggleVisibility={handleToggleAchievementVisibility}
                />
              </div>
            )}

            {!loading && !error && view === 'admin' && currentUser === null && (
              <LoginScreen onLogin={handleLogin} />
            )}

            {!loading && !error && view === 'admin' && currentUser !== null && (
              <AdminPanel
                categories={cats}
                stickers={stks}
                currentUser={currentUser}
                authFetch={authFetch}
                loadData={loadData}
              />
            )}

            {catModal && (
              <CategoryModal
                cat={catModal}
                stickers={stks}
                onClose={() => setCatModal(null)}
                onStickerClick={(sticker) => {
                  setCatModal(null);
                  setStkModal(sticker);
                }}
              />
            )}

            {stkModal && catModal === null && (
              <StickerModal
                sticker={stkModal}
                cat={cats.find((c) => c.id === stkModal.primaryCategoryId)!}
                onClose={() => setStkModal(null)}
                authFetch={authFetch}
                onStudentClick={(loginId) => {
                  setStkModal(null);
                  setStudentProfileLoginId(loginId);
                  setView('studentProfile');
                }}
              />
            )}

            {view === 'studentProfile' && studentProfileLoginId && (
              <StudentProfilePage
                loginId={studentProfileLoginId}
                onBack={() => {
                  setStudentProfileLoginId(null);
                  setView('gallery');
                }}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
