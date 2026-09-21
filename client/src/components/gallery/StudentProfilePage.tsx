import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PublicStudentProfile } from '../../types';
import { authFetch } from '../../App';

interface StudentProfilePageProps {
  loginId: string;
  onBack?: () => void;
  fetchFn?: typeof fetch;
}

export default function StudentProfilePage({
  loginId,
  onBack,
  fetchFn = authFetch,
}: StudentProfilePageProps) {
  const [profile, setProfile] = useState<PublicStudentProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setProfile(null);
    fetchFn(`/api/students/${loginId}/profile`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => setNotFound(true));
  }, [loginId]);

  if (notFound) {
    return <p className="p-4 text-sm text-muted-foreground">このプロフィールは見つかりません。</p>;
  }

  if (!profile) {
    return <p className="p-4 text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      {onBack && (
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="mb-4">
          ← 戻る
        </Button>
      )}

      <div className="flex items-center gap-4">
        {profile.avatarImageUrl ? (
          <img
            src={profile.avatarImageUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl">
            {profile.displayName.slice(0, 1)}
          </div>
        )}
        <div>
          <div className="text-lg font-bold">{profile.displayName}</div>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {profile.xHandle && (
          <a
            href={`https://x.com/${profile.xHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            X: {profile.xHandle}
          </a>
        )}
        {profile.linkedinUrl && (
          <a
            href={profile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            LinkedIn
          </a>
        )}
        {profile.contactEmail && <span>{profile.contactEmail}</span>}
      </div>

      {profile.goal && (
        <div className="mt-4">
          <div className="text-sm font-medium">やりたいこと</div>
          <p className="text-sm text-muted-foreground">{profile.goal}</p>
        </div>
      )}

      {profile.otherSkills && (
        <div className="mt-4">
          <div className="text-sm font-medium">その他スキル</div>
          <p className="text-sm text-muted-foreground">{profile.otherSkills}</p>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 text-sm font-medium">公開スタンプ一覧</div>
        <div className="flex flex-wrap gap-2">
          {profile.achievements.map((achievement) => (
            <Badge
              key={achievement.stickerId}
              variant="outline"
              style={{ borderColor: achievement.color, color: achievement.color }}
            >
              {achievement.emoji} {achievement.stickerName}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
