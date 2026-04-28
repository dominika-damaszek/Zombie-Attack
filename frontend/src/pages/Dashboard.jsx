import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Users, Skull, RefreshCw, ChevronRight, X } from 'lucide-react';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';

const MODULE_LABELS = {
  module_1: { label: 'Module 1: Trading',   emoji: '📘', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  module_2: { label: 'Module 2: Zombies',   emoji: '⚠️', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  module_3: { label: 'Module 3: Passwords', emoji: '🔒', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  normal:   { label: 'Game: Normal',        emoji: '🧟', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

const STATE_LABELS = {
  lobby:              { label: 'Lobby',            color: 'text-slate-400',   bg: 'bg-slate-700' },
  role_assignment:    { label: 'Assigning Roles',  color: 'text-yellow-400',  bg: 'bg-yellow-500/20' },
  module_instructions:{ label: 'Instructions',     color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  initial_scan_phase: { label: 'Initial Scan',     color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  round_active:       { label: 'Round Active',     color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  module_between_rounds: { label: 'Scan Phase',    color: 'text-cyan-400',    bg: 'bg-cyan-500/20' },
  end_game:           { label: 'Game Over',        color: 'text-rose-400',    bg: 'bg-rose-500/20' },
};

const Dashboard = ({ setHasSession }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const session = location.state?.session ?? (() => {
    try {
      const raw = localStorage.getItem('session_data');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [liveGroups, setLiveGroups] = useState(session?.groups || []);
  const [groupStats, setGroupStats] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const joinUrlBase = `${window.location.origin}/join/`;
  const modeInfo = MODULE_LABELS[session?.game_mode] || MODULE_LABELS.normal;

  const fetchGroupStats = useCallback(async (groupId) => {
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/state`);
      if (!res.ok) return;
      const data = await res.json();
      setGroupStats(prev => ({ ...prev, [groupId]: data }));
    } catch { }
  }, []);

  const refreshAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    await Promise.all(liveGroups.map(g => fetchGroupStats(g.id)));
    if (!silent) setRefreshing(false);
  }, [liveGroups, fetchGroupStats]);

  useEffect(() => {
    if (!session) return;
    refreshAll(true);
    const interval = setInterval(() => refreshAll(true), 6000);
    return () => clearInterval(interval);
  }, [refreshAll, session]);

  const startMatchmaking = async (groupId) => {
    setActionLoading(groupId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URLS.BASE}/session/${session.id}/start?token=${token}`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const sessionsRes = await fetch(`${API_URLS.BASE}/session/my?token=${token}`);
      const sessions = await sessionsRes.json();
      const updatedSession = sessions.find(s => s.id === session.id);
      if (updatedSession) {
        const newGroups = updatedSession.groups.filter(g => g.group_number !== 0);
        setLiveGroups(newGroups);
        localStorage.setItem('session_data', JSON.stringify(updatedSession));
        await Promise.all(newGroups.map(g => fetchGroupStats(g.id)));
      }
    } catch (e) { alert('Error: ' + e.message); }
    finally { setActionLoading(null); }
  };

  const startGame = async (groupId) => {
    setActionLoading(groupId);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/start`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await fetchGroupStats(groupId);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setActionLoading(null); }
  };

  const endGame = async (groupId) => {
    if (!window.confirm('End this game early?')) return;
    setActionLoading(groupId);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/end`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await fetchGroupStats(groupId);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setActionLoading(null); }
  };

  const endSession = async () => {
    if (!window.confirm('End this session? All students will be disconnected.')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URLS.SESSION}/${session.id}?token=${token}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
    finally {
      localStorage.removeItem('session_id');
      localStorage.removeItem('session_data');
      if (setHasSession) setHasSession(false);
      navigate('/host', { replace: true });
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="glass-panel p-8 text-center max-w-sm rounded-3xl">
          <BackButton to="/host" />
          <p className="text-slate-400 mb-4">No active session found.</p>
          <button onClick={() => navigate('/host')} className="btn-primary px-6 py-3">Create Session</button>
        </div>
      </div>
    );
  }

  const lobbyGroup = liveGroups.find(g => g.group_number === 0);
  const gameGroups = liveGroups.filter(g => g.group_number !== 0);
  const totalPlayers = liveGroups.reduce((acc, g) => {
    const stats = groupStats[g.id];
    return acc + (stats?.players?.length || g.player_count || 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <BackButton to="/host" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Teacher Dashboard
          </h2>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-semibold border ${modeInfo.bg} ${modeInfo.color}`}>
            <span>{modeInfo.emoji}</span>
            <span>{modeInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 px-5 py-3 rounded-2xl border border-slate-700 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Students</p>
            <p className="text-2xl font-black text-white">{totalPlayers}</p>
          </div>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-slate-300 transition-all"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={endSession}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-3 px-4 rounded-2xl transition-all border border-rose-500/20 text-sm"
          >
            <X size={16} />
            End Session
          </button>
        </div>
      </div>

      {lobbyGroup && (
        <div className="glass-panel rounded-3xl border-2 border-dashed border-cyan-500/40 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="bg-white p-2 rounded-2xl shadow-inner">
                <QRCodeSVG value={`${joinUrlBase}${lobbyGroup.join_code}`} size={90} bgColor="#ffffff" fgColor="#0f172a" level="M" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Global Lobby</p>
                <p className="text-3xl font-mono font-black text-cyan-400 tracking-widest">{lobbyGroup.join_code}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-slate-300 font-semibold">
                    {groupStats[lobbyGroup.id]?.players?.length ?? lobbyGroup.player_count ?? 0} students waiting
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1">Minimum 6 students to split groups</p>
              </div>
            </div>
            <button
              onClick={() => startMatchmaking(lobbyGroup.id)}
              disabled={actionLoading === lobbyGroup.id}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {actionLoading === lobbyGroup.id ? <RefreshCw size={20} className="animate-spin" /> : <ChevronRight size={20} />}
              Split Groups
            </button>
          </div>
        </div>
      )}

      {gameGroups.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Users size={18} className="text-emerald-400" />
            {gameGroups.length} {gameGroups.length === 1 ? 'Group' : 'Groups'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {gameGroups.map((group) => {
              const stats = groupStats[group.id];
              const state = stats?.game_state || group.game_state || 'lobby';
              const stateInfo = STATE_LABELS[state] || STATE_LABELS.lobby;
              const isActive = state === 'round_active';
              const canStart = ['lobby', 'role_assignment'].includes(state);
              const playerCount = stats?.players?.length || group.player_count || 0;
              const infected = stats?.players?.filter(p => p.is_infected).length || 0;
              const infectionPct = playerCount > 0 ? Math.round((infected / playerCount) * 100) : 0;

              return (
                <div key={group.id} className={`glass-panel p-5 rounded-3xl border-2 flex flex-col gap-4 transition-all ${isActive ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.08)]' : 'border-slate-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-white">Group {group.group_number}</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${stateInfo.bg} ${stateInfo.color}`}>{stateInfo.label}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-inner flex-shrink-0">
                      <QRCodeSVG value={`${joinUrlBase}${group.join_code}`} size={72} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Join Code</p>
                      <p className="text-2xl font-mono font-black text-emerald-400 tracking-widest">{group.join_code}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-slate-300 text-sm font-semibold">{playerCount} students</span>
                      </div>
                    </div>
                  </div>

                  {stats && playerCount > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400">{playerCount - infected} survivors</span>
                        <span className="text-rose-400">{infected} infected ({infectionPct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700" style={{ width: `${infectionPct}%` }} />
                      </div>
                      {stats.current_round > 0 && <p className="text-xs text-slate-500 text-center mt-1 font-mono">Round {stats.current_round}</p>}
                    </div>
                  )}

                  <button
                    onClick={() => isActive ? endGame(group.id) : startGame(group.id)}
                    disabled={(!canStart && !isActive) || actionLoading === group.id}
                    className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] text-sm ${
                      isActive ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white'
                      : canStart ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {actionLoading === group.id ? <RefreshCw size={14} className="animate-spin" />
                      : isActive ? <><Skull size={14} /> End Game</>
                      : <><Play size={14} fill="currentColor" /> Start Game</>}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {gameGroups.length === 0 && !lobbyGroup && (
        <div className="text-center py-16 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p>No groups found.</p>
          <button onClick={() => navigate('/host')} className="mt-4 text-emerald-400 underline text-sm">Create a new session</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
