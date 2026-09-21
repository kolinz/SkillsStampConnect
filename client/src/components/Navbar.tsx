import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '../types';

export type NavbarView = 'gallery' | 'admin' | 'studentDirectory' | 'myPage' | 'studentProfile';

interface NavbarProps {
  view: NavbarView;
  search: string;
  currentUser: CurrentUser | null;
  onChangeView: (view: NavbarView) => void;
  onSearch: (value: string) => void;
  onLogout: () => void;
}

const ROLE_BADGE_CLASS: Record<CurrentUser['role'], string> = {
  admin: 'bg-red-100 text-red-800',
  user: 'bg-violet-100 text-violet-800',
  student: 'bg-emerald-100 text-emerald-800',
};

const ROLE_LABEL: Record<CurrentUser['role'], string> = {
  admin: '管理者',
  user: '職員',
  student: '学生',
};

export default function Navbar({
  view,
  search,
  currentUser,
  onChangeView,
  onSearch,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="shrink-0 font-semibold">🏷️ スキルスタンプ</span>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            className={cn(view === 'gallery' && 'bg-accent text-accent-foreground')}
            onClick={() => onChangeView('gallery')}
          >
            ギャラリー
          </Button>
          <Button
            variant="ghost"
            className={cn(view === 'studentDirectory' && 'bg-accent text-accent-foreground')}
            onClick={() => onChangeView('studentDirectory')}
          >
            学生一覧
          </Button>
          <Button
            variant="ghost"
            className={cn(view === 'admin' && 'bg-accent text-accent-foreground')}
            onClick={() => onChangeView('admin')}
          >
            管理画面
          </Button>
          {currentUser?.role === 'student' && (
            <Button
              variant="ghost"
              className={cn(view === 'myPage' && 'bg-accent text-accent-foreground')}
              onClick={() => onChangeView('myPage')}
            >
              マイページ
            </Button>
          )}
        </div>

        {view === 'gallery' && (
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="スタンプ・授業名…"
            className="min-w-[120px] flex-1"
          />
        )}

        {currentUser && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm">{currentUser.displayName ?? currentUser.username}</span>
            <Badge className={cn('rounded-full', ROLE_BADGE_CLASS[currentUser.role])}>
              {ROLE_LABEL[currentUser.role]}
            </Badge>
            <Button variant="outline" size="sm" onClick={onLogout}>
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
