import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    title: 'AI-Powered Learning',
    desc: 'A personal AI instructor adapts to your pace, explains concepts your way, and gives targeted feedback on every exercise.',
    icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
  },
  {
    title: 'Career Path Engine',
    desc: 'Tell us your current role and we map a personalized upgrade path to higher-paying tech positions with the exact skills to get there.',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'XP & Kata Ranks',
    desc: 'Earn XP for every exercise, climb Codewars-style kata ranks from 8 kyu to Master, and compete on the global leaderboard.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Hands-On Terminal',
    desc: 'Practice code in a TryHackMe-style in-browser terminal — run Python and JavaScript right alongside the lesson.',
    icon: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z',
  },
  {
    title: 'Multiplayer Challenges',
    desc: 'Race against other learners in real-time coding challenges. First correct answer wins bonus XP.',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  },
  {
    title: 'HR Marketplace',
    desc: 'Top learners get visible to hiring managers. Your verified skills and rank become your resume.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Streak System',
    desc: 'Build daily learning habits with Duolingo-style streaks. Hit your daily goal and watch the flame grow.',
    icon: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
  },
  {
    title: 'Achievement Badges',
    desc: 'Unlock 9 unique badges for milestones — from your first exercise to reaching the leaderboard top 3.',
    icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.27-1.456 6.003 6.003 0 01-5.27 1.456',
  },
  {
    title: 'Analytics & Certificates',
    desc: 'Track progress with GitHub-style heatmaps, skill radar charts, and earn downloadable certificates on path completion.',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
];

const STATS = [
  { value: '16', label: 'Learning Paths', suffix: '+' },
  { value: '50', label: 'Hands-On Exercises', suffix: '+' },
  { value: '8', label: 'Kata Ranks', suffix: '' },
  { value: '9', label: 'Achievements', suffix: '' },
  { value: '24/7', label: 'AI Instructor', suffix: '' },
  { value: '∞', label: 'Career Potential', suffix: '' },
];

const STEPS = [
  { num: '01', title: 'Tell us about yourself', desc: 'Your current role, experience, and goals — 60 seconds.' },
  { num: '02', title: 'Get your career path', desc: 'AI maps the fastest route to your next role with higher pay.' },
  { num: '03', title: 'Learn by doing', desc: 'Interactive exercises, terminals, and AI feedback — not videos.' },
  { num: '04', title: 'Get hired', desc: 'Your verified profile enters the HR marketplace automatically.' },
];

const TESTIMONIALS = [
  { name: 'Alex K.', role: 'Junior Developer → ML Engineer', text: 'The career path engine nailed it. I went from basic Python to deploying ML models in 3 months.' },
  { name: 'Maria S.', role: 'Marketing → Data Analyst', text: 'I had zero coding experience. The AI instructor explained everything at my level. Now I automate reports daily.' },
  { name: 'James R.', role: 'DevOps Engineer', text: 'The multiplayer challenges are addictive. Nothing beats racing a colleague to solve a problem. Top 3 on the leaderboard!' },
];

/* ------------------------------------------------------------------ */
/* Animated counter hook                                               */
/* ------------------------------------------------------------------ */

function useCountUp(target: string, duration = 1800) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numMatch = target.match(/^(\d+)/);
          if (!numMatch) { setDisplay(target); return; }
          const end = parseInt(numMatch[1]);
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * end);
            setDisplay(String(current));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, display };
}

