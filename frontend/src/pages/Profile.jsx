import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Trophy, Gamepad2, TrendingUp, Star, Shield, Skull, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URLS } from '../services/api';

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const Profile = ({ setIsAuthenticated, setHasSession }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : null;
  const username = decoded?.sub || decoded?.username || 'Unknown Agent';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeGame = (() => {
    try { return JSON.parse(localStorage.getItem('player_session') || 'null'); } catch { return null; }
  })();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_URLS.BASE}/auth/stats?token=${token}`)
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_data');
    localStorage.removeItem('player_session');
    localStorage.removeItem('active_secret_word');
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate('/');
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4 animate-zw-fade">

      {/* ── Header card ── */}
      <div className="glass-panel rounded-3xl p-8 mb-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        <div className="inline-flex items-center justify-center bg-emerald-500/15 rounded-full p-5 mb-4 border border-emerald-500/30">
          <UserCircle size={56} className="text-emerald-400" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono text-slate-500">{t('profile_agent_id')}</p>
        <h2 className="text-3xl font-black text-slate-100 mb-1">{username}</h2>
        <p className="text-slate-500 text-sm flex items-center justify-center gap-1">
          <Skull size={13} className="text-emerald-500" />
          {t('profile_operative')}
        </p>
      </div>

      {/* ── Return to active game ── */}
      {activeGame?.groupData?.group_id && (
        <button
          onClick={() => navigate('/game', { state: activeGame })}
          className="w-full glass-panel rounded-2xl p-4 mb-5 flex items-center justify-between border border-emerald-500/40 hover:border-emerald-500/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Gamepad2 size={20} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-emerald-400 text-sm">{t('home_game_in_progress')}</p>
              <p className="text-slate-500 text-xs">{t('home_rejoin')}</p>
            </div>
          </div>
          <span className="text-emerald-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-8 text-center mb-5">
          <p className="text-slate-500 text-sm animate-pulse">{t('auth_please_wait')}</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: <Gamepad2 size={18} className="text-cyan-400" />,      label: t('profile_games_played'), value: stats.total_games,  color: 'text-cyan-400' },
            { icon: <Trophy size={18} className="text-yellow-400" />,      label: t('profile_wins'),          value: stats.wins,         color: 'text-yellow-400' },
            { icon: <Star size={18} className="text-purple-400" />,        label: t('profile_best_score'),    value: stats.best_score,   color: 'text-purple-400' },
            { icon: <TrendingUp size={18} className="text-emerald-400" />, label: t('profile_avg_score'),     value: stats.avg_score,    color: 'text-emerald-400' },
            { icon: <Shield size={18} className="text-blue-400" />,        label: t('profile_survived'),      value: stats.survived,     color: 'text-blue-400' },
            { icon: <Zap size={18} className="text-orange-400" />,         label: t('profile_total_score'),   value: stats.total_score,  color: 'text-orange-400' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800/60 shrink-0">{icon}</div>
              <div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center mb-5 text-slate-500 text-sm">
          {t('profile_stats_error')}
        </div>
      )}

      {/* ── Active teacher session ── */}
      {localStorage.getItem('session_id') && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-5">
          <p className="text-emerald-400 text-xs uppercase tracking-widest font-mono mb-1">{t('profile_active_session')}</p>
          <p className="text-slate-300 font-mono text-sm break-all">{localStorage.getItem('session_id')}</p>
          <button
            onClick={() => {
              const data = JSON.parse(localStorage.getItem('session_data') || '{}');
              navigate('/dashboard', { state: { session: data } });
            }}
            className="mt-3 text-emerald-400 text-sm hover:underline"
          >
            {t('profile_view_dashboard')}
          </button>
        </div>
      )}

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/20 transition-all"
      >
        <LogOut size={18} />
        {t('profile_logout')}
      </button>
    </div>
  );
};

export default Profile;
