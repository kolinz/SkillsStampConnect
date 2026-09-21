import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { PublicStudentSummary } from '../../types';

interface StudentDirectoryProps {
  onStudentClick: (loginId: string) => void;
}

export default function StudentDirectory({ onStudentClick }: StudentDirectoryProps) {
  const [students, setStudents] = useState<PublicStudentSummary[]>([]);

  useEffect(() => {
    fetch('/api/students-public')
      .then((res) => (res.ok ? res.json() : []))
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      {students.map((student) => (
        <button
          key={student.loginId}
          type="button"
          onClick={() => onStudentClick(student.loginId)}
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center hover:bg-accent"
        >
          {student.avatarImageUrl ? (
            <img
              src={student.avatarImageUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg">
              {student.displayName.slice(0, 1)}
            </div>
          )}
          <div className="font-medium">{student.displayName}</div>
          {student.bio && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{student.bio}</p>
          )}
          <Badge variant="secondary">スタンプ {student.visibleStickerCount} 件</Badge>
        </button>
      ))}
    </div>
  );
}