/* ------------------------------------------------------------------ */
/* Scroll-reveal hook                                                  */
/* ------------------------------------------------------------------ */

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/* Floating particles background                                       */
/* ------------------------------------------------------------------ */

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => {
        const size = 2 + Math.random() * 3;
        const x = Math.random() * 100;
        const delay = Math.random() * 8;
        const dur = 12 + Math.random() * 16;
        return (
          <div
            key={i}
            className="absolute rounded-full bg-lc-accent/20"
            style={{
              width: size, height: size,
              left: `${x}%`,
              bottom: '-4%',
              animation: `floatUp ${dur}s ${delay}s linear infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const featuresReveal = useReveal<HTMLDivElement>();
  const stepsReveal = useReveal<HTMLDivElement>();
  const testimonialsReveal = useReveal<HTMLDivElement>();
  const ctaReveal = useReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-lc-bg flex flex-col overflow-x-hidden">

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 w-full border-b border-lc-border/30 bg-lc-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lc-accent/15 text-base font-black text-lc-accent">TL</span>
            <span className="font-display text-lg font-bold text-lc-text">TechLab</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/onboarding?mode=login" className="rounded-lg px-4 py-2 text-sm font-medium text-lc-muted hover:text-lc-text transition-colors">
              Sign In
            </Link>
            <Link to="/onboarding" className="rounded-lg bg-lc-accent px-5 py-2.5 text-sm font-bold text-lc-bg hover:brightness-110 transition-all shadow-md shadow-lc-accent/20">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16">
        <ParticleField />

        {/* Glow orbs */}
        <div className="pointer-events-none absolute top-10 left-1/4 h-72 w-72 rounded-full bg-lc-accent/8 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-lc-accent/6 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-3xl text-center" style={{ animation: 'heroIn 0.9s ease-out both' }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lc-accent/30 bg-lc-accent/5 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-lc-green animate-pulse" />
            <span className="text-xs font-medium text-lc-accent tracking-wide">AI-powered adaptive learning platform</span>
          </div>

          <h1 className="font-display text-5xl font-extrabold tracking-tight text-lc-text leading-[1.08] sm:text-6xl lg:text-7xl">
            Your tech career,{' '}
            <span className="relative inline-block text-lc-accent">
              upgraded
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-lc-accent/40" viewBox="0 0 200 12" preserveAspectRatio="none">
                <path d="M0 8 Q50 0, 100 8 T200 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'drawLine 1.2s 0.5s ease-out both' }} />
              </svg>
            </span>
            <span className="text-lc-accent">.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-lc-muted max-w-xl mx-auto" style={{ animation: 'heroIn 0.9s 0.2s ease-out both' }}>
            Personalized paths, hands-on exercises, an AI instructor that adapts to you, and a career engine that maps where you are to where you want to be.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animation: 'heroIn 0.9s 0.35s ease-out both' }}>
            <Link
              to="/onboarding"
              className="group relative rounded-xl bg-lc-accent px-9 py-4 text-base font-bold text-lc-bg hover:brightness-110 transition-all shadow-xl shadow-lc-accent/25"
            >
              <span className="relative z-10">Start Learning — Free</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              to="/onboarding?mode=login"
              className="rounded-xl border border-lc-border bg-lc-surface/60 backdrop-blur-sm px-9 py-4 text-base font-medium text-lc-muted hover:text-lc-text hover:border-lc-accent/40 transition-all"
            >
              I have an account
            </Link>
          </div>

          <p className="mt-5 text-xs text-lc-muted/50" style={{ animation: 'heroIn 0.9s 0.5s ease-out both' }}>No credit card. No setup. 60 seconds to your first lesson.</p>
        </div>

        {/* Mockup preview */}
        <div className="relative z-10 mt-16 w-full max-w-4xl" style={{ animation: 'heroIn 1s 0.4s ease-out both' }}>
          <div className="rounded-2xl border border-lc-border/50 bg-lc-surface/70 backdrop-blur-md p-1.5 shadow-2xl shadow-black/30">
            <div className="rounded-xl bg-lc-bg overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-lc-border/30">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-lc-red/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-lc-accent/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-lc-green/50" />
                </div>
                <div className="ml-4 flex-1 h-5 rounded bg-lc-surface2/60 max-w-xs" />
              </div>
              {/* Dashboard mockup */}
              <div className="flex h-64 sm:h-80">
                {/* Sidebar */}
                <div className="w-16 sm:w-44 border-r border-lc-border/20 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-lc-accent/20" />
                    <div className="hidden sm:block h-3 w-16 rounded bg-lc-surface2/70" />
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded ${i === 0 ? 'bg-lc-accent/30' : 'bg-lc-surface2/50'}`} />
                      <div className={`hidden sm:block h-2.5 rounded ${i === 0 ? 'w-14 bg-lc-accent/20' : 'w-12 bg-lc-surface2/40'}`} />
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="flex-1 p-4 sm:p-6 space-y-4">
                  <div className="h-4 w-32 rounded bg-lc-surface2/60" />
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-lg border border-lc-border/20 bg-lc-surface/50 p-3 space-y-2">
                        <div className="h-2.5 w-full rounded bg-lc-surface2/50" />
                        <div className={`h-5 w-12 rounded-full ${i === 0 ? 'bg-lc-accent/25' : i === 1 ? 'bg-lc-green/20' : 'bg-lc-surface2/40'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-lc-border/20 bg-lc-surface/50 p-3 space-y-2">
                    <div className="h-2 w-20 rounded bg-lc-surface2/40" />
                    <div className="flex gap-1 h-8">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="flex-1 rounded-t bg-lc-accent/20" style={{ height: `${15 + Math.random() * 85}%`, marginTop: 'auto' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-4 inset-x-8 h-8 rounded-full bg-lc-accent/5 blur-xl" />
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="relative border-y border-lc-border/20 bg-lc-surface/20 px-6 py-14">
        <div className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {STATS.map((stat) => {
            const counter = useCountUp(stat.value);
            return (
              <div key={stat.label} ref={counter.ref} className="text-center">
                <p className="font-display text-4xl font-extrabold text-lc-accent">
                  {stat.value === '24/7' || stat.value === '∞' ? stat.value : counter.display}{stat.suffix}
                </p>
                <p className="mt-1.5 text-xs font-medium text-lc-muted">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section ref={stepsReveal.ref} className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-center text-3xl sm:text-4xl font-bold text-lc-text mb-3">
            From zero to hired in <span className="text-lc-accent">4 steps</span>
          </h2>
          <p className="text-center text-sm text-lc-muted mb-14 max-w-md mx-auto">Not months of video courses. Real, measurable progress.</p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`relative rounded-xl border border-lc-border/40 bg-lc-surface p-6 transition-all duration-700 ${stepsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <span className="font-mono text-3xl font-black text-lc-accent">{step.num}</span>
                <h3 className="mt-2 text-base font-semibold text-lc-text">{step.title}</h3>
                <p className="mt-2 text-sm text-lc-muted leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 text-lc-accent/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section ref={featuresReveal.ref} className="border-t border-lc-border/20 bg-lc-surface/20 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-center text-3xl sm:text-4xl font-bold text-lc-text mb-3">
            Everything you need to <span className="text-lc-accent">level up</span>
          </h2>
          <p className="text-center text-sm text-lc-muted mb-14 max-w-lg mx-auto">
            From zero to hired — we handle the curriculum, the practice, and the career path.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group rounded-xl border border-lc-border/40 bg-lc-surface p-6 transition-all duration-600 hover:border-lc-accent/40 hover:shadow-xl hover:shadow-lc-accent/5 hover:-translate-y-1 ${featuresReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lc-accent/10 transition-all group-hover:bg-lc-accent/20 group-hover:scale-110">
                  <svg className="h-6 w-6 text-lc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-lc-text">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section ref={testimonialsReveal.ref} className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-center text-3xl sm:text-4xl font-bold text-lc-text mb-14">
            Loved by <span className="text-lc-accent">learners</span>
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-xl border border-lc-border/40 bg-lc-surface p-6 transition-all duration-700 ${testimonialsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="h-4 w-4 text-lc-accent" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-lc-text leading-relaxed italic">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lc-accent/15 text-sm font-bold text-lc-accent">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-lc-text">{t.name}</p>
                    <p className="text-xs text-lc-accent">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section ref={ctaReveal.ref} className="relative border-t border-lc-border/20 px-6 py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-lc-accent/5 to-transparent" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-lc-accent/8 blur-[80px]" />

        <div className={`relative z-10 mx-auto max-w-2xl text-center transition-all duration-800 ${ctaReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-lc-text mb-4">
            Ready to upgrade your career?
          </h2>
          <p className="text-lc-muted mb-8 max-w-md mx-auto">
            Tell us your goals and we'll build your personalized path in under a minute. No credit card, no BS.
          </p>
          <Link
            to="/onboarding"
            className="inline-block rounded-xl bg-lc-accent px-12 py-4 text-lg font-bold text-lc-bg hover:brightness-110 transition-all shadow-xl shadow-lc-accent/30"
          >
            Get Started — It's Free
          </Link>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-lc-border/20 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-lc-accent/10 text-xs font-black text-lc-accent">TL</span>
            <span className="text-sm font-semibold text-lc-muted">TechLab</span>
          </div>
          <span className="text-xs text-lc-muted/40">Built for Cursor Hackathon 2025</span>
        </div>
      </footer>
    </div>
  );
}
