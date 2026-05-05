import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Skull, Shield, RotateCcw, Home } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function EndGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { groupId } = location.state || { groupId: localStorage.getItem('endgame_group_id') };
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    fetch(`${API_URLS.BASE}/api/game/${groupId}/recap`)
      .then((r) => r.json())
      .then(setRecap)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-zw-float">🏁</div>
          <p className="text-slate-400 font-mono animate-pulse">{t('end_loading')}</p>
        </div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="p-8 text-center text-slate-400 max-w-md mx-auto mt-12">
        <p>{t('end_no_recap')}</p>
        <button onClick={() => navigate('/')} className="mt-4 btn-secondary">{t('end_go_home')}</button>
      </div>
    );
  }

  const survivedPct = Math.round((recap.survivors / recap.total_players) * 100) || 0;
  const infectedPct = recap.infection_rate;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">
      <div className="text-center mb-8">
        <div className="text-7xl mb-3 animate-zw-float">{infectedPct > 50 ? '🧟' : '🛡️'}</div>
        <h1 className="text-4xl font-black mb-2" style={{ color: '#AD9E97' }}>
          {infectedPct > 50 ? t('end_zombies_win') : t('end_survivors_triumph')}
        </h1>
        <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">
          {recap.game_mode?.toUpperCase()} MODE · Round {recap.rounds_played}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: t('end_players'), value: recap.total_players, icon: '👥', color: '#AD9E97' },
          { label: t('end_survived'), value: recap.survivors, icon: '🛡️', color: '#a8c4a0' },
          { label: t('end_infected'), value: recap.zombies, icon: '🧟', color: '#d97559' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass-panel p-4 text-center rounded-2xl">
            <div className="text-3xl mb-1">{icon}</div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-slate-500 text-xs uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5 mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="flex items-center gap-1" style={{ color: '#a8c4a0' }}><Shield size={12} /> {survivedPct}% {t('end_survived')}</span>
          <span className="flex items-center gap-1" style={{ color: '#d97559' }}>{infectedPct}% {t('end_infected')} <Skull size={12} /></span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(173,158,151,0.12)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${infectedPct}%`,
              background: 'linear-gradient(90deg, #795846, #d97559)',
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-widest mb-3 font-mono" style={{ color: '#a8c4a0' }}>{t('end_survivors_list')}</p>
          {recap.survivor_names.length === 0 ? (
            <p className="text-slate-600 text-sm">{t('end_none_survived')}</p>
          ) : recap.survivor_names.map((n) => (
            <p key={n} className="text-slate-300 text-sm py-1 border-b border-slate-700/40 last:border-0">{n}</p>
          ))}
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-widest mb-3 font-mono" style={{ color: '#d97559' }}>{t('end_zombies_list')}</p>
          {recap.zombie_names.length === 0 ? (
            <p className="text-slate-600 text-sm">{t('end_no_infections')}</p>
          ) : recap.zombie_names.map((n) => (
            <p key={n} className="text-slate-300 text-sm py-1 border-b border-slate-700/40 last:border-0">{n}</p>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <BookOpen size={20} /> {t('end_learned_today')}
        </h2>
        <div className="space-y-3">
          {recap.lessons.map((l) => (
            <div key={l.concept} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(56,44,37,0.5)', border: '1px solid rgba(109,113,98,0.2)' }}>
              <span className="text-xl shrink-0">{l.icon}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: '#AD9E97' }}>{l.concept}</p>
                <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{l.lesson}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          <Home size={18} /> {t('end_home')}
        </button>
        <button
          onClick={() => { localStorage.removeItem('session_id'); localStorage.removeItem('session_data'); navigate('/host'); }}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} /> {t('end_new_game')}
        </button>
      </div>
    </div>
  );
}
