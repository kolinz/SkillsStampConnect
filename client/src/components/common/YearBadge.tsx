import { Badge } from '@/components/ui/badge';

interface YearBadgeProps {
  year: number;
  isLatest: boolean;
}

export default function YearBadge({ year, isLatest }: YearBadgeProps) {
  if (isLatest) {
    return <Badge className="rounded-full bg-slate-900 text-slate-50">{year} ★</Badge>;
  }

  return (
    <Badge variant="outline" className="rounded-full text-muted-foreground">
      {year}
    </Badge>
  );
}
