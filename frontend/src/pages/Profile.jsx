import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Trophy, Gamepad2, TrendingUp, Star, Shield, Skull, Zap, ArrowRightLeft } from 'lucide-react';
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

const MODE_LABELS = {
  normal:   'Normal',
  module_1: 'Module 1',
  module_2: 'Module 2',
  module_3: 'Module 3',
};

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

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
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate('/');
  };

  const handleReturnToGame = () => {
    navigate('/game', { state: activeGame });
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
          onClick={handleReturnToGame}
          className="w-full glass-panel rounded-2xl p-4 mb-5 flex items-center justify-between border border-emerald-500/40 hover:border-emerald-500/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Gamepad2 size={20} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-emerald-400 text-sm">Active game in progress</p>
              <p className="text-slate-500 text-xs">Tap to rejoin your current game</p>
            </div>
          </div>
          <span className="text-emerald-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-8 text-center mb-5">
          <p className="text-slate-500 text-sm animate-pulse">Loading stats...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: <Gamepad2 size={18} className="text-cyan-400" />,    label: 'Games played',  value: stats.total_games,  color: 'text-cyan-400' },
              { icon: <Trophy size={18} className="text-yellow-400" />,    label: 'Wins (1st place)', value: stats.wins,       color: 'text-yellow-400' },
              { icon: <Star size={18} className="text-purple-400" />,      label: 'Best score',    value: stats.best_score,   color: 'text-purple-400' },
              { icon: <TrendingUp size={18} className="text-emerald-400" />,label: 'Avg score',    value: stats.avg_score,    color: 'text-emerald-400' },
              { icon: <Shield size={18} className="text-blue-400" />,      label: 'Survived',      value: stats.survived,     color: 'text-blue-400' },
              { icon: <Zap size={18} className="text-orange-400" />,       label: 'Total score',   value: stats.total_score,  color: 'text-orange-400' },
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

          {/* ── Recent games ── */}
          {stats.recent_games?.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-slate-700/40">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#AD9E97' }}>
                  <Trophy size={14} /> Recent Games
                </h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {stats.recent_games.map((game, idx) => (
                  <div key={game.group_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-lg shrink-0">
                      {game.rank <= 3 ? RANK_EMOJI[game.rank - 1] : `#${game.rank}`}
                    </span>
                    <span className="text-lg shrink-0">{game.survived ? '🛡️' : '🧟'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-sm font-semibold truncate">
                        {MODE_LABELS[game.game_mode] || game.game_mode}
                        <span className="text-slate-600 text-xs ml-2">{game.rounds_played} rounds</span>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {game.trades > 0 && (
                          <span className="text-xs text-slate-500">🤝 {game.trades}</span>
                        )}
                        {game.infections_caused > 0 && (
                          <span className="text-xs text-slate-500">☣️ {game.infections_caused}</span>
                        )}
                        <span className="text-xs text-slate-600">
                          {game.rank}/{game.total_players} players
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-black">{game.score}</p>
                      <p className="text-xs text-slate-600">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.total_games === 0 && (
            <div className="glass-panel rounded-2xl p-6 text-center mb-5 text-slate-500 text-sm">
              No completed games yet. Join a session to start building your record!
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center mb-5 text-slate-500 text-sm">
          Could not load stats. Try again later.
        </div>
      )}

      {/* ── Active session (teacher) ── */}
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
