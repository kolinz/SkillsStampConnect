import { Switch } from '@/components/ui/switch';
import StickerIcon from '../common/StickerIcon';
import type { Achievement } from '../../types';

interface MyAchievementsProps {
  achievements: Achievement[];
  onToggleVisibility: (id: string, isVisible: boolean) => void;
}

export default function MyAchievements({ achievements, onToggleVisibility }: MyAchievementsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {achievements.map((achievement) => (
        <li key={achievement.id} className="flex items-center gap-3 rounded-md border p-2">
          <StickerIcon
            imageUrl={achievement.imageUrl}
            emoji={achievement.emoji}
            color={achievement.color}
            size={40}
          />
          <div className="flex-1">
            <div className="font-medium">{achievement.stickerName}</div>
            {achievement.acquiredDate && (
              <div className="text-xs text-muted-foreground">{achievement.acquiredDate} 取得</div>
            )}
          </div>
          <Switch
            checked={achievement.isVisible}
            onCheckedChange={(checked) => onToggleVisibility(achievement.id, checked)}
          />
        </li>
      ))}
    </ul>
  );
}
