import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Skull, Shield, RotateCcw, Home, Trophy, Zap, Target, ArrowRightLeft } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const PODIUM_STYLES = [
  { rank: 1, emoji: '🥇', bg: 'bg-yellow-500/15 border-yellow-500/40', color: 'text-yellow-400', size: 'text-5xl', order: 'order-2', height: 'h-28' },
  { rank: 2, emoji: '🥈', bg: 'bg-slate-500/15 border-slate-400/30', color: 'text-slate-300', size: 'text-4xl', order: 'order-1', height: 'h-20' },
  { rank: 3, emoji: '🥉', bg: 'bg-orange-700/15 border-orange-600/30', color: 'text-orange-400', size: 'text-3xl', order: 'order-3', height: 'h-16' },
];

function StatPill({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(56,44,37,0.6)', border: '1px solid rgba(109,113,98,0.2)' }}>
      <span>{icon}</span>
      <span style={{ color: color || '#6D7162' }}>{value}</span>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

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
        <button onClick={() => navigate('/')} className="mt-4 btn-secondary p-3">{t('end_go_home')}</button>
      </div>
    );
  }

  const infectedPct = recap.infection_rate;
  const podium = recap.podium || [];
  const scoreboard = recap.scoreboard || [];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">

      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div className="text-7xl mb-3 animate-zw-float">{infectedPct > 50 ? '🧟' : '🏆'}</div>
        <h1 className="text-3xl sm:text-4xl font-black mb-1 leading-tight" style={{ color: '#AD9E97' }}>
          {recap.game_mode === 'module_1' ? 'Trading Complete!' : (infectedPct > 50 ? t('end_zombies_win') : t('end_survivors_triumph'))}
        </h1>
        <p className="text-slate-500 font-mono text-xs sm:text-sm uppercase tracking-widest">
          {recap.game_mode?.replace('_', ' ').toUpperCase()} · {Math.min(recap.rounds_played, 3)} {t('dash_rounds_played')} · {recap.total_players} {t('end_players')}
        </p>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {recap.game_mode === 'module_1' ? [
          { label: t('end_players'), value: recap.total_players, icon: '👥', color: '#AD9E97' },
          { label: 'Total Trades', value: recap.total_trades || 0, icon: '🤝', color: '#6D9EEB' },
          { label: 'Objectives Met', value: recap.total_objectives_met || 0, icon: '🎯', color: '#a8c4a0' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass-panel p-3 sm:p-4 text-center rounded-2xl">
            <div className="text-xl sm:text-2xl mb-1">{icon}</div>
            <p className="text-xl sm:text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1 sm:mt-0">{label}</p>
          </div>
        )) : [
          { label: t('end_players'), value: recap.total_players, icon: '👥', color: '#AD9E97' },
          { label: t('end_survived'), value: recap.survivors, icon: '🛡️', color: '#a8c4a0' },
          { label: t('end_infected'), value: recap.zombies, icon: '🧟', color: '#d97559' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass-panel p-3 sm:p-4 text-center rounded-2xl">
            <div className="text-xl sm:text-2xl mb-1">{icon}</div>
            <p className="text-xl sm:text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1 sm:mt-0">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Podium (top 3) ── */}
      {podium.length > 0 && (
        <div className="mb-8">
          <h2 className="text-center text-xs uppercase tracking-widest font-mono mb-5 flex items-center justify-center gap-2" style={{ color: '#6D7162' }}>
            <Trophy size={13} /> {t('end_individual_rankings')}
          </h2>
          <div className="flex items-end justify-center gap-3">
            {[
              podium[1], // 2nd — left
              podium[0], // 1st — centre (tallest)
              podium[2], // 3rd — right
            ].filter(Boolean).map((entry, i) => {
              const style = PODIUM_STYLES.find(s => s.rank === entry.rank) || PODIUM_STYLES[2];
              return (
                <div key={entry.username} className={`flex flex-col items-center gap-2 ${style.order}`} style={{ minWidth: 96 }}>
                  <div className={`${style.size} leading-none`}>{recap.game_mode === 'module_1' ? '📦' : (entry.is_infected ? '🧟' : '🛡️')}</div>
                  <p className={`font-black text-sm text-center truncate max-w-[88px] ${style.color}`}>{entry.username}</p>
                  <p className="text-xl font-black text-white">{entry.score} <span className="text-xs font-normal text-slate-500">{t('end_pts')}</span></p>
                  <div className={`w-full rounded-t-xl border-2 flex items-end justify-center pb-2 ${style.bg} ${style.height}`}>
                    <span className="text-2xl">{style.emoji}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Full leaderboard ── */}
      <div className="glass-panel rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-700/40">
          <h2 className="font-bold flex items-center gap-2 text-sm" style={{ color: '#AD9E97' }}>
            <Trophy size={15} /> {t('end_full_leaderboard')}
          </h2>
        </div>
        <div className="divide-y divide-slate-700/30">
          {scoreboard.map((entry, idx) => {
            const isTop = entry.rank === 1;
            return (
              <div
                key={entry.username}
                className={`flex items-center gap-3 px-5 py-3 transition-all ${isTop ? 'bg-yellow-500/5' : ''}`}
              >
                {/* Rank */}
                <div className="w-7 text-center">
                  {entry.rank <= 3
                    ? <span className="text-lg">{['🥇', '🥈', '🥉'][entry.rank - 1]}</span>
                    : <span className="text-slate-600 font-mono text-sm font-bold">#{entry.rank}</span>}
                </div>

                {/* Role icon */}
                <span className="text-xl shrink-0">{recap.game_mode === 'module_1' ? '📦' : (entry.is_infected ? '🧟' : '🛡️')}</span>

                {/* Name + stat pills */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isTop ? 'text-yellow-300' : 'text-slate-200'}`}>
                    {entry.username}
                    {entry.is_initial_zombie && <span className="ml-1.5 text-xs font-mono text-rose-400">{t('end_patient_zero')}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(entry.trades || 0) > 0 && (
                      <StatPill icon="🤝" label={t('end_stat_trades')} value={`+${entry.trades}`} color="#6D9EEB" />
                    )}
                    {recap.game_mode !== 'module_1' && (entry.infections_caused || 0) > 0 && (
                      <StatPill icon="☣️" label={t('end_stat_infected_by')} value={`+${entry.infections_caused}`} color="#d97559" />
                    )}
                    {(entry.objectives_met || 0) > 0 && (
                      <StatPill icon="🎯" label={`obj ${entry.objectives_met}/${entry.objectives_total}`} value="✓" color="#a8c4a0" />
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className={`text-xl font-black ${isTop ? 'text-yellow-400' : 'text-white'}`}>{entry.score}</p>
                  <p className="text-xs text-slate-600">{t('end_pts')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scoring key ── */}
      <div className="glass-panel rounded-2xl p-4 mb-6">
        <p className="text-xs uppercase tracking-widest font-mono mb-3" style={{ color: '#6D7162' }}>{t('end_scoring_key')}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(recap.game_mode === 'module_1' ? [
            { icon: '🤝', label: t('end_score_trade'), pts: '+1' },
            { icon: '✅', label: 'Round completed', pts: '+2' },
            { icon: '🎯', label: t('end_score_objective'), pts: '+1' },
            { icon: '🏆', label: t('end_score_all_objectives'), pts: '+2' },
            { icon: '⏭️', label: 'Skipped trade (Odd player)', pts: '+2' },
          ] : [
            { icon: '🤝', label: t('end_score_trade'), pts: '+1' },
            { icon: '☣️', label: t('end_score_infect'), pts: '+3' },
            { icon: '🛡️', label: t('end_score_survive'), pts: '+2' },
            { icon: '🎯', label: t('end_score_objective'), pts: '+1' },
            { icon: '🏆', label: t('end_score_all_objectives'), pts: '+2' },
            { icon: '🌟', label: t('end_score_final_survivor'), pts: '+5' },
            { icon: '🕵️', label: 'Caught a zombie', pts: '+3' },
            { icon: '❌', label: 'Wrong accusation (Skip/Decline)', pts: '-2' },
            { icon: '⏭️', label: 'Skipped trade (Odd player)', pts: '+2' },
          ]).map(({ icon, label, pts }) => (
            <div key={label} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(56,44,37,0.5)', border: '1px solid rgba(109,113,98,0.15)' }}>
              <span className="flex items-center gap-1.5 text-slate-300">{icon} {label}</span>
              <span className={`font-black ml-2 ${pts.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lessons learned ── */}
      <div className="glass-panel rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <BookOpen size={16} /> {t('end_learned_today')}
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

      {/* ── Actions ── */}
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
