import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { StudentProfile } from '../../types';
import type { authFetch as authFetchType } from '../../App';

interface MyProfileEditorProps {
  profile: StudentProfile;
  onSave: (data: Partial<StudentProfile>) => void;
  authFetch: typeof authFetchType;
}

export default function MyProfileEditor({ profile, onSave, authFetch }: MyProfileEditorProps) {
  const [avatarImageKey, setAvatarImageKey] = useState(profile.avatarImageKey);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(profile.avatarImageUrl);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [xHandle, setXHandle] = useState(profile.xHandle ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [goal, setGoal] = useState(profile.goal ?? '');
  const [otherSkills, setOtherSkills] = useState(profile.otherSkills ?? '');
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? '');
  const [emailPublic, setEmailPublic] = useState(profile.emailPublic);
  const [externalPublic, setExternalPublic] = useState(profile.externalPublic);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await authFetch('/api/upload?prefix=students', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setAvatarImageKey(data.key);
      setAvatarPreviewUrl(data.url);
    }
  }

  function handleConfirmExternalPublic() {
    setExternalPublic(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      avatarImageKey,
      displayName,
      xHandle,
      linkedinUrl,
      bio,
      goal,
      otherSkills,
      contactEmail,
      emailPublic,
      externalPublic,
    });
  }

  const publicUrl = `${window.location.origin}/public/profile/${profile.loginId}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="avatar">アバター</Label>
        {avatarPreviewUrl && (
          <img src={avatarPreviewUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        )}
        <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="display-name">表示名</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="x-handle">X ハンドル</Label>
        <Input id="x-handle" value={xHandle} onChange={(e) => setXHandle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="linkedin-url">LinkedIn URL</Label>
        <Input
          id="linkedin-url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">一言</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal">やりたいこと</Label>
        <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="other-skills">その他スキル</Label>
        <Textarea
          id="other-skills"
          value={otherSkills}
          onChange={(e) => setOtherSkills(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-email">連絡先メールアドレス</Label>
        <Input
          id="contact-email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            checked={emailPublic}
            onCheckedChange={(checked) => setEmailPublic(Boolean(checked))}
          />
          <Label>公開する</Label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {externalPublic ? (
            <Switch checked={externalPublic} onCheckedChange={(v) => setExternalPublic(v)} />
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Switch checked={externalPublic} />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>QRコード・URLで外部公開しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    このQRコード・URLを知っている人は、ログインなしで誰でも公開中のスタンプを閲覧できます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmExternalPublic}>
                    公開する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Label>QRコード・URLで外部公開する</Label>
        </div>

        {externalPublic && (
          <div className="flex items-center gap-2">
            <Input readOnly value={publicUrl} />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              コピー
            </Button>
          </div>
        )}
      </div>

      <Button type="submit">保存</Button>
    </form>
  );
}
