import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Users, Skull, Shield, Activity, RefreshCw, Zap } from 'lucide-react';

import { API_URLS } from '../services/api';


const STATE_LABELS = {
  lobby: { label: 'Lobby', color: 'text-slate-400', bg: 'bg-slate-700' },
  role_assignment: { label: 'Assigning Roles', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  round_active: { label: 'Round Active', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  scan_phase: { label: 'Scan Phase', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  round_transition: { label: 'Transitioning', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  end_game: { label: 'Game Over', color: 'text-rose-400', bg: 'bg-rose-500/20' },
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Prefer router state (just navigated here), but fall back to localStorage
  // so the session survives navigation away and back, or a full page refresh.
  const session = location.state?.session ?? (() => {
    try {
      const raw = localStorage.getItem('session_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [liveGroups, setLiveGroups] = useState(session?.groups || []);
  const [groupStats, setGroupStats] = useState({});
  const [startingGroup, setStartingGroup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const joinUrlBase = `${window.location.origin}/join/`;

  const fetchGroupStats = useCallback(async (groupId) => {
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/state`);
      const data = await res.json();
      setGroupStats((prev) => ({ ...prev, [groupId]: data }));
    } catch (e) {
      console.error('Failed to fetch group stats', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(liveGroups.map((g) => fetchGroupStats(g.id)));
    setRefreshing(false);
  }, [liveGroups, fetchGroupStats]);

  useEffect(() => {
    if (!session) return;
    refreshAll();
    const interval = setInterval(refreshAll, 8000);
    return () => clearInterval(interval);
  }, [refreshAll, session]);

  const startGame = async (groupId) => {
    const group = liveGroups.find(g => g.id === groupId);
    setStartingGroup(groupId);
    try {
      if (group && group.group_number === 0) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URLS.BASE}/session/${session.id}/start?token=${token}`, { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        
        // Refetch sessions to get the new groups
        const sessionsRes = await fetch(`${API_URLS.BASE}/session/my?token=${token}`);
        const sessions = await sessionsRes.json();
        const updatedSession = sessions.find(s => s.id === session.id);
        if (updatedSession) {
          const newGroups = updatedSession.groups.filter(g => g.group_number !== 0);
          setLiveGroups(newGroups);
          localStorage.setItem('session_data', JSON.stringify(updatedSession));
          refreshAll();
        }
      } else {
        const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/start`, { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        await fetchGroupStats(groupId);
      }
    } catch (e) {
      alert('Failed to start: ' + e.message);
    } finally {
      setStartingGroup(null);
    }
  };

  const endGame = async (groupId) => {
    if (!window.confirm("Are you sure you want to end this game early?")) return;
    setStartingGroup(groupId);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/end`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await fetchGroupStats(groupId);
    } catch (e) {
      alert('Failed to end game: ' + e.message);
    } finally {
      setStartingGroup(null);
    }
  };

  const getInfectionPct = (stats) => {
    if (!stats?.players?.length) return 0;
    const zombies = stats.players.filter((p) => p.is_infected).length;
    return Math.round((zombies / stats.players.length) * 100);
  };

  if (!session) {
    return (
      <div className="p-8 text-center bg-rose-500/10 text-rose-400 rounded-xl max-w-md mx-auto mt-12">
        <p>No active session found.</p>
        <button onClick={() => navigate('/host')} className="mt-4 underline">
          Go host a game
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Command Center
          </h2>
          <p className="text-slate-400 mt-1 font-medium">
            Monitor and control your Zombieware session.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-5 py-3 rounded-xl border border-slate-700 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Players</p>
            <p className="text-xl font-black text-slate-200">
              {liveGroups.reduce((acc, g) => acc + (g.player_count || 0), 0)}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("End this session entirely? This will disconnect all players.")) return;
              try {
                const token = localStorage.getItem('token');
                const delRes = await fetch(`${API_URLS.SESSION}/${session.id}?token=${token}`, { method: 'DELETE' });
                if (!delRes.ok) throw new Error(await delRes.text());
                localStorage.removeItem('session_id');
                localStorage.removeItem('session_data');
                navigate('/host');
              } catch (e) {
                alert("Failed to end session: " + e.message);
              }
            }}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-3 px-5 rounded-xl transition-all border border-rose-500/20"
          >
            <Skull size={16} />
            End Session
          </button>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-5 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Group Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {liveGroups.map((group) => {
          const stats = groupStats[group.id];
          const state = stats?.game_state || group.game_state || 'lobby';
          const stateInfo = STATE_LABELS[state] || STATE_LABELS.lobby;
          const infectionPct = getInfectionPct(stats);
          const isActive = state === 'round_active' || state === 'scan_phase';
          const canStart = state === 'lobby' || state === 'role_assignment';
          const survivors = stats?.players?.filter((p) => !p.is_infected).length ?? 0;
          const zombies = stats?.players?.filter((p) => p.is_infected).length ?? 0;

          return (
            <div
              key={group.id}
              className={`glass-panel p-6 flex flex-col rounded-2xl transition-all border-2 ${
                isActive ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.1)]' : 'border-slate-700/50'
              }`}
            >
              {group.group_number === 0 ? (
                // Special Matchmaker Card styling
                <div className="bg-slate-900/60 p-4 rounded-xl border border-dashed border-cyan-500/50 mb-5 pb-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-black text-cyan-400">
                      Global Lobby (Matchmaker)
                    </h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">
                    Students gather here initially. When everyone is ready, press Start Matchmaking to divide them into squads.
                  </p>
                  <p className="text-rose-400 text-xs font-bold bg-rose-500/10 inline-block px-2 py-1 rounded">
                    Requirement: Minimum 6 Players
                  </p>
                </div>
              ) : (
                // Standard Group Header
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-slate-100">
                    Group {group.group_number}
                  </h3>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${stateInfo.bg} ${stateInfo.color}`}
                  >
                    {stateInfo.label}
                  </span>
                </div>
              )}

              {/* QR Code */}
              <div className="flex justify-center mb-5">
                <div className="bg-white p-3 rounded-xl shadow-inner">
                  <QRCodeSVG
                    value={`${joinUrlBase}${group.join_code}`}
                    size={140}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                  />
                </div>
              </div>

              {/* Join Code */}
              <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/50 mb-4">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">
                  Join Code
                </span>
                <span className="text-2xl font-mono font-bold tracking-widest text-emerald-400">
                  {group.join_code}
                </span>
              </div>

              {/* Live Stats */}
              {stats ? (
                <>
                  {/* Infection Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Shield size={10} /> {survivors} Survivors
                      </span>
                      <span className="text-rose-400 flex items-center gap-1">
                        {zombies} Zombies <img src="/zombie-logo.svg" alt="Zombie" className="w-3 h-3 contrast-125" />
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
                        style={{ width: `${infectionPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-500 font-mono">
                        <Activity size={10} className="inline mr-1" />
                        {stats.players?.length || 0} players
                      </span>
                      <span
                        className={`font-bold ${
                          infectionPct > 50 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {infectionPct}% infected
                      </span>
                    </div>
                  </div>

                  {/* Round info */}
                  {stats.current_round > 0 && (
                    <div className="text-xs text-slate-500 text-center mb-4 font-mono">
                      Round {stats.current_round}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center px-1 mb-4">
                  <span className="text-slate-400 text-sm">{group.group_number === 0 ? "Total Enlisted" : "Players Waiting"}</span>
                  <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
                    {group.player_count} waiting
                  </span>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={() => isActive ? endGame(group.id) : startGame(group.id)}
                disabled={(!canStart && !isActive) || startingGroup === group.id}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                  isActive 
                    ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-lg hover:shadow-rose-500/30'
                    : canStart
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg hover:shadow-emerald-500/30'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {startingGroup === group.id ? (
                  <><RefreshCw size={16} className="animate-spin" /> Processing...</>
                ) : isActive ? (
                  <><Skull size={16} /> Force End Game</>
                ) : (
                  <><Play size={16} /> {group.group_number === 0 ? "Start Matchmaking" : "Start Game"}</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
