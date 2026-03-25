import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SkillLevel, LearnerProfile } from '../../types';
import { saveProfile } from '../../services/progressStore';
import { useUser } from '../../contexts/UserContext';
import { syncProfileToServer } from '../../services/api';
import { getAuthHeaders } from '../../services/auth';

const GOALS = [
  { id: 'switch', label: 'Switch careers', desc: 'Transition into a tech role', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'levelup', label: 'Level up skills', desc: 'Go deeper in areas I know', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'projects', label: 'Build projects', desc: 'Learn by building real things', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { id: 'certified', label: 'Get certified', desc: 'Prove my skills officially', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { id: 'explore', label: 'Just exploring', desc: "I'm curious about tech", icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
];

const SKILL_LEVELS: { value: SkillLevel; label: string; desc: string; icon: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to tech — just getting started with concepts.', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with basics, ready for frameworks & tools.', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
  { value: 'advanced', label: 'Advanced', desc: 'Experienced developer — deep dives & edge cases.', icon: 'M11.42 15.17l-5.59-5.59L7 8.41l4.42 4.42 8.18-8.18L20.77 6z' },
];

const INTERESTS = [
  { id: 'Web Frameworks', label: 'Web Frameworks', desc: 'Django, Flask, FastAPI', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
  { id: 'Cloud Platforms', label: 'Cloud Platforms', desc: 'AWS, GCP, Azure', icon: 'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z' },
  { id: 'Containerization & Orchestration', label: 'Containers & K8s', desc: 'Docker, Kubernetes', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'AI & Machine Learning', label: 'AI & ML', desc: 'Agentic AI, MCPs', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
  { id: 'DevOps', label: 'DevOps', desc: 'CI/CD, Terraform, GitHub Actions', icon: 'M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m0 0l4.5-7.795M12 12l-4.5 7.794M12 12l4.5 7.794' },
  { id: 'Developer Tools', label: 'Developer Tools', desc: 'Git, VS Code', icon: 'M11.42 15.17l-5.59-5.59a2 2 0 010-2.83l.17-.17a2 2 0 012.83 0l2.59 2.59 6.59-6.59a2 2 0 012.83 0l.17.17a2 2 0 010 2.83L11.42 15.17z' },
];

const ROLE_EXAMPLES = ['Student', 'Marketing Intern', 'Junior Developer', 'Career Changer', 'Self-taught Dev', 'Product Manager', 'Data Analyst', 'Designer'];

const STEP_META = [
  { label: 'Account' },
  { label: 'Goals' },
  { label: 'Level' },
  { label: 'Topics' },
  { label: 'Role' },
  { label: 'Ready!' },
];

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, login, register } = useUser();

  const initialAuthMode = searchParams.get('mode') === 'login' ? 'login' as const : 'register' as const;
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [currentPosition, setCurrentPosition] = useState('');
  const [goals, setGoals] = useState<string[]>([]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialAuthMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  function go(target: Step) {
    setDirection(target > step ? 'forward' : 'back');
    setStep(target);
  }

  function handleSkip() {
    const profile: LearnerProfile = {
      skillLevel: 'intermediate',
      interests: [],
      onboardingComplete: false,
    };
    saveProfile(profile);
    navigate('/dashboard');
  }

  function toggleGoal(id: string) {
    setGoals((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  }

  function toggleInterest(id: string) {
    setInterests((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  async function handleAuth() {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await register(username, password, displayName || username);
        go(1);
      } else {
        await login(username, password);
        try {
          const res = await fetch('/api/users/profile', { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } });
          if (res.ok) {
            const serverProfile = await res.json();
            const restored: LearnerProfile = {
              skillLevel: serverProfile.skillLevel ?? serverProfile.skill_level ?? 'intermediate',
              interests: serverProfile.interests ?? [],
              onboardingComplete: serverProfile.onboarding_complete ?? true,
              currentPosition: serverProfile.currentPosition ?? serverProfile.current_position ?? '',
            };
            saveProfile(restored);
          }
        } catch { /* proceed anyway */ }
        navigate('/dashboard');
      }
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleComplete() {
    const profile: LearnerProfile = {
      skillLevel: skillLevel ?? 'intermediate',
      interests,
      onboardingComplete: true,
      currentPosition: currentPosition || undefined,
      learningGoals: goals.length > 0 ? goals : undefined,
    };
    saveProfile(profile);

    if (isLoggedIn) {
      syncProfileToServer({
        skill_level: profile.skillLevel,
        interests: profile.interests,
        onboarding_complete: true,
        current_position: currentPosition || undefined,
      }).catch(() => {});
    }

    navigate('/dashboard');
  }

  const cardBase = 'rounded-xl border-2 p-4 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-lc-accent focus:ring-offset-2 focus:ring-offset-lc-bg cursor-pointer';
  const cardOff = 'border-lc-border bg-lc-surface hover:border-lc-accent/40 hover:bg-lc-hover';
  const cardOn = 'border-lc-accent bg-lc-accent/10 shadow-[0_0_20px_rgba(255,161,22,0.1)]';

  return (
    <div className="min-h-screen flex flex-col bg-lc-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-lc-border/50">
        <button onClick={() => navigate('/')} className="text-lg font-bold text-lc-accent hover:opacity-80 transition-opacity">
          TechLab
        </button>
        {step > 0 && (
          <button onClick={handleSkip} className="text-xs text-lc-muted hover:text-lc-text">
            Skip for now
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {STEP_META.map((meta, i) => {
            const active = step === i;
            const done = step > i;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-center">
                  <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    done ? 'bg-lc-accent' : active ? 'bg-lc-accent/60' : 'bg-lc-surface2'
                  }`} />
                </div>
                <span className={`text-[9px] font-medium transition-colors ${
                  active ? 'text-lc-accent' : done ? 'text-lc-accent/60' : 'text-lc-muted/50'
                }`}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 animate-[fadeSlideIn_0.3s_ease]" key={`${step}-${direction}`}>

          {/* ====== STEP 0: ACCOUNT ====== */}
          {step === 0 && (
            <div className="max-w-sm mx-auto">
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">
                {authMode === 'register' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-lc-muted mb-6">
                {authMode === 'register'
                  ? 'Track your XP, save progress, and appear on the leaderboard.'
                  : 'Sign in to pick up where you left off.'}
              </p>

              <div className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-lc-muted mb-1">Display name</label>
                    <input
                      type="text"
                      placeholder="How others see you"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-lc-border bg-lc-surface px-4 py-2.5 text-sm text-lc-text placeholder-lc-muted/50 focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-lc-muted mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Pick a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-lc-border bg-lc-surface px-4 py-2.5 text-sm text-lc-text placeholder-lc-muted/50 focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-lc-muted mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="At least 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && username && password && handleAuth()}
                    className="w-full rounded-lg border border-lc-border bg-lc-surface px-4 py-2.5 text-sm text-lc-text placeholder-lc-muted/50 focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
                  />
                </div>
                {authError && (
                  <div className="rounded-lg bg-lc-red/10 border border-lc-red/30 px-3 py-2">
                    <p className="text-xs text-lc-red">{authError}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleAuth}
                disabled={!username || !password || authLoading}
                className="w-full mt-5 rounded-xl bg-lc-accent py-3 text-sm font-bold text-lc-bg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {authLoading ? (authMode === 'register' ? 'Creating account...' : 'Signing in...') : authMode === 'register' ? 'Create Account' : 'Sign In'}
              </button>

              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setAuthError(''); }}
                  className="text-xs text-lc-accent hover:underline"
                >
                  {authMode === 'register' ? 'Already have an account?' : 'Create new account'}
                </button>
                <span className="text-lc-border">|</span>
                <button onClick={() => go(1)} className="text-xs text-lc-muted hover:text-lc-text">
                  Continue as guest
                </button>
              </div>
            </div>
          )}

          {/* ====== STEP 1: GOALS ====== */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">What brings you here?</h2>
              <p className="text-sm text-lc-muted mb-6">Pick one or more goals. This helps us tailor your experience.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`${cardBase} ${goals.includes(goal.id) ? cardOn : cardOff}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        goals.includes(goal.id) ? 'bg-lc-accent/20' : 'bg-lc-surface2'
                      }`}>
                        <svg className={`h-4.5 w-4.5 ${goals.includes(goal.id) ? 'text-lc-accent' : 'text-lc-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={goal.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-lc-text">{goal.label}</p>
                        <p className="text-xs text-lc-muted mt-0.5">{goal.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => go(0)} className="rounded-lg border border-lc-border bg-lc-surface px-5 py-2.5 text-sm font-medium text-lc-muted hover:bg-lc-hover">Back</button>
                <button onClick={() => go(2)} className="rounded-xl bg-lc-accent px-8 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90 disabled:opacity-40" disabled={goals.length === 0}>Next</button>
              </div>
            </div>
          )}

          {/* ====== STEP 2: SKILL LEVEL ====== */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">What's your experience level?</h2>
              <p className="text-sm text-lc-muted mb-6">We'll match content to where you are right now.</p>

              <div className="grid gap-3">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setSkillLevel(level.value)}
                    className={`${cardBase} ${skillLevel === level.value ? cardOn : cardOff}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        skillLevel === level.value ? 'bg-lc-accent/20' : 'bg-lc-surface2'
                      }`}>
                        <svg className={`h-6 w-6 ${skillLevel === level.value ? 'text-lc-accent' : 'text-lc-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={level.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-lc-text">{level.label}</p>
                        <p className="text-sm text-lc-muted mt-0.5">{level.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => go(1)} className="rounded-lg border border-lc-border bg-lc-surface px-5 py-2.5 text-sm font-medium text-lc-muted hover:bg-lc-hover">Back</button>
                <button onClick={() => go(3)} disabled={!skillLevel} className="rounded-xl bg-lc-accent px-8 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}

          {/* ====== STEP 3: INTERESTS ====== */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">What topics interest you?</h2>
              <p className="text-sm text-lc-muted mb-6">Pick as many as you like. You can always explore more later.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERESTS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleInterest(topic.id)}
                    className={`${cardBase} ${interests.includes(topic.id) ? cardOn : cardOff}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        interests.includes(topic.id) ? 'bg-lc-accent/20' : 'bg-lc-surface2'
                      }`}>
                        <svg className={`h-4.5 w-4.5 ${interests.includes(topic.id) ? 'text-lc-accent' : 'text-lc-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={topic.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-lc-text">{topic.label}</p>
                        <p className="text-xs text-lc-muted mt-0.5">{topic.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => go(2)} className="rounded-lg border border-lc-border bg-lc-surface px-5 py-2.5 text-sm font-medium text-lc-muted hover:bg-lc-hover">Back</button>
                <button onClick={() => go(4)} className="rounded-xl bg-lc-accent px-8 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90">Next</button>
              </div>
            </div>
          )}

          {/* ====== STEP 4: CURRENT ROLE ====== */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">What do you do right now?</h2>
              <p className="text-sm text-lc-muted mb-6">
                Tell us your current role and we'll recommend a personalized tech career upgrade path.
              </p>

              <input
                type="text"
                placeholder="Type your current position..."
                value={currentPosition}
                onChange={(e) => setCurrentPosition(e.target.value)}
                className="w-full rounded-xl border border-lc-border bg-lc-surface px-5 py-3.5 text-base text-lc-text placeholder-lc-muted/50 focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
              />

              <div className="flex flex-wrap gap-2 mt-4">
                {ROLE_EXAMPLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setCurrentPosition(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      currentPosition === role
                        ? 'border-lc-accent bg-lc-accent/10 text-lc-accent'
                        : 'border-lc-border bg-lc-surface text-lc-muted hover:border-lc-accent/40 hover:text-lc-text'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => go(3)} className="rounded-lg border border-lc-border bg-lc-surface px-5 py-2.5 text-sm font-medium text-lc-muted hover:bg-lc-hover">Back</button>
                <button onClick={() => go(5)} className="rounded-xl bg-lc-accent px-8 py-2.5 text-sm font-bold text-lc-bg hover:opacity-90">Next</button>
              </div>
            </div>
          )}

          {/* ====== STEP 5: SUMMARY ====== */}
          {step === 5 && (
            <div className="text-center py-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-lc-green/15 mb-5">
                <svg className="h-7 w-7 text-lc-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-lc-text mb-2">You're all set!</h2>
              <p className="text-sm text-lc-muted mb-8 max-w-md mx-auto">
                We've built a personalized experience just for you. Here's a summary of your profile:
              </p>

              <div className="max-w-sm mx-auto rounded-xl border border-lc-border bg-lc-surface p-5 text-left space-y-3 mb-8">
                {isLoggedIn && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-lc-muted">Account</span>
                    <span className="text-xs font-semibold text-lc-green">Signed in as {username || 'you'}</span>
                  </div>
                )}
                {goals.length > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-lc-muted shrink-0">Goals</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {goals.map((g) => {
                        const goal = GOALS.find((x) => x.id === g);
                        return (
                          <span key={g} className="rounded-full bg-lc-accent/10 px-2 py-0.5 text-[10px] font-medium text-lc-accent">
                            {goal?.label ?? g}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-lc-muted">Skill level</span>
                  <span className="text-xs font-semibold text-lc-text capitalize">{skillLevel ?? 'Intermediate'}</span>
                </div>
                {interests.length > 0 && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-lc-muted shrink-0">Interests</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {interests.map((id) => {
                        const topic = INTERESTS.find((t) => t.id === id);
                        return (
                          <span key={id} className="rounded-full bg-lc-surface2 px-2 py-0.5 text-[10px] font-medium text-lc-muted">
                            {topic?.label ?? id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {currentPosition && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-lc-muted">Current role</span>
                    <span className="text-xs font-semibold text-lc-text">{currentPosition}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleComplete}
                className="rounded-xl bg-lc-accent px-12 py-3.5 text-base font-bold text-lc-bg hover:opacity-90 transition-opacity shadow-lg shadow-lc-accent/20"
              >
                Launch Dashboard
              </button>

              <div className="mt-4">
                <button onClick={() => go(4)} className="text-xs text-lc-muted hover:text-lc-text">&larr; Go back and edit</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
