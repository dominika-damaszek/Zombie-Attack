import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Trophy, Gamepad2, TrendingUp, Star, Shield, Skull, Zap, X, BarChart2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const MODE_LABELS = {
  normal: 'Normal',
  module_1: 'Module 1',
  module_2: 'Module 2',
  module_3: 'Module 3',
};

const RANK_EMOJI = ['🥇', '🥈', '🥉'];
const ONE_MONTH_SECS = 30 * 24 * 60 * 60;

function isWithinOneMonth(lastActivity) {
  if (!lastActivity) return false;
  return Math.floor(Date.now() / 1000) - lastActivity < ONE_MONTH_SECS;
}

const Profile = ({ setIsAuthenticated, setHasSession }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : null;

  const username = decoded?.sub || decoded?.username || 'Unknown Agent';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDetail = async (game) => {
    if (!isWithinOneMonth(game.last_activity)) return;

    setDetailModal({ game, recap: null, loading: true });
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${game.group_id}/recap`);
      if (!res.ok) throw new Error('Not found');
      const recap = await res.json();
      setDetailModal({ game, recap, loading: false });
    } catch {
      setDetailModal({ game, recap: null, loading: false, error: true });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-20 px-4 animate-zw-fade mb-20">

      {/* ── Game detail modal ── */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 overflow-y-auto"
          style={{ background: 'rgba(10,12,18,0.93)', backdropFilter: 'blur(10px)' }}
          onClick={() => setDetailModal(null)}
        >
          <div
            className="border border-[var(--neon-cyan)]/80 bg-[var(--dark-cyan)]/50 backdrop-blur-md shadow-[0_0_10px_var(--neon-cyan-glow)]/80 rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0  rounded-t-3xl px-6 py-4 border-b border-slate-700/50 flex items-center justify-between z-10">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-[var(--neon-cyan-glow)]" />
                  {MODE_LABELS[detailModal.game.game_mode] || detailModal.game.game_mode}
                  {detailModal.recap?.session_note && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[var(--neon-cyan-glow)]/15 text-[var(--neon-cyan-glow)] border border-[var(--neon-cyan)]/75 font-mono">
                      {detailModal.recap.session_note}
                    </span>
                  )}
                </p>
                <p className="text-[var(--neon-cyan-glow)] text-xs mt-0.5">
                  {detailModal.game.rounds_played} rounds · {detailModal.game.total_players} players
                </p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {detailModal.loading ? (
              <div className="flex items-center justify-center py-14 text-slate-500 text-sm animate-pulse">
                Loading recap…
              </div>
            ) : detailModal.error || !detailModal.recap ? (
              <div className="py-10 text-center text-slate-500 text-sm">Could not load game data.</div>
            ) : (
              <div className="px-6 py-5 flex flex-col gap-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <UserCircle size={20} className="text-[var(--neon-cyan)] drop-shadow-[0_0_2px_var(--neon-cyan-glow)]/80" />, label: 'Players', value: detailModal.recap.total_players },
                    { icon: <Shield size={20} className="text-[var(--neon-green)] drop-shadow-[0_0_2px_var(--neon-green-glow)]/80" />, label: 'Survived', value: detailModal.recap.survivors },
                    { icon: <Skull size={20} className="text-[var(--neon-pink)] drop-shadow-[0_0_2px_var(--neon-pink-glow)]/80" />, label: 'Infection', value: `${detailModal.recap.infection_rate}%` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-slate-800/40 rounded-xl p-3 text-center flex flex-col items-center">
                      <div className="mb-1">{icon}</div>
                      <p className="text-white font-bold">{value}</p>
                      <p className="text-slate-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Your result */}
                <div className="bg-[var(--neon-cyan-glow)]/20 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-3xl font-black text-slate-300 w-12 text-center">#{detailModal.game.rank}</div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest">Your result</p>
                    <p className="text-white font-black text-xl">{detailModal.game.score} pts</p>
                    <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${detailModal.game.survived ? 'bg-[var(--neon-green)] shadow-[0_0_5px_var(--neon-green)]' : 'bg-[var(--neon-pink)] shadow-[0_0_5px_var(--neon-pink)]'}`}></span>
                      <span className={detailModal.game.survived ? 'text-[var(--neon-green)]/80' : 'text-[var(--neon-pink)]/80'}>
                        {detailModal.game.survived ? 'Survived' : 'Infected'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Scoreboard */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <Trophy size={12} /> Scoreboard
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="flex items-center gap-1 text-[var(--neon-green)]/80"><span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_5px_var(--neon-green)]"></span> Survived</span>
                      <span className="flex items-center gap-1 text-[var(--neon-pink)]/80"><span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-pink)] shadow-[0_0_5px_var(--neon-pink)]"></span> Infected</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {detailModal.recap.scoreboard?.map((player) => (
                      <div
                        key={player.username}
                        className={`flex items-center gap-3 p-3 rounded-2xl ${player.username === username ? 'bg-[var(--neon-cyan-glow)]/20 border border-[var(--neon-cyan)]/70' : 'bg-[var(--dark-cyan)]/40'}`}
                      >
                        <span className="text-base font-bold text-slate-300 w-6 text-center shrink-0">
                          #{player.rank}
                        </span>
                        <span className="flex items-center justify-center shrink-0 w-4">
                          {player.is_infected ? (
                            <span className="w-2 h-2 rounded-full bg-[var(--neon-pink)] shadow-[0_0_5px_var(--neon-pink)]"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_5px_var(--neon-green)]"></span>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${player.username === username ? 'text-[var(--neon-cyan)]' : 'text-slate-200'}`}>
                            {player.username} {player.username === username && <span className="text-xs text-[var(--neon-cyan)]/70 ml-1">(you)</span>}
                          </p>
                          <div className="flex gap-2 mt-0.5 font-mono">
                            {player.trades > 0 && <span className="text-xs text-slate-400">Trades: {player.trades}</span>}
                            {player.infections_caused > 0 && <span className="text-xs text-slate-400">Infections: {player.infections_caused}</span>}
                          </div>
                        </div>
                        <p className="text-white font-black text-sm shrink-0">{player.score} <span className="text-slate-500 font-mono text-xs">pts</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <BackButton to="/" />

      <div className="border bg-[var(--neon-pink-glow)]/5 backdrop-blur-sm border-[var(--neon-pink)]/50 rounded-3xl p-8 mb-5 text-center relative overflow-hidden border-[var(--neon-pink)]/90 shadow-[0_0_10px_var(--neon-pink-glow)]">

        <div className="absolute inset-0 bg-[var(--neon-pink-glow)]/10 pointer-events-none" />
        <div className="inline-flex items-center justify-center bg-[var(--neon-pink-glow)]/30 rounded-full p-5 mb-4 border border-[var(--neon-pink)]/90 shadow-[0_0_10px_var(--neon-pink)]/80">
          <UserCircle size={56} className="text-[var(--neon-pink-glow)]" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono text-slate-500">{t('profile_agent_id')}</p>
        <h2 className="text-3xl text-[var(--neon-pink)] mb-1 drop-shadow-[0_0_5px_var(--neon-pink)]/80">{username}</h2>
        <p className="text-[var(--neon-pink-glow)] text-sm flex items-center justify-center gap-1">
          <Skull size={13} className="text-[var(--neon-pink-glow)]" />
          {t('profile_operative')}
        </p>
      </div>

      {/* ── Return to active game ── */}
      {activeGame?.groupData?.group_id && (
        <button
          onClick={() => navigate('/game', { state: activeGame })}
          className="w-full glass-panel rounded-2xl p-4 mb-5 flex items-center justify-between border border-emerald-500/40 hover:border-emerald-500/70 transition-all group shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Gamepad2 size={20} className="text-[var(--neon-green-glow)]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[var(--neon-green-glow)] text-sm">Active game in progress</p>
              <p className="text-slate-500 text-xs">Tap to rejoin your current game</p>
            </div>
          </div>
          <span className="text-[var(--neon-green-glow)] text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-8 text-center mb-5 border border-slate-700/50">
          <p className="text-slate-500 text-sm animate-pulse">Loading stats...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3  mb-5">
            {[
              { icon: <Gamepad2 size={18} className="text-[var(--neon-cyan)]" />, label: 'Games played', value: stats.total_games, color: 'text-[var(--neon-cyan)]/80', borderColor: '#44c5dbab' },
              { icon: <Trophy size={18} className="text-yellow-500" />, label: 'Wins (1st place)', value: stats.wins, color: 'text-yellow-600', borderColor: '#facc15ab' },
              { icon: <Star size={18} className="text-[var(--neon-pink)]" />, label: 'Best score', value: stats.best_score, color: 'text-[var(--neon-pink)]/80', borderColor: '#d88ce4ab' },
              { icon: <TrendingUp size={18} className="text-[var(--neon-green-glow)]" />, label: 'Avg score', value: stats.avg_score, color: 'text-[var(--neon-green-glow)]/80', borderColor: '#34d34eab' },
              { icon: <Shield size={18} className="text-[#b13b41]" />, label: 'Survived', value: stats.survived, color: 'text-[#b13b41]/80', borderColor: '#b13b41ab' },
              { icon: <Zap size={18} className="text-orange-400" />, label: 'Total score', value: stats.total_score, color: 'text-[#fb923c]/80', borderColor: '#fb923cab' },
            ].map(({ icon, label, value, color, borderColor }) => (
              <div key={label} className={`glass-panel rounded-2xl p-4 flex items-center gap-3`} style={{ borderColor: borderColor, boxShadow: `0 0 0px ${borderColor}` }}>
                <div className={`p-2 rounded-xl bg-slate-800/60 shrink-0`}>{icon}</div>
                <div>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent games ── */}
          {stats.recent_games?.length > 0 && (
            <div className="bg-[var(--dark-cyan)]/30 border border-[var(--neon-cyan-glow)]/90 shadow-[0_0_10px_var(--neon-cyan-glow)]/80 rounded-2xl overflow-hidden mb-5 border">
              <div className="px-5 py-3 border-b border-slate-700/40 flex items-center justify-between">
                <h3 className="text-sm flex items-center gap-2">
                  <Trophy size={14} /> Recent Games
                </h3>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1 text-[var(--neon-green)]"><span className="w-2 h-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_5px_var(--neon-green)]"></span> Survived</span>
                  <span className="flex items-center gap-1 text-[var(--neon-pink)]"><span className="w-2 h-2 rounded-full bg-[var(--neon-pink)] shadow-[0_0_5px_var(--neon-pink)]"></span> Infected</span>
                </div>
              </div>
              <div className="divide-y divide-slate-700/30">
                {stats.recent_games.map((game) => {
                  const canView = isWithinOneMonth(game.last_activity);
                  return (
                    <button
                      key={game.group_id}
                      onClick={() => canView && openDetail(game)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all border-l-4 ${game.survived ? 'border-l-5 border-l-[var(--neon-green)] bg-[var(--neon-green)]/5' : 'border-l-5 border-l-[var(--neon-pink)] bg-[var(--neon-pink)]/5'} ${canView ? 'hover:bg-[var(--neon-cyan-glow)]/20 cursor-pointer' : 'cursor-default opacity-60'}`}
                    >
                      <span className="text-lg font-bold shrink-0 text-slate-300 w-6 text-center">
                        #{game.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-semibold truncate">
                          {MODE_LABELS[game.game_mode] || game.game_mode}
                          {game.session_note && (
                            <span className="ml-2 text-xs text-[var(--neon-pink)] font-normal font-mono">{game.session_note}</span>
                          )}
                          <span className="text-slate-600 text-xs ml-2">{game.rounds_played} rounds</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-0.5 font-mono">
                          {game.trades > 0 && <span className="text-xs text-slate-400">Trades: {game.trades}</span>}
                          {game.infections_caused > 0 && <span className="text-xs text-slate-400">Infections: {game.infections_caused}</span>}
                          <span className="text-xs text-slate-500">{game.total_players} players</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-black">{game.score}</p>
                        <p className="text-xs text-slate-500 font-mono">pts</p>
                      </div>
                      {canView && (
                        <span className="text-slate-500 text-xs shrink-0">→</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stats.total_games === 0 && (
            <div className="glass-panel rounded-2xl p-6 text-center mb-5 text-slate-500 text-sm border border-slate-700/50">
              No completed games yet. Join a session to start building your record!
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center mb-5 text-slate-500 text-sm border border-slate-700/50">
          Could not load stats. Try again later.
        </div>
      )}

      {/* ── Active teacher session ── */}
      {localStorage.getItem('session_id') && (
        <div className="bg-[var(--neon-green-glow)]/10 border border-[var(--neon-green-glow)]/30 rounded-2xl p-4 mb-5">
          <p className="text-[var(--neon-green-glow)] text-xs uppercase tracking-widest font-mono mb-1">{t('profile_active_session')}</p>
          <p className="text-slate-300 font-mono text-sm break-all">{localStorage.getItem('session_id')}</p>
          <button
            onClick={() => {
              const data = JSON.parse(localStorage.getItem('session_data') || '{}');
              navigate('/dashboard', { state: { session: data } });
            }}
            className="mt-3 text-[var(--neon-green-glow)] text-sm hover:underline"
          >
            {t('profile_view_dashboard')}
          </button>
        </div>
      )}

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all"
      >
        <LogOut size={18} />
        {t('profile_logout')}
      </button>
    </div>
  );
};

export default Profile;
