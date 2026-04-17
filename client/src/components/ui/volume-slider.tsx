interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function VolumeSlider({ value, onChange, className = 'w-16' }: VolumeSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`accent-sa-accent opacity-60 transition hover:opacity-100 ${className}`}
      aria-label="볼륨"
    />
  );
}
