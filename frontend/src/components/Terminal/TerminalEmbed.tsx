import { useEffect, useRef, useState } from 'react';

interface TerminalEmbedProps {
  language: 'python' | 'javascript';
}

export default function TerminalEmbed({ language }: TerminalEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/terminal/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'switch', language }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' || msg.type === 'info' || msg.type === 'error') {
          setOutput((prev) => [...prev.slice(-500), msg.data]);
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch', language }));
      setOutput([]);
    }
  }, [language]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input', data: input }));
    setOutput((prev) => [...prev, `>>> ${input}\n`]);
    setInput('');
  }

  function handleReset() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'reset' }));
    setOutput([]);
  }

  return (
    <div className="flex flex-col rounded-lg border border-lc-border bg-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between border-b border-lc-border/50 bg-[#16162a] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-lc-green' : 'bg-lc-red'}`} />
          <span className="text-xs text-gray-400">
            {language === 'python' ? 'Python' : 'JavaScript'} REPL
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-[10px] text-gray-500 hover:text-gray-300"
        >
          Reset
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-64 overflow-y-auto p-3 font-mono text-xs text-green-400 whitespace-pre-wrap"
      >
        {output.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
        <div ref={outputEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-lc-border/50">
        <span className="flex items-center px-3 text-xs text-green-400 font-mono">
          &gt;&gt;&gt;
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent px-2 py-2 text-xs text-green-400 font-mono placeholder-gray-600 focus:outline-none"
          placeholder="Type a command..."
          disabled={!connected}
        />
        <button
          type="submit"
          disabled={!connected}
          className="px-3 text-xs text-gray-500 hover:text-green-400 disabled:opacity-30"
        >
          Run
        </button>
      </form>
    </div>
  );
}
