export interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export default function ProgressBar({ percentage, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="w-full" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? `${clamped}% complete`}>
      {label && <span className="mb-1 block text-sm font-medium text-lc-text">{label}</span>}
      <div className="h-2.5 w-full rounded-full bg-lc-surface2">
        <div
          className="h-2.5 rounded-full bg-lc-accent transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="mt-0.5 block text-xs text-lc-muted">{clamped}%</span>
    </div>
  );
}
