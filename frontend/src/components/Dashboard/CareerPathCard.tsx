import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCareerRecommendation, getPath, type CareerRecommendation } from '../../services/api';
import { getProfile, getProgress } from '../../services/progressStore';
import type { LearningPath } from '../../types';

type ViewState = 'initial' | 'input' | 'loading' | 'result' | 'error';

interface PathNode {
  id: string;
  title: string;
  status: 'completed' | 'current' | 'locked';
  moduleCount: number;
  completedModules: number;
}

const CACHE_KEY = 'careerPathRec';

function getCachedRec(): CareerRecommendation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareerRecommendation;
  } catch { return null; }
}

function cacheRec(rec: CareerRecommendation): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
}

function clearCachedRec(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export default function CareerPathCard() {
  const [rec, setRec] = useState<CareerRecommendation | null>(null);
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [position, setPosition] = useState('');
  const [view, setView] = useState<ViewState>('initial');
  const [errorMsg, setErrorMsg] = useState('');

  const profile = getProfile();

  async function buildNodes(pathIds: string[]) {
    const progress = getProgress();
    const resolved: PathNode[] = [];

    let foundCurrent = false;
    for (const pid of pathIds) {
      let title = pid;
      let moduleCount = 0;
      let completedCount = 0;

      try {
        const p: LearningPath = await getPath(pid);
        title = p.title;
        moduleCount = p.modules.length;
        completedCount = (progress.completedModules[pid] ?? []).length;
      } catch { /* path may not exist */ }

      const allDone = moduleCount > 0 && completedCount >= moduleCount;
      let status: PathNode['status'];
      if (allDone) {
        status = 'completed';
      } else if (!foundCurrent) {
        status = 'current';
        foundCurrent = true;
      } else {
        status = 'locked';
      }

      resolved.push({ id: pid, title, status, moduleCount, completedModules: completedCount });
    }

    setNodes(resolved);
  }

  function fetchRecommendation(pos: string) {
    setView('loading');
    setErrorMsg('');
    getCareerRecommendation({
      current_position: pos,
      interests: profile?.interests ?? [],
      skill_level: profile?.skillLevel ?? 'beginner',
    })
      .then(async (r) => {
        setRec(r);
        cacheRec(r);
        await buildNodes(r.recommendedPaths);
        setView('result');
      })
      .catch((e) => {
        setErrorMsg(e?.message || 'Failed to get recommendation. Please try again.');
        setView('error');
      });
  }

  useEffect(() => {
    const cached = getCachedRec();
    if (cached) {
      setRec(cached);
      setPosition(profile?.currentPosition ?? '');
      buildNodes(cached.recommendedPaths).then(() => setView('result'));
      return;
    }
    if (profile?.currentPosition) {
      setPosition(profile.currentPosition);
      fetchRecommendation(profile.currentPosition);
    }
  }, []);

  // ---- Pre-result views ----

  if (view === 'initial') {
    return (
      <div className="rounded-2xl border border-dashed border-lc-accent/40 bg-lc-accent/5 p-6">
        <h3 className="text-base font-bold text-lc-accent mb-2">Get a Career Recommendation</h3>
        <p className="text-sm text-lc-muted mb-4">
          Tell us your current role and we'll map a personalized tech career upgrade path.
        </p>
        <button
          onClick={() => setView('input')}
          className="rounded-xl bg-lc-accent px-5 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90 transition-opacity"
        >
          Enter your current role
        </button>
      </div>
    );
  }

  if (view === 'input' || view === 'error') {
    return (
      <div className="rounded-2xl border border-lc-border bg-lc-surface p-6">
        <h3 className="text-base font-bold text-lc-text mb-3">Career Path Recommendation</h3>
        {errorMsg && <p className="text-sm text-lc-red mb-3">{errorMsg}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Marketing Intern, Student..."
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && position.trim() && fetchRecommendation(position.trim())}
            className="flex-1 rounded-xl border border-lc-border bg-lc-bg px-4 py-2.5 text-sm text-lc-text placeholder-lc-muted focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
          />
          <button
            onClick={() => position.trim() && fetchRecommendation(position.trim())}
            disabled={!position.trim()}
            className="rounded-xl bg-lc-accent px-5 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Get Path
          </button>
        </div>
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="rounded-2xl border border-lc-border bg-lc-surface p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-lc-accent/10 mb-3 animate-pulse">
          <svg className="h-6 w-6 text-lc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-lc-muted">Generating your career path...</p>
      </div>
    );
  }

  if (!rec) return null;

  // ---- Duolingo-style path ----

  const SWING = 90;
  const NODE_SIZE = 80;
  const NODE_GAP = 140;

  return (
    <div className="rounded-2xl border border-lc-accent/20 bg-gradient-to-b from-lc-accent/[0.04] via-lc-bg to-lc-bg overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-lc-border/40 bg-lc-surface/50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lc-accent mb-1">Your Career Path</p>
            <h3 className="text-2xl font-bold text-lc-text">{rec.targetRole}</h3>
          </div>
          <button
            onClick={() => { setRec(null); setNodes([]); clearCachedRec(); setView('input'); }}
            className="rounded-lg border border-lc-border px-3 py-1.5 text-[11px] font-medium text-lc-muted hover:text-lc-text hover:border-lc-accent/40 transition-colors"
          >
            Retake
          </button>
        </div>
        <p className="text-sm text-lc-muted leading-relaxed mb-3">{rec.rationale}</p>
        <div className="rounded-xl bg-lc-green/[0.08] border border-lc-green/20 px-4 py-2.5">
          <p className="text-sm font-medium text-lc-green leading-relaxed">{rec.salaryInsight}</p>
        </div>
      </div>

      {/* Path visualization */}
      <div className="relative px-6 py-10" style={{ minHeight: (nodes.length + 1) * NODE_GAP + 40 }}>
        {/* SVG connectors layer */}
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: (nodes.length + 1) * NODE_GAP + 40 }}
          preserveAspectRatio="none"
        >
          {nodes.map((node, i) => {
            if (i === nodes.length - 1) return null;
            const next = nodes[i + 1];

            const x1 = 50 + Math.sin((i / (nodes.length - 1)) * Math.PI * 2) * (SWING / 3);
            const x2 = 50 + Math.sin(((i + 1) / (nodes.length - 1)) * Math.PI * 2) * (SWING / 3);
            const y1 = 40 + i * NODE_GAP + NODE_SIZE / 2;
            const y2 = 40 + (i + 1) * NODE_GAP + NODE_SIZE / 2;
            const midY = (y1 + y2) / 2;

            const color = node.status === 'completed'
              ? 'rgba(44, 187, 93, 0.5)'
              : node.status === 'current'
                ? 'rgba(255, 161, 22, 0.35)'
                : 'rgba(62, 62, 78, 0.5)';

            const glowColor = node.status === 'completed'
              ? 'rgba(44, 187, 93, 0.15)'
              : node.status === 'current'
                ? 'rgba(255, 161, 22, 0.1)'
                : 'transparent';

            return (
              <g key={`conn-${node.id}-${next.id}`}>
                <path
                  d={`M ${x1}% ${y1} C ${x1}% ${midY}, ${x2}% ${midY}, ${x2}% ${y2}`}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${x1}% ${y1} C ${x1}% ${midY}, ${x2}% ${midY}, ${x2}% ${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="10 7"
                />
              </g>
            );
          })}

          {/* Connector from last node to trophy */}
          {nodes.length > 0 && (
            <g>
              <path
                d={`M ${50 + Math.sin(((nodes.length - 1) / Math.max(nodes.length - 1, 1)) * Math.PI * 2) * (SWING / 3)}% ${40 + (nodes.length - 1) * NODE_GAP + NODE_SIZE / 2} L 50% ${40 + nodes.length * NODE_GAP + NODE_SIZE / 2}`}
                fill="none"
                stroke="rgba(62, 62, 78, 0.4)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="8 6"
              />
            </g>
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const xPercent = 50 + Math.sin((i / Math.max(nodes.length - 1, 1)) * Math.PI * 2) * (SWING / 3);
          const isCurrent = node.status === 'current';
          const isCompleted = node.status === 'completed';
          const isLocked = node.status === 'locked';

          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `${xPercent}%`,
                top: 40 + i * NODE_GAP,
                transform: 'translateX(-50%)',
                width: 200,
              }}
            >
              {/* Outer glow for current */}
              {isCurrent && (
                <div
                  className="absolute rounded-full bg-lc-accent/10 animate-pulse"
                  style={{ width: NODE_SIZE + 24, height: NODE_SIZE + 24, top: -12, left: '50%', transform: 'translateX(-50%)' }}
                />
              )}

              {/* Circle */}
              <Link
                to={isLocked ? '#' : `/paths/${node.id}`}
                onClick={(e) => isLocked && e.preventDefault()}
                className={`relative z-10 flex items-center justify-center rounded-full border-4 transition-all duration-300 ${
                  isCompleted
                    ? 'border-lc-green bg-gradient-to-br from-lc-green/25 to-lc-green/10 shadow-[0_0_30px_rgba(44,187,93,0.3)] hover:scale-105'
                    : isCurrent
                      ? 'border-lc-accent bg-gradient-to-br from-lc-accent/25 to-lc-accent/10 shadow-[0_0_35px_rgba(255,161,22,0.3)] hover:scale-110'
                      : 'border-lc-border/60 bg-lc-surface2/80 cursor-not-allowed'
                }`}
                style={{ width: NODE_SIZE, height: NODE_SIZE }}
                aria-label={`${node.title} — ${node.status}`}
              >
                {isCompleted ? (
                  <svg className="h-9 w-9 text-lc-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span className="text-2xl font-black text-lc-accent">{i + 1}</span>
                ) : (
                  <svg className="h-7 w-7 text-lc-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </Link>

              {/* Label area below node */}
              <div className="mt-3 text-center">
                <p className={`text-sm font-bold leading-tight ${
                  isLocked ? 'text-lc-muted/40' : 'text-lc-text'
                }`}>
                  {node.title}
                </p>

                {node.moduleCount > 0 && !isLocked && (
                  <div className="mt-1.5">
                    <div className="mx-auto w-24 h-1.5 rounded-full bg-lc-surface2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-lc-green' : 'bg-lc-accent'
                        }`}
                        style={{ width: `${node.moduleCount > 0 ? (node.completedModules / node.moduleCount) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-lc-muted mt-1">
                      {isCompleted ? 'Completed' : `${node.completedModules} / ${node.moduleCount} modules`}
                    </p>
                  </div>
                )}

                {isCurrent && (
                  <Link
                    to={`/paths/${node.id}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-lc-accent px-5 py-2 text-xs font-bold text-lc-bg hover:opacity-90 transition-opacity shadow-lg shadow-lc-accent/25"
                  >
                    Start Learning
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {/* Trophy node */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: '50%',
            top: 40 + nodes.length * NODE_GAP,
            transform: 'translateX(-50%)',
            width: 200,
          }}
        >
          <div
            className="relative z-10 flex items-center justify-center rounded-full border-4 border-dashed border-lc-accent/25 bg-lc-accent/[0.06]"
            style={{ width: NODE_SIZE, height: NODE_SIZE }}
          >
            <svg className="h-9 w-9 text-lc-accent/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.624V2.72" />
            </svg>
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-lc-accent/40">{rec.targetRole}</p>
            <p className="text-[11px] text-lc-muted/40 mt-0.5">Complete all paths to unlock</p>
          </div>
        </div>
      </div>
    </div>
  );
}
