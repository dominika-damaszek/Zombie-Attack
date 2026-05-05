import React, { useState } from 'react';
import { HelpCircle, X, Camera, Wifi, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';

async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

const PROBLEMS = [
  {
    id: 'camera',
    icon: <Camera size={22} />,
    title: "Can't scan QR codes",
    desc: 'Camera is black or not working',
    color: '#795846',
    action: async (setStatus) => {
      setStatus({ id: 'camera', state: 'loading', msg: 'Requesting camera access…' });
      const ok = await requestCameraPermission();
      if (ok) {
        setStatus({ id: 'camera', state: 'success', msg: 'Camera access granted! Close this and try scanning again.' });
      } else {
        setStatus({
          id: 'camera', state: 'error',
          msg: 'Permission denied. Go to your browser settings and allow camera access for this site, then try again.',
        });
      }
    },
  },
  {
    id: 'connection',
    icon: <Wifi size={22} />,
    title: 'Connection issues',
    desc: 'Game not updating or slow',
    color: '#0891b2',
    action: async (setStatus) => {
      setStatus({ id: 'connection', state: 'loading', msg: 'Reloading page…' });
      setTimeout(() => window.location.reload(), 800);
    },
  },
  {
    id: 'stuck',
    icon: <RefreshCw size={22} />,
    title: 'Page is stuck or frozen',
    desc: 'Nothing is responding',
    color: '#6D7162',
    action: async (setStatus) => {
      setStatus({ id: 'stuck', state: 'loading', msg: 'Refreshing…' });
      setTimeout(() => window.location.reload(), 600);
    },
  },
  {
    id: 'wrongpage',
    icon: <AlertTriangle size={22} />,
    title: 'Joined wrong room',
    desc: 'Need to go back and re-enter code',
    color: '#d97559',
    action: async (setStatus) => {
      setStatus({ id: 'wrongpage', state: 'loading', msg: 'Going back to join screen…' });
      setTimeout(() => { window.location.href = '/join'; }, 600);
    },
  },
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setStatus(null), 300);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'rgba(42,38,34,0.95)',
          border: '1px solid rgba(109,113,98,0.5)',
          color: '#AD9E97',
          backdropFilter: 'blur(12px)',
        }}
      >
        <HelpCircle size={17} style={{ color: '#795846' }} />
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(26,22,18,0.85)' }}>
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: 'rgba(30,27,24,0.98)', border: '1px solid rgba(109,113,98,0.4)', backdropFilter: 'blur(24px)' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(109,113,98,0.2)' }}>
              <div className="flex items-center gap-2">
                <HelpCircle size={20} style={{ color: '#795846' }} />
                <h2 className="text-lg font-black" style={{ color: '#AD9E97' }}>Help & Common Problems</h2>
              </div>
              <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {status && (
                <div className={`p-4 rounded-2xl text-sm leading-relaxed mb-1 ${
                  status.state === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : status.state === 'error'
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      : 'bg-slate-800/60 border border-slate-700/50 text-slate-300'
                }`}>
                  {status.state === 'loading' && <span className="inline-block w-3 h-3 rounded-full bg-slate-400 animate-pulse mr-2" />}
                  {status.msg}
                </div>
              )}

              <p className="text-xs uppercase tracking-widest font-mono px-1 pb-1" style={{ color: '#6D7162' }}>
                Tap a problem to fix it
              </p>

              {PROBLEMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => p.action(setStatus)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'rgba(56,44,37,0.5)', border: '1px solid rgba(109,113,98,0.2)' }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${p.color}22`, color: p.color }}>
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-200">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                </button>
              ))}

              <div className="pt-2 pb-1 px-1">
                <p className="text-xs text-slate-600 text-center leading-relaxed">
                  Still stuck? Ask your teacher for help or try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
