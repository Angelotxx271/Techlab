import { useEffect, useRef, useState } from 'react';
import { createMultiplayerRoom, listMultiplayerRooms, type MultiplayerRoom } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

type Phase = 'lobby' | 'waiting' | 'active' | 'finished';

interface Challenge {
  id: string;
  title: string;
  description: string;
  template: string;
  language: string;
}

export default function ChallengeRoom() {
  const { user, isLoggedIn } = useUser();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [rooms, setRooms] = useState<MultiplayerRoom[]>([]);
  const [roomId, setRoomId] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [result, setResult] = useState<{ winner: boolean; winnerName: string } | null>(null);
  const [timer, setTimer] = useState(300);
  const [answer, setAnswer] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (phase === 'lobby') {
      listMultiplayerRooms().then(setRooms).catch(() => {});
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function connect(rid: string) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.hostname}:8000/api/multiplayer/ws/${rid}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        userId: user?.id ?? 'anon',
        displayName: user?.displayName ?? 'Player',
      }));
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'joined') {
        setChallenge(msg.challenge);
        setCode(msg.challenge.template || '');
        setPhase('waiting');
      } else if (msg.type === 'opponent_joined' || msg.type === 'start') {
        setPhase('active');
        timerRef.current = setInterval(() => setTimer((t) => Math.max(t - 1, 0)), 1000);
      } else if (msg.type === 'opponent_progress') {
        setOpponentProgress(msg.progress);
      } else if (msg.type === 'finished') {
        setPhase('finished');
        setResult({ winner: msg.isYou, winnerName: msg.winnerName });
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (msg.type === 'result' && !msg.correct) {
        setAnswer('');
      } else if (msg.type === 'opponent_left') {
        setPhase('finished');
        setResult({ winner: true, winnerName: user?.displayName ?? 'You' });
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
  }

  async function handleCreate() {
    const res = await createMultiplayerRoom();
    setRoomId(res.roomId);
    connect(res.roomId);
  }

  function handleJoin(rid: string) {
    setRoomId(rid);
    connect(rid);
  }

  function handleSubmit() {
    wsRef.current?.send(JSON.stringify({ type: 'submit', code, answer: answer.trim() }));
  }

  function handleProgress() {
    const progress = Math.min(Math.round((code.length / 200) * 100), 100);
    wsRef.current?.send(JSON.stringify({ type: 'progress', progress }));
  }

  if (!isLoggedIn) {
    return (
      <div className="py-12 text-center">
        <p className="text-lc-muted">Sign in to challenge other learners.</p>
      </div>
    );
  }

  const mm = Math.floor(timer / 60);
  const ss = timer % 60;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-lc-text">Multiplayer Challenge</h1>
        <p className="mt-1 text-lc-muted">Race against another learner to solve a coding challenge.</p>
      </div>

      {phase === 'lobby' && (
        <div className="space-y-4">
          <button
            onClick={handleCreate}
            className="rounded-lg bg-lc-accent px-6 py-3 text-sm font-bold text-lc-bg hover:opacity-90 transition-opacity"
          >
            Create Room
          </button>

          {rooms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-lc-text">Open Rooms</h3>
              {rooms.map((r) => (
                <button
                  key={r.roomId}
                  onClick={() => handleJoin(r.roomId)}
                  className="w-full flex items-center justify-between rounded-lg border border-lc-border bg-lc-surface p-4 hover:border-lc-accent/40 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-lc-text">{r.challenge}</span>
                    <span className="ml-3 text-xs text-lc-muted">{r.players}/2 players</span>
                  </div>
                  <span className="text-xs font-medium text-lc-accent">Join</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'waiting' && (
        <div className="rounded-lg border border-lc-border bg-lc-surface p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-lc-accent border-t-transparent" />
          <p className="mt-4 text-lc-muted">Waiting for opponent to join...</p>
          <p className="mt-1 text-xs text-lc-muted">Room: {roomId}</p>
        </div>
      )}

      {(phase === 'active' || phase === 'finished') && challenge && (
        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-between rounded-lg border border-lc-border bg-lc-surface px-4 py-2">
            <span className="text-sm font-medium text-lc-text">{challenge.title}</span>
            <span className={`font-mono text-lg font-bold ${timer < 60 ? 'text-lc-red' : 'text-lc-accent'}`}>
              {mm}:{ss.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Split view */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Your side */}
            <div className="rounded-lg border border-lc-border bg-lc-surface p-4 space-y-3">
              <h3 className="text-sm font-semibold text-lc-green">You</h3>
              <p className="text-xs text-lc-muted">{challenge.description}</p>
              <textarea
                value={code}
                onChange={(e) => { setCode(e.target.value); handleProgress(); }}
                disabled={phase === 'finished'}
                className="w-full h-40 rounded border border-lc-border bg-lc-code p-3 font-mono text-xs text-lc-text resize-none focus:border-lc-accent/50 focus:outline-none"
                spellCheck={false}
              />
              {phase === 'active' && (
                <div className="flex gap-2">
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Your answer..."
                    className="flex-1 rounded border border-lc-border bg-lc-code px-3 py-2 text-xs text-lc-text focus:border-lc-accent/50 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    onClick={handleSubmit}
                    className="rounded bg-lc-green px-4 py-2 text-xs font-bold text-lc-bg hover:opacity-90"
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>

            {/* Opponent side */}
            <div className="rounded-lg border border-lc-border bg-lc-surface p-4 space-y-3">
              <h3 className="text-sm font-semibold text-lc-red">Opponent</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-lc-surface2 overflow-hidden">
                  <div className="h-full rounded-full bg-lc-red/70 transition-all duration-500" style={{ width: `${opponentProgress}%` }} />
                </div>
                <span className="text-xs text-lc-muted">{opponentProgress}%</span>
              </div>
              {phase === 'finished' && result && (
                <div className={`rounded-lg p-4 text-center ${result.winner ? 'bg-lc-green/10 border border-lc-green/30' : 'bg-lc-red/10 border border-lc-red/30'}`}>
                  <p className="text-lg font-bold">{result.winner ? '🎉 You Win!' : '😔 You Lost'}</p>
                  <p className="text-xs text-lc-muted mt-1">Winner: {result.winnerName}</p>
                  {result.winner && <p className="text-xs text-lc-green mt-1">+50 XP Bonus!</p>}
                </div>
              )}
            </div>
          </div>

          {phase === 'finished' && (
            <button
              onClick={() => { setPhase('lobby'); setResult(null); setTimer(300); wsRef.current?.close(); }}
              className="rounded-lg bg-lc-accent px-6 py-2 text-sm font-bold text-lc-bg hover:opacity-90"
            >
              Back to Lobby
            </button>
          )}
        </div>
      )}
    </section>
  );
}
