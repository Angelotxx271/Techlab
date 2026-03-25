import { useState, useEffect, useCallback, useRef } from 'react';
import type { SkillLevel } from '../../types';
import { getExplanation, chatAboutConcept } from '../../services/api';
import Markdown from '../common/Markdown';

export interface ExplanationPanelProps {
  topic: string;
  concept: string;
  baseExplanation: string;
  skillLevel: SkillLevel;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

const LEVELS: { id: SkillLevel; label: string; blurb: string }[] = [
  { id: 'beginner', label: 'Beginner', blurb: 'Analogies & plain language' },
  { id: 'intermediate', label: 'Intermediate', blurb: 'Clarity & detail' },
  { id: 'advanced', label: 'Pro', blurb: 'Edge cases & production' },
];

type TabPayload = {
  text: string;
  isFallback: boolean;
  aiUnavailable: boolean;
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function ExplanationPanel({
  topic,
  concept,
  baseExplanation,
  skillLevel,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ExplanationPanelProps) {
  const [activeLevel, setActiveLevel] = useState<SkillLevel>(skillLevel);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<TabPayload | null>(null);
  const cacheRef = useRef<Partial<Record<SkillLevel, TabPayload>>>({});
  const abortRef = useRef<AbortController | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActiveLevel(skillLevel); }, [skillLevel]);

  const fetchForLevel = useCallback(
    async (level: SkillLevel, forceRefresh: boolean) => {
      if (!forceRefresh && cacheRef.current[level]) {
        setPayload(cacheRef.current[level]!);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const result = await getExplanation({ topic, concept, skill_level: level });
        clearTimeout(timer);

        if (controller.signal.aborted) return;

        const next: TabPayload = result.fallback
          ? { text: result.explanation, isFallback: false, aiUnavailable: true }
          : { text: result.explanation, isFallback: false, aiUnavailable: false };

        cacheRef.current[level] = next;
        setPayload(next);
      } catch {
        if (controller.signal.aborted) return;
        const next: TabPayload = { text: baseExplanation, isFallback: true, aiUnavailable: false };
        cacheRef.current[level] = next;
        setPayload(next);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [topic, concept, baseExplanation, timeoutMs],
  );

  useEffect(() => {
    fetchForLevel(activeLevel, false);
    return () => { abortRef.current?.abort(); };
  }, [activeLevel, fetchForLevel]);

  async function retryActiveTab() {
    delete cacheRef.current[activeLevel];
    await fetchForLevel(activeLevel, true);
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await chatAboutConcept({
        topic,
        concept,
        skill_level: activeLevel,
        messages: updated.map((m) => ({ role: m.role, content: m.content })),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I couldn\'t respond right now. Try again.' },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  return (
    <div className="rounded-xl border border-lc-border bg-lc-surface p-6">
      <h2 className="font-display text-xl font-semibold text-lc-text">Learn the idea first</h2>
      <p className="mt-1 text-sm text-lc-muted">
        Pick a depth — each tab uses a different style. Ask questions in the chat below.
      </p>

      {/* Tabs */}
      <div role="tablist" aria-label="Explanation depth" className="mt-4 flex gap-2 border-b border-lc-border pb-3">
        {LEVELS.map((lvl) => {
          const selected = activeLevel === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`tab-${lvl.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveLevel(lvl.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-lc-accent text-lc-bg'
                  : 'bg-lc-surface2 text-lc-muted hover:text-lc-text'
              }`}
            >
              <span className="block">{lvl.label}</span>
              <span className={`block text-xs font-normal ${selected ? 'text-lc-bg/70' : 'text-lc-muted/60'}`}>
                {lvl.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation panel */}
      <div role="tabpanel" aria-labelledby={`tab-${activeLevel}`} className="mt-4 rounded-lg bg-lc-bg/50 p-5">
        {loading && (
          <div className="flex items-center py-6" role="status" aria-live="polite">
            <svg className="h-5 w-5 animate-spin text-lc-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="ml-3 text-sm text-lc-muted">Generating explanation…</span>
          </div>
        )}

        {!loading && payload && (
          <>
            {payload.aiUnavailable && (
              <p className="mb-3 text-xs text-lc-accent/80" role="note">
                AI returned curated fallback — retry for a richer explanation.
              </p>
            )}
            <div className="max-w-none text-sm">
              <Markdown>{payload.text}</Markdown>
            </div>
            {payload.isFallback && (
              <button
                type="button"
                onClick={retryActiveTab}
                className="mt-4 rounded-lg bg-lc-accent px-4 py-2 text-sm font-medium text-lc-bg hover:opacity-90"
              >
                Retry AI explanation
              </button>
            )}
          </>
        )}
      </div>

      {/* Chat */}
      <div className="mt-4 rounded-lg border border-lc-border bg-lc-bg/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-lc-muted">
          Ask about this concept
        </p>

        {chatMessages.length > 0 && (
          <div className="mb-3 max-h-64 space-y-3 overflow-y-auto rounded-lg bg-lc-surface2 p-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-lc-accent text-lc-bg'
                      : 'bg-lc-surface text-lc-text'
                  }`}
                >
                  {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-lc-surface px-3 py-2 text-sm text-lc-muted">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
            placeholder="What does this mean? Can you give an example?"
            className="flex-1 rounded-lg border border-lc-border bg-lc-surface2 px-3 py-2 text-sm text-lc-text placeholder:text-lc-muted focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
            disabled={chatLoading}
          />
          <button
            type="button"
            onClick={handleChatSend}
            disabled={chatLoading || !chatInput.trim()}
            className="rounded-lg bg-lc-accent px-4 py-2 text-sm font-medium text-lc-bg hover:opacity-90 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
