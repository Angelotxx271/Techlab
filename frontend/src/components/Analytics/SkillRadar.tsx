interface Props {
  scores: Record<string, number>;
  size?: number;
}

const CATEGORIES = ['Web', 'Cloud', 'Containers', 'AI/ML', 'DevOps', 'Tools'];

export default function SkillRadar({ scores, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const n = CATEGORIES.length;
  const angleStep = (2 * Math.PI) / n;

  function point(i: number, r: number): [number, number] {
    const angle = angleStep * i - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = CATEGORIES.map((cat, i) => {
    const val = Math.min((scores[cat] ?? 0) / 100, 1);
    return point(i, radius * val);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => point(i, radius * level));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z';
        return <path key={level} d={d} fill="none" stroke="var(--color-lc-border)" strokeWidth={0.5} opacity={0.5} />;
      })}

      {CATEGORIES.map((_, i) => {
        const [x, y] = point(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-lc-border)" strokeWidth={0.5} opacity={0.4} />;
      })}

      <path d={dataPath} fill="var(--color-lc-accent)" fillOpacity={0.15} stroke="var(--color-lc-accent)" strokeWidth={2} />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="var(--color-lc-accent)" />
      ))}

      {CATEGORIES.map((cat, i) => {
        const [x, y] = point(i, radius + 18);
        return (
          <text key={cat} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="var(--color-lc-muted)" fontSize={10} fontWeight={500}>
            {cat}
          </text>
        );
      })}
    </svg>
  );
}
