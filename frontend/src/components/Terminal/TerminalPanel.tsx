import { useState } from 'react';
import TerminalEmbed from './TerminalEmbed';

interface TerminalPanelProps {
  onClose: () => void;
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');

  return (
    <div className="rounded-xl border border-lc-border bg-lc-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-lc-border px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-lc-text">Terminal</h3>
          <div className="flex rounded-lg border border-lc-border overflow-hidden">
            <button
              type="button"
              onClick={() => setLanguage('python')}
              className={`px-3 py-1 text-xs font-medium ${
                language === 'python'
                  ? 'bg-lc-accent text-lc-bg'
                  : 'text-lc-muted hover:bg-lc-hover'
              }`}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => setLanguage('javascript')}
              className={`px-3 py-1 text-xs font-medium ${
                language === 'javascript'
                  ? 'bg-lc-accent text-lc-bg'
                  : 'text-lc-muted hover:bg-lc-hover'
              }`}
            >
              JavaScript
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-lc-muted hover:text-lc-text"
          aria-label="Close terminal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <TerminalEmbed language={language} />
    </div>
  );
}
