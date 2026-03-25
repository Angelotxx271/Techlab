import { useEffect, useRef, useState } from 'react';
import { getCertificate, type CertificateData } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

interface Props {
  pathId: string;
}

export default function Certificate({ pathId }: Props) {
  const { isLoggedIn } = useUser();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState('');
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn || !pathId) return;
    getCertificate(pathId).then(setCert).catch((e) => setError(e?.message ?? 'Not available'));
  }, [isLoggedIn, pathId]);

  function handleDownload() {
    if (!certRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Certificate - ${cert?.pathTitle}</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; }
        .cert { width: 800px; padding: 60px; background: linear-gradient(135deg, #1a1a2e, #282a36); border: 3px solid #ffa116; border-radius: 16px; color: #eff1f6; text-align: center; font-family: system-ui; }
        .cert h1 { font-size: 14px; text-transform: uppercase; letter-spacing: 4px; color: #9ca3af; margin: 0; }
        .cert h2 { font-size: 36px; color: #ffa116; margin: 16px 0 8px; }
        .cert .name { font-size: 28px; margin: 24px 0; font-weight: bold; }
        .cert .path { font-size: 20px; color: #ffa116; margin: 8px 0; }
        .cert .meta { font-size: 12px; color: #9ca3af; margin-top: 32px; }
        @media print { body { background: white; } }
      </style></head><body>
      ${certRef.current.outerHTML}
      <script>setTimeout(() => window.print(), 300)</script>
      </body></html>
    `);
  }

  if (error) return null;
  if (!cert) return null;

  const dateStr = new Date(cert.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-4">
      <div
        ref={certRef}
        className="cert mx-auto max-w-2xl rounded-2xl border-2 border-lc-accent/60 bg-gradient-to-br from-lc-bg via-lc-surface to-lc-bg p-10 text-center"
      >
        <p className="text-xs uppercase tracking-[4px] text-lc-muted">Certificate of Completion</p>
        <div className="my-4 mx-auto h-px w-32 bg-lc-accent/40" />
        <p className="text-sm text-lc-muted">This certifies that</p>
        <p className="text-3xl font-bold text-lc-text mt-2">{cert.userName}</p>
        <p className="text-sm text-lc-muted mt-4">has successfully completed</p>
        <p className="text-2xl font-bold text-lc-accent mt-2">{cert.pathTitle}</p>
        <div className="mt-6 flex justify-center gap-8 text-xs text-lc-muted">
          <span>{dateStr}</span>
          <span>{cert.totalXp} XP</span>
          <span>{cert.rankTitle}</span>
        </div>
        <div className="mt-6 mx-auto h-px w-48 bg-lc-border/40" />
        <p className="mt-3 text-[10px] text-lc-muted">TechLab Platform</p>
      </div>
      <div className="text-center">
        <button
          onClick={handleDownload}
          className="rounded-lg bg-lc-accent px-5 py-2 text-sm font-bold text-lc-bg hover:opacity-90 transition-opacity"
        >
          Download Certificate
        </button>
      </div>
    </div>
  );
}
