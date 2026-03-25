import { useMemo, useState } from 'react';

interface Props {
  data: Record<string, number>;
  totalContributions: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColor(count: number, max: number): string {
  if (count === 0) return 'var(--color-lc-surface2)';
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return '#5c3d10';
  if (ratio <= 0.5) return '#9a6518';
  if (ratio <= 0.75) return '#d48b1a';
  return '#ffa116';
}

export default function ContributionHeatmap({ data, totalContributions }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const { weeks, monthLabels, maxCount } = useMemo(() => {
    const dates = Object.keys(data).sort();
    if (dates.length === 0) return { weeks: [], monthLabels: [], maxCount: 0 };

    const firstDate = new Date(dates[0] + 'T00:00:00');
    const startDay = firstDate.getDay();

    const allDays: { date: string; count: number; dayOfWeek: number }[] = [];

    for (let i = 0; i < startDay; i++) {
      allDays.push({ date: '', count: 0, dayOfWeek: i });
    }

    for (const d of dates) {
      const dt = new Date(d + 'T00:00:00');
      allDays.push({ date: d, count: data[d] ?? 0, dayOfWeek: dt.getDay() });
    }

    const wks: typeof allDays[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      wks.push(allDays.slice(i, i + 7));
    }
    while (wks.length > 0 && wks[wks.length - 1].length < 7) {
      const last = wks[wks.length - 1];
      while (last.length < 7) last.push({ date: '', count: 0, dayOfWeek: last.length });
    }

    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < wks.length; w++) {
      for (const day of wks[w]) {
        if (!day.date) continue;
        const month = new Date(day.date + 'T00:00:00').getMonth();
        if (month !== lastMonth) {
          labels.push({ text: MONTH_NAMES[month], col: w });
          lastMonth = month;
        }
        break;
      }
    }

    const mx = Math.max(...Object.values(data), 1);
    return { weeks: wks, monthLabels: labels, maxCount: mx };
  }, [data]);

  const cellSize = 13;
  const cellGap = 3;
  const step = cellSize + cellGap;
  const leftPad = 32;
  const topPad = 20;
  const svgW = leftPad + weeks.length * step + 10;
  const svgH = topPad + 7 * step + 8;

  return (
    <div className="rounded-lg border border-lc-border bg-lc-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-lc-text">
          {totalContributions} contributions in the last year
        </h3>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="select-none"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={`${m.text}-${i}`}
              x={leftPad + m.col * step}
              y={topPad - 6}
              fontSize={10}
              fill="var(--color-lc-muted)"
            >
              {m.text}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label ? (
              <text
                key={i}
                x={0}
                y={topPad + i * step + cellSize - 2}
                fontSize={10}
                fill="var(--color-lc-muted)"
              >
                {label}
              </text>
            ) : null
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day.date && wi > 0) return null;
              const x = leftPad + wi * step;
              const y = topPad + di * step;
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={day.date ? getColor(day.count, maxCount) : 'transparent'}
                  className="transition-colors"
                  style={{ cursor: day.date ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => {
                    if (!day.date) return;
                    const formatted = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    });
                    setTooltip({
                      text: `${day.count} exercise${day.count !== 1 ? 's' : ''} on ${formatted}`,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}

          {/* Legend */}
          <text x={svgW - 130} y={svgH - 2} fontSize={10} fill="var(--color-lc-muted)">Less</text>
          {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
            <rect
              key={i}
              x={svgW - 98 + i * (cellSize + 2)}
              y={svgH - 12}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(level * maxCount, maxCount)}
            />
          ))}
          <text x={svgW - 18} y={svgH - 2} fontSize={10} fill="var(--color-lc-muted)">More</text>
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-lc-bg border border-lc-border px-3 py-1.5 text-xs text-lc-text shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
