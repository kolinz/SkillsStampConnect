interface StickerIconProps {
  imageUrl?: string | null;
  emoji: string;
  color: string;
  size?: number;
}

export default function StickerIcon({ imageUrl, emoji, color, size = 48 }: StickerIconProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `${color}22` }}
    >
      <span style={{ fontSize: size * 0.5 }}>{emoji}</span>
    </div>
  );
}
