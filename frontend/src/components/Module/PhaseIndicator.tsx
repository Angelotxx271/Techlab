const PHASES = ['Learn', 'Engage', 'Practice'] as const;
export type Phase = (typeof PHASES)[number];

interface PhaseIndicatorProps {
  current: Phase;
}

export default function PhaseIndicator({ current }: PhaseIndicatorProps) {
  const idx = PHASES.indexOf(current);

  return (
    <div className="flex items-center gap-2">
      {PHASES.map((phase, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={phase} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-6 ${done || active ? 'bg-lc-accent' : 'bg-lc-border'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-lc-green/20 text-lc-green'
                    : active
                      ? 'bg-lc-accent text-lc-bg'
                      : 'bg-lc-surface2 text-lc-muted'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-medium ${active ? 'text-lc-accent' : done ? 'text-lc-green' : 'text-lc-muted'}`}>
                {phase}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
