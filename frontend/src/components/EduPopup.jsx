import React, { useEffect, useState } from 'react';
import { X, BookOpen } from 'lucide-react';

const TAG_COLORS = {
  phishing_awareness: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  malware_spread:     'text-rose-400 bg-rose-500/10 border-rose-500/30',
  firewall:           'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  integrity_check:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  threat_analysis:    'text-violet-400 bg-violet-500/10 border-violet-500/30',
  zero_trust:         'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

const TAG_LABELS = {
  phishing_awareness: '🎣 Phishing',
  malware_spread:     '🦠 Malware',
  firewall:           '🛡️ Firewall',
  integrity_check:    '✅ Integrity',
  threat_analysis:    '🔍 Analysis',
  zero_trust:         '🚫 Zero Trust',
};

export default function EduPopup({ edu, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (edu) {
      setVisible(true);
      const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 7000);
      return () => clearTimeout(t);
    }
  }, [edu, onDismiss]);

  if (!edu) return null;

  const tagStyle = TAG_COLORS[edu.tag] || 'text-slate-400 bg-slate-700/40 border-slate-600';
  const tagLabel = TAG_LABELS[edu.tag] || edu.tag;

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-24 md:max-w-sm z-50 edu-popup p-5 animate-zw-slide transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <div className="text-2xl mt-0.5 shrink-0">{edu.icon || '💡'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-slate-100 font-bold text-sm">{edu.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${tagStyle}`}>
              {tagLabel}
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">{edu.body}</p>
          {edu.prev_owner_infected !== undefined && (
            <p className={`mt-1.5 text-xs font-bold ${edu.prev_owner_infected ? 'text-rose-400' : 'text-emerald-400'}`}>
              Verdict: Previous holder was {edu.prev_owner_infected ? '🔴 INFECTED' : '🟢 CLEAN'}
            </p>
          )}
        </div>
      </div>

      {/* Auto-dismiss bar */}
      <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(173,158,151,0.15)' }}>
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #795846, #AD9E97)',
            animation: 'zw-timer-bar 7s linear forwards',
          }}
        />
      </div>
      <style>{`@keyframes zw-timer-bar { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}
