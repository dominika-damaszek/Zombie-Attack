import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Shield, Skull, BookOpen, Users, ChevronLeft, Trophy, BarChart2, X, Zap } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];
const ONE_MONTH_SECS = 30 * 24 * 60 * 60;

function isWithinOneMonth(lastActivity) {
  if (!lastActivity) return false;
  return Math.floor(Date.now() / 1000) - lastActivity < ONE_MONTH_SECS;
}

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

export default function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : null;
  const username = decoded?.sub || decoded?.username || '';

  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('student');
  const [detailModal, setDetailModal] = useState(null);
  const [teacherModal, setTeacherModal] = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_URLS.BASE}/auth/history?token=${token}`).then(r => r.json()),
      fetch(`${API_URLS.BASE}/auth/stats?token=${token}`).then(r => r.json()),
    ])
      .then(([histData, statsData]) => {
        setData(histData);
        setStats(statsData);
        setTab(histData.as_teacher?.length > 0 ? 'teacher' : 'student');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const openTeacherDetail = async (session) => {
    const finishedGroups = session.groups?.filter(g => g.game_state === 'end_game') || [];
    setTeacherModal({ session, groups: [], loading: true });
    try {
      const recaps = await Promise.all(
        finishedGroups.map(g =>
          fetch(`${API_URLS.BASE}/api/game/${g.group_id}/recap`)
            .then(r => r.ok ? r.json() : null)
            .then(recap => recap ? { ...g, recap } : null)
        )
      );
      setTeacherModal({ session, groups: recaps.filter(Boolean), loading: false });
    } catch {
      setTeacherModal({ session, groups: [], loading: false, error: true });
    }
  };

  const openDetail = async (game) => {
    if (!isWithinOneMonth(game.last_activity)) return;
    setDetailModal({ game, recap: null, loading: true });
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${game.group_id}/recap`);
      if (!res.ok) throw new Error('Not found');
      const recap = await res.json();
      setDetailModal({ game, recap, loading: false });
    } catch {
      setDetailModal({ game, recap: null, loading: false, error: true });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-zw-float">📜</div>
          <p className="text-slate-400 font-mono animate-pulse">{t('history_loading')}</p>
        </div>
      </div>
    );
  }

  const teacherGames = data?.as_teacher || [];
  const studentGames = data?.as_student || [];
  const recentGames = stats?.recent_games || [];
  const hasTeacher = teacherGames.length > 0;
  const hasStudent = studentGames.length > 0 || recentGames.length > 0;

  const getModeLabel = (game_mode) => {
    const map = {
      module_1: { label: `${t('mod1_label')}: ${t('mod1_sublabel')}`, emoji: '📘' },
      module_2: { label: `${t('mod2_label')}: ${t('mod2_sublabel')}`, emoji: '⚠️' },
      module_3: { label: `${t('mod3_label')}: ${t('mod3_sublabel')}`, emoji: '🔒' },
      normal:   { label: t('host_normal_mode'), emoji: '🧟' },
    };
    return map[game_mode] || map.normal;
  };

  const getStateLabel = (state) => {
    const map = {
      end_game: t('history_finished'),
      lobby: 'Lobby',
      round_active: t('history_in_progress'),
      module_instructions: t('history_in_progress'),
      module_between_rounds: t('history_in_progress'),
    };
    return map[state] || t('history_in_progress');
  };

  const MODE_LABELS = {
    normal: 'Normal', module_1: 'Module 1', module_2: 'Module 2', module_3: 'Module 3',
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,12,18,0.93)', backdropFilter: 'blur(10px)' }}
          onClick={() => setDetailModal(null)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 glass-panel rounded-t-3xl px-6 py-4 border-b border-slate-700/50 flex items-center justify-between z-10">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-emerald-400" />
                  {MODE_LABELS[detailModal.game.game_mode] || detailModal.game.game_mode}
                  {detailModal.recap?.session_note && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-mono">
                      {detailModal.recap.session_note}
                    </span>
                  )}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {detailModal.game.rounds_played} {t('history_rounds_pl')} · {detailModal.game.total_players} {t('end_players')}
                </p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {detailModal.loading ? (
              <div className="flex items-center justify-center py-14 text-slate-500 text-sm animate-pulse">
                {t('auth_please_wait')}
              </div>
            ) : detailModal.error || !detailModal.recap ? (
              <div className="py-10 text-center text-slate-500 text-sm">{t('profile_stats_error')}</div>
            ) : (
              <div className="px-6 py-5 flex flex-col gap-5">
                {/* Your result */}
                <div className="bg-slate-800/60 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-4xl">{detailModal.game.rank <= 3 ? RANK_EMOJI[detailModal.game.rank - 1] : `#${detailModal.game.rank}`}</div>
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest">{t('profile_your_result')}</p>
                    <p className="text-white font-black text-xl">{detailModal.game.score} {t('end_pts')}</p>
                    <p className="text-slate-500 text-sm">
                      {detailModal.game.survived ? `🛡️ ${t('end_survived')}` : `🧟 ${t('end_infected')}`} ·
                      {t('profile_rank')} {detailModal.game.rank}/{detailModal.game.total_players}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '👥', label: t('end_players'),    value: detailModal.recap.total_players },
                    { icon: '🛡️', label: t('end_survived'),   value: detailModal.recap.survivors },
                    { icon: '☣️', label: t('end_infection_rate'), value: `${detailModal.recap.infection_rate}%` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-slate-800/40 rounded-xl p-3 text-center">
                      <p className="text-lg">{icon}</p>
                      <p className="text-white font-bold">{value}</p>
                      <p className="text-slate-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Scoreboard */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1">
                    <Trophy size={12} /> {t('end_scoreboard')}
                  </p>
                  <div className="flex flex-col gap-2">
                    {detailModal.recap.scoreboard?.map((player) => (
                      <div
                        key={player.username}
                        className={`flex items-center gap-3 p-3 rounded-2xl ${player.username === username ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-slate-800/30'}`}
                      >
                        <span className="text-base w-7 text-center shrink-0">
                          {player.rank <= 3 ? RANK_EMOJI[player.rank - 1] : `#${player.rank}`}
                        </span>
                        <span className="text-base shrink-0">{player.is_infected ? '🧟' : '🛡️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${player.username === username ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {player.username} {player.username === username && <span className="text-xs text-slate-500">({t('profile_you')})</span>}
                          </p>
                          <div className="flex gap-2 mt-0.5">
                            {player.trades > 0 && <span className="text-xs text-slate-500">🤝 {player.trades}</span>}
                            {player.infections_caused > 0 && <span className="text-xs text-slate-500">☣️ {player.infections_caused}</span>}
                          </div>
                        </div>
                        <p className="text-white font-black text-sm shrink-0">{player.score} <span className="text-slate-600 font-normal text-xs">{t('end_pts')}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Teacher Session Recap Modal ── */}
      {teacherModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,12,18,0.93)', backdropFilter: 'blur(10px)' }}
          onClick={() => setTeacherModal(null)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 glass-panel rounded-t-3xl px-6 py-4 border-b border-slate-700/50 flex items-center justify-between z-10">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-cyan-400" />
                  {MODE_LABELS[teacherModal.session.game_mode] || teacherModal.session.game_mode}
                  {teacherModal.session.note && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-mono">
                      {teacherModal.session.note}
                    </span>
                  )}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {teacherModal.session.num_groups} {teacherModal.session.num_groups === 1 ? t('dash_group').toLowerCase() : `${t('dash_group').toLowerCase()}s`} · {teacherModal.session.total_players} {t('dash_students_label')}
                </p>
              </div>
              <button onClick={() => setTeacherModal(null)} className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {teacherModal.loading ? (
              <div className="flex items-center justify-center py-14 text-slate-500 text-sm animate-pulse">
                {t('auth_please_wait')}
              </div>
            ) : teacherModal.error || teacherModal.groups.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">{t('profile_stats_error')}</div>
            ) : (
              <div className="px-6 py-5 flex flex-col gap-6">
                {teacherModal.groups.map((group) => (
                  <div key={group.group_id} className="flex flex-col gap-4">
                    {teacherModal.groups.length > 1 && (
                      <p className="text-xs uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                        <Users size={11} /> {t('dash_group')} {group.group_number}
                      </p>
                    )}

                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: '👥', label: t('end_players'),        value: group.recap.total_players },
                        { icon: '🛡️', label: t('end_survived'),       value: group.recap.survivors },
                        { icon: '☣️', label: t('end_infection_rate'), value: `${group.recap.infection_rate}%` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="bg-slate-800/40 rounded-xl p-3 text-center">
                          <p className="text-lg">{icon}</p>
                          <p className="text-white font-bold">{value}</p>
                          <p className="text-slate-500 text-xs">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Scoreboard */}
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1">
                        <Trophy size={12} /> {t('end_scoreboard')}
                      </p>
                      <div className="flex flex-col gap-2">
                        {group.recap.scoreboard?.map((player) => (
                          <div
                            key={player.username}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/30"
                          >
                            <span className="text-base w-7 text-center shrink-0">
                              {player.rank <= 3 ? RANK_EMOJI[player.rank - 1] : `#${player.rank}`}
                            </span>
                            <span className="text-base shrink-0">{player.is_infected ? '🧟' : '🛡️'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-slate-200">{player.username}</p>
                              <div className="flex gap-2 mt-0.5">
                                {player.trades > 0 && <span className="text-xs text-slate-500">🤝 {player.trades}</span>}
                                {player.infections_caused > 0 && <span className="text-xs text-slate-500">☣️ {player.infections_caused}</span>}
                                {player.objectives_met > 0 && <span className="text-xs text-slate-500">🎯 {player.objectives_met}/{player.objectives_total}</span>}
                              </div>
                            </div>
                            <p className="text-white font-black text-sm shrink-0">{player.score} <span className="text-slate-600 font-normal text-xs">{t('end_pts')}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {teacherModal.groups.length > 1 && (
                      <div className="border-t border-slate-700/40" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            {t('history_title')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('history_subtitle')}</p>
        </div>
      </div>

      {(hasTeacher || hasStudent) && (
        <div className="flex gap-2 mb-6 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
          {hasStudent && (
            <button
              onClick={() => setTab('student')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'student'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield size={15} /> {t('history_as_student')}
            </button>
          )}
          {hasTeacher && (
            <button
              onClick={() => setTab('teacher')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'teacher'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BookOpen size={15} /> {t('history_as_teacher')}
            </button>
          )}
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-3">
          {recentGames.length === 0 && studentGames.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4">🧟</div>
              <p className="text-slate-400 font-semibold">{t('history_no_games')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('history_join_session')}</p>
              <button onClick={() => navigate('/join')} className="mt-5 btn-primary px-6 py-2.5 text-sm">{t('history_join_game')}</button>
            </div>
          ) : recentGames.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/40">
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#AD9E97' }}>
                  <Trophy size={14} /> {t('history_recent_games')}
                </h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {recentGames.map((game) => {
                  const canView = isWithinOneMonth(game.last_activity);
                  return (
                    <button
                      key={game.group_id}
                      onClick={() => canView && openDetail(game)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${canView ? 'hover:bg-slate-700/20 cursor-pointer' : 'cursor-default opacity-60'}`}
                    >
                      <span className="text-lg shrink-0">
                        {game.rank <= 3 ? RANK_EMOJI[game.rank - 1] : `#${game.rank}`}
                      </span>
                      <span className="text-lg shrink-0">{game.survived ? '🛡️' : '🧟'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm font-semibold truncate">
                          {MODE_LABELS[game.game_mode] || game.game_mode}
                          {game.session_note && (
                            <span className="ml-2 text-xs text-purple-400 font-normal font-mono">{game.session_note}</span>
                          )}
                          <span className="text-slate-600 text-xs ml-2">{game.rounds_played} {t('history_rounds_pl')}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {game.trades > 0 && <span className="text-xs text-slate-500">🤝 {game.trades}</span>}
                          {game.infections_caused > 0 && <span className="text-xs text-slate-500">☣️ {game.infections_caused}</span>}
                          <span className="text-xs text-slate-600">{game.rank}/{game.total_players} {t('end_players')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-black">{game.score}</p>
                        <p className="text-xs text-slate-600">{t('end_pts')}</p>
                      </div>
                      {canView && <span className="text-slate-600 text-xs shrink-0">→</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            studentGames.map((game, i) => {
              const mode = getModeLabel(game.game_mode);
              const survived = game.survived;
              const finished = game.game_state === 'end_game';
              return (
                <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <p className="font-bold text-white">{mode.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {t('history_group')} {game.group_number} · {game.rounds_played > 0 ? `${game.rounds_played} ${game.rounds_played !== 1 ? t('history_rounds_pl') : t('history_rounds')}` : t('history_no_rounds')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {game.role && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          game.role === 'zombie'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}>
                          {game.role === 'zombie' ? `🧟 ${t('game_zombie')}` : `🛡️ ${t('game_survivor')}`}
                        </span>
                      )}
                      {finished && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          survived
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                        }`}>
                          {survived ? `✅ ${t('end_survived')}` : `☣️ ${t('end_infected')}`}
                        </span>
                      )}
                      {!finished && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-400">
                          {getStateLabel(game.game_state)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'teacher' && (
        <div className="space-y-3">
          {teacherGames.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 font-semibold">{t('history_no_sessions')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('history_create_session')}</p>
              <button onClick={() => navigate('/host')} className="mt-5 btn-primary px-6 py-2.5 text-sm">{t('history_host_game')}</button>
            </div>
          ) : (
            teacherGames.map((session, i) => {
              const mode = getModeLabel(session.game_mode);
              const hasGroups = session.groups && session.groups.length > 0;
              const finishedGroups = session.groups?.filter(g => g.game_state === 'end_game') || [];
              const canViewRecap = finishedGroups.length > 0;
              return (
                <button
                  key={i}
                  onClick={() => canViewRecap && openTeacherDetail(session)}
                  className={`w-full glass-panel rounded-2xl p-5 border border-slate-700/50 text-left transition-all ${canViewRecap ? 'hover:bg-slate-700/20 cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          {mode.label}
                          {session.note && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 font-mono">{session.note}</span>
                          )}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {session.num_groups} {session.num_groups === 1 ? t('dash_group').toLowerCase() : `${t('dash_group').toLowerCase()}s`} · {session.total_players} {t('dash_students_label')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        session.status === 'finished'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {session.status === 'finished' ? t('history_finished') : t('history_active')}
                      </span>
                      {canViewRecap && <span className="text-slate-500 text-sm">→</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
