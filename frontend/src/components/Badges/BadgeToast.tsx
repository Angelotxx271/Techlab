import { useEffect, useState } from 'react';

interface Props {
  badge: { label: string; description: string } | null;
  onDone: () => void;
}

export default function BadgeToast({ badge, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!badge) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, [badge, onDone]);

  if (!badge) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-lc-accent/40 bg-lc-surface px-5 py-3 shadow-2xl transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <span className="text-2xl">🏆</span>
      <div>
        <p className="text-sm font-bold text-lc-accent">{badge.label}</p>
        <p className="text-xs text-lc-muted">{badge.description}</p>
      </div>
    </div>
  );
}
