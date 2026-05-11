import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Users,
  Skull,
  RefreshCw,
  ChevronRight,
  X,
  Maximize2,
  BarChart2,
  Trophy,
  Shield,
  Zap,
  ArrowRightLeft,
  NotebookPen,
  Check,
} from "lucide-react";
import { API_URLS } from "../services/api";
import BackButton from "../components/BackButton";
import { useLanguage } from "../contexts/LanguageContext";

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

const Dashboard = ({ setHasSession }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const session =
    location.state?.session ??
    (() => {
      try {
        const raw = localStorage.getItem("session_data");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  const [liveGroups, setLiveGroups] = useState(session?.groups || []);
  const [groupStats, setGroupStats] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(null);
  const [statsModal, setStatsModal] = useState(null); // { groupId, data } | null
  const [statsLoading, setStatsLoading] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);

  const joinUrlBase = `${window.location.origin}/join/`;
  const token = localStorage.getItem("token");

  const MODULE_LABELS = {
    module_1: {
      label: `${t("mod1_label")}: ${t("mod1_sublabel")}`,
      emoji: "📘",
      color: "text-[var(--neon-green-glow)]",
      bg: "bg-[var(--neon-green-glow)]/10 border-[var(--neon-green-glow)]/30",
    },
    module_2: {
      label: `${t("mod2_label")}: ${t("mod2_sublabel")}`,
      emoji: "⚠️",
      color: "text-[var(--neon-cyan)]",
      bg: "bg-[var(--neon-cyan-glow)]/20 border-[var(--neon-cyan-glow)]",
    },
    module_3: {
      label: `${t("mod3_label")}: ${t("mod3_sublabel")}`,
      emoji: "🔒",
      color: "text-[var(--neon-pink)]",
      bg: "bg-[var(--neon-pink-glow)]/20 border-[var(--neon-pink-glow)]/70",
    },
    normal: {
      label: `${t("host_game")}: ${t("host_normal_mode")}`,
      emoji: "🧟",
      color: "text-[#e97f7fff]",
      bg: "bg-[#d95959]/10 border-[#d95959]/60",
    },
  };

  const STATE_LABELS = {
    lobby: {
      label: t("dash_state_lobby"),
      color: "text-slate-400",
      bg: "bg-slate-700",
    },
    role_assignment: {
      label: t("dash_state_assigning"),
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
    },
    module_instructions: {
      label: t("dash_state_instructions"),
      color: "text-cyan-400",
      bg: "bg-cyan-500/20",
    },
    initial_scan_phase: {
      label: t("dash_state_initial_scan"),
      color: "text-blue-400",
      bg: "bg-blue-500/20",
    },
    round_active: {
      label: t("dash_state_round_active"),
      color: "text-[var(--neon-cyan-glow)]",
      bg: "bg-[var(--neon-cyan-glow)]/15",
    },
    module_between_rounds: {
      label: t("dash_state_scan_phase"),
      color: "text-cyan-400",
      bg: "bg-cyan-500/20",
    },
    end_game: {
      label: t("dash_state_game_over"),
      color: "text-[var(--neon-pink)]/80",
      bg: "bg-[var(--neon-pink-glow)]/20",
    },
  };

  const modeInfo = MODULE_LABELS[session?.game_mode] || MODULE_LABELS.normal;

  const fetchGroupStats = useCallback(async (groupId) => {
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/state`);
      if (!res.ok) return;
      const data = await res.json();
      setGroupStats((prev) => ({ ...prev, [groupId]: data }));
    } catch {}
  }, []);

  const refreshAll = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      await Promise.all(liveGroups.map((g) => fetchGroupStats(g.id)));
      if (!silent) setRefreshing(false);
    },
    [liveGroups, fetchGroupStats],
  );

  useEffect(() => {
    if (!session) return;
    refreshAll(true);
    const interval = setInterval(() => refreshAll(true), 6000);
    return () => clearInterval(interval);
  }, [refreshAll, session]);

  const startMatchmaking = async (groupId) => {
    setActionLoading(groupId);
    try {
      const res = await fetch(
        `${API_URLS.BASE}/session/${session.id}/start?token=${token}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(await res.text());
      const sessionsRes = await fetch(
        `${API_URLS.BASE}/session/my?token=${token}`,
      );
      const sessions = await sessionsRes.json();
      const updatedSession = sessions.find((s) => s.id === session.id);
      if (updatedSession) {
        setLiveGroups(updatedSession.groups);
        localStorage.setItem("session_data", JSON.stringify(updatedSession));
        const gameOnly = updatedSession.groups.filter(
          (g) => g.group_number !== 0,
        );
        await Promise.all(gameOnly.map((g) => fetchGroupStats(g.id)));
        const lobby = updatedSession.groups.find((g) => g.group_number === 0);
        if (lobby) await fetchGroupStats(lobby.id);
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const endGame = async (groupId) => {
    if (!window.confirm(t("dash_end_game_confirm"))) return;
    setActionLoading(groupId);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/end`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchGroupStats(groupId);
      navigate("/endgame", { state: { groupId } });
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const endSession = async () => {
    if (!window.confirm(t("dash_end_session_confirm"))) return;
    try {
      await fetch(`${API_URLS.SESSION}/${session.id}?token=${token}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("session_id");
      localStorage.removeItem("session_data");
      if (setHasSession) setHasSession(false);
      navigate("/host", { replace: true });
    }
  };

  const openStats = async (groupId) => {
    setStatsModal({ groupId, data: null });
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/recap`);
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStatsModal({ groupId, data });
    } catch (e) {
      setStatsModal(null);
      alert("Could not load stats: " + e.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const saveNote = async () => {
    if (!session?.id) return;
    setNoteLoading(true);
    try {
      await fetch(
        `${API_URLS.BASE}/session/${session.id}/note?token=${token}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        },
      );
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setNoteLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)]">
        <BackButton to="/host" />
        <div className="glass-panel p-8 text-center max-w-sm rounded-3xl">
          <p className="text-slate-400 mb-4">{t("dash_no_session")}</p>
          <button
            onClick={() => navigate("/host")}
            className="neon-btn-alt px-5 py-3"
          >
            {t("dash_create_session")}
          </button>
        </div>
      </div>
    );
  }

  const lobbyGroup = liveGroups.find((g) => g.group_number === 0);
  const gameGroups = liveGroups.filter((g) => g.group_number !== 0);
  const totalPlayers = liveGroups.reduce((acc, g) => {
    const stats = groupStats[g.id];
    return acc + (stats?.players?.length || g.player_count || 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── QR fullscreen overlay ── */}
      {qrFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-y-auto"
          style={{
            background: "rgba(10,12,18,0.96)",
            backdropFilter: "blur(12px)",
          }}
          onClick={() => setQrFullscreen(null)}
        >
          <div
            className="flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <QRCodeSVG
                value={qrFullscreen.url}
                size={280}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
                {t("dash_join_code")}
              </p>
              <p className="text-5xl font-mono font-black text-cyan-400 tracking-widest">
                {qrFullscreen.code}
              </p>
              <p className="text-slate-500 text-sm mt-3">{qrFullscreen.url}</p>
            </div>
            <button
              onClick={() => setQrFullscreen(null)}
              className="px-8 py-3 rounded-2xl font-bold text-slate-300 transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(109,113,98,0.2)",
                border: "1px solid rgba(109,113,98,0.3)",
              }}
            >
              {t("dash_close")}
            </button>
          </div>
        </div>
      )}

      {/* ── Stats modal ── */}
      {statsModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 overflow-y-auto"
          style={{
            background: "rgba(10,12,18,0.93)",
            backdropFilter: "blur(10px)",
          }}
          onClick={() => setStatsModal(null)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 glass-panel rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-slate-700/50 z-10">
              <div className="flex items-center gap-2">
                <BarChart2
                  size={18}
                  className="text-[var(--neon-green-glow)]/80"
                />
                <span className="font-bold text-white">
                  {t("dash_stats_title")}
                </span>
                {statsModal.data?.session_note && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--neon-pink-glow)]/15 text-[var(--neon-pink-glow)] border border-[var(--neon-pink-glow)] font-mono truncate max-w-[160px]">
                    {statsModal.data.session_note}
                  </span>
                )}
              </div>
              <button
                onClick={() => setStatsModal(null)}
                className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {statsLoading || !statsModal.data ? (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm animate-pulse">
                Loading stats…
              </div>
            ) : (
              <div className="px-6 py-5 flex flex-col gap-5">
                {/* Summary pills */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      icon: "👥",
                      label: t("end_players"),
                      value: statsModal.data.total_players,
                    },
                    {
                      icon: "🛡️",
                      label: t("end_survived"),
                      value: statsModal.data.survivors,
                    },
                    {
                      icon: "🧟",
                      label: t("end_infected"),
                      value: statsModal.data.zombies,
                    },
                  ].map(({ icon, label, value }) => (
                    <div
                      key={label}
                      className="bg-slate-800/60 rounded-2xl p-3 text-center"
                    >
                      <p className="text-xl">{icon}</p>
                      <p className="text-white font-black text-lg">{value}</p>
                      <p className="text-slate-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Infection bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text--[var(--neon-green)]/80">
                      {statsModal.data.survivors} {t("end_survived_label")}
                    </span>
                    <span className="text-[var(--neon-pink-glow)]/80">
                      {statsModal.data.infection_rate}%{" "}
                      {t("dash_infection_rate")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--neon-pink-glow)]/80 transition-all"
                      style={{ width: `${statsModal.data.infection_rate}%` }}
                    />
                  </div>
                  <p className="text-slate-600 text-xs mt-1 text-right font-mono">
                    {statsModal.data.rounds_played} {t("dash_rounds_played")} ·{" "}
                    {(statsModal.data.game_mode || "normal").replace("_", " ")}
                  </p>
                </div>

                {/* Scoreboard */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1">
                    <Trophy size={12} /> {t("dash_scoreboard")}
                  </p>
                  <div className="flex flex-col gap-2">
                    {statsModal.data.scoreboard?.map((player, idx) => (
                      <div
                        key={player.username}
                        className={`flex items-center gap-3 p-3 rounded-2xl ${idx < 3 ? "bg-slate-800/80" : "bg-slate-800/30"}`}
                      >
                        <span className="text-lg w-7 text-center shrink-0">
                          {player.rank <= 3
                            ? RANK_EMOJI[player.rank - 1]
                            : `#${player.rank}`}
                        </span>
                        <span className="text-lg shrink-0">
                          {player.is_infected ? "🧟" : "🛡️"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 font-semibold text-sm truncate">
                            {player.username}
                          </p>
                          <div className="flex gap-2 mt-0.5">
                            {player.trades > 0 && (
                              <span className="text-xs text-slate-500">
                                🤝 {player.trades}
                              </span>
                            )}
                            {player.infections_caused > 0 && (
                              <span className="text-xs text-slate-500">
                                ☣️ {player.infections_caused}
                              </span>
                            )}
                            {player.objectives_met > 0 && (
                              <span className="text-xs text-slate-500">
                                🎯 {player.objectives_met}/
                                {player.objectives_total}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-black">
                            {player.score}
                          </p>
                          <p className="text-xs text-slate-600">
                            {t("end_pts")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BackButton to="/host" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-20 mb-7">
        <div>
          <h1 className="flex justify-center items-center gap-2 text-4xl font-black bg-clip-text mb-2">
            {t("dash_title")}
          </h1>
          <div
            className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-sm font-semibold border ${modeInfo.bg} ${modeInfo.color}`}
          >
            <span>{modeInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[var(--neon-green-glow)]/15 px-5 py-3 rounded-2xl border border-[var(--neon-green-glow)]/40 text-center">
            <p className="text-xs text-[var(--neon-green)]/60 uppercase tracking-widest mb-0.5">
              {t("dash_students")}
            </p>
            <p className="text-2xl font-black text-white">{totalPlayers}</p>
          </div>

          <button
            onClick={endSession}
            className="flex items-center gap-2 bg-[var(--neon-pink-glow)]/40 hover:bg-[var(--neon-pink-glow)]/20 text-[var(--neon-pink)]/80 font-semibold py-3 px-4 rounded-2xl transition-all border border-[var(--neon-pink)]/70 text-sm"
          >
            <X size={16} className="text-white" />
            {t("dash_end_session")}
          </button>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="p-3 bg-[var(--neon-cyan-glow)]/40 hover:bg-[var(--neon-cyan-glow)]/20 border border-[var(--neon-cyan)]/80 rounded-2xl text-[var(--neon-cyan)]/100 transition-all"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Session note ── */}
      <div className="glass-panel rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
        <NotebookPen
          size={16}
          className="text-[var(--neon-pink-glow)] shrink-0"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteSaved(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && saveNote()}
          placeholder={t("dash_note_placeholder")}
          className="flex-1 bg-transparent text-slate-300 placeholder-slate-600 text-sm outline-none"
          maxLength={120}
        />
        <button
          onClick={saveNote}
          disabled={noteLoading || !note.trim()}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            noteSaved
              ? "bg-[var(--neon-green-glow)]/20 text-[var(--neon-green-glow)]/80 border border-[var(--neon-green-glow)]/30"
              : "bg-[var(--neon-pink-glow)]/55 text-[var(--neon-pink)] hover:bg-[var(--neon-pink-glow)]/25 disabled:opacity-40"
          }`}
        >
          {noteSaved ? (
            <>
              <Check size={12} /> {t("dash_saved")}
            </>
          ) : (
            t("dash_save")
          )}
        </button>
      </div>

      {lobbyGroup && (
        <div className="glass-panel rounded-3xl border-2 border-dashed border-cyan-500/40 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="relative group/qr">
                <div className="bg-white p-2 rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={`${joinUrlBase}${lobbyGroup.join_code}`}
                    size={90}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                  />
                </div>
                <button
                  onClick={() =>
                    setQrFullscreen({
                      url: `${joinUrlBase}${lobbyGroup.join_code}`,
                      code: lobbyGroup.join_code,
                    })
                  }
                  className="absolute -top-2 -right-2 p-1.5 rounded-lg bg-[var(--neon-cyan-glow)] text-white opacity-0 group-hover/qr:opacity-100 transition-opacity shadow-lg"
                  title="Expand QR"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                  {t("dash_global_lobby")}
                </p>
                <p className="text-3xl font-mono font-black text-[var(--neon-cyan)]/90 tracking-widest">
                  {lobbyGroup.join_code}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-slate-300 font-semibold">
                    {groupStats[lobbyGroup.id]?.players?.length ??
                      lobbyGroup.player_count ??
                      0}{" "}
                    {t("dash_students_waiting")}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {t("dash_min_students")}
                </p>
              </div>
            </div>
            <button
              onClick={() => startMatchmaking(lobbyGroup.id)}
              disabled={actionLoading === lobbyGroup.id}
              className="flex items-center gap-2 bg-[var(--neon-cyan-glow)] hover:bg-[var(--neon-cyan-glow)]/60 text-white font-black py-4 px-8 rounded-2xl text-lg transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {actionLoading === lobbyGroup.id ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <ChevronRight size={20} />
              )}
              {t("dash_split_groups")}
            </button>
          </div>
        </div>
      )}

      {gameGroups.length > 0 && (
        <>
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <Users
              size={18}
              className="text-[var(--neon-light-green)] bg-[var(--neon-green-glow)]/10"
            />
            {gameGroups.length}{" "}
            {gameGroups.length === 1 ? t("dash_group") : `${t("dash_group")}s`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {gameGroups.map((group) => {
              const stats = groupStats[group.id];
              const state = stats?.game_state || group.game_state || "lobby";
              const stateInfo = STATE_LABELS[state] || STATE_LABELS.lobby;
              const isActive = state === "round_active";
              const playerCount =
                stats?.players?.length || group.player_count || 0;
              const infected =
                stats?.players?.filter((p) => p.is_infected).length || 0;
              const infectionPct =
                playerCount > 0
                  ? Math.round((infected / playerCount) * 100)
                  : 0;

              return (
                <div
                  key={group.id}
                  className={`glass-panel p-5 rounded-3xl border-2 flex flex-col gap-4 transition-all ${isActive ? "border-[var(--neon-green-glow)]/40 shadow-[0_0_20px_rgba(52,211,153,0.08)]" : "border-slate-700/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl">
                      {t("dash_group")} {group.group_number}
                    </h3>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${stateInfo.bg} ${stateInfo.color}`}
                    >
                      {stateInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative group/qr flex-shrink-0">
                      <div className="bg-white p-2 rounded-xl shadow-inner">
                        <QRCodeSVG
                          value={`${joinUrlBase}${group.join_code}`}
                          size={72}
                          bgColor="#ffffff"
                          fgColor="#0f172a"
                          level="M"
                        />
                      </div>
                      <button
                        onClick={() =>
                          setQrFullscreen({
                            url: `${joinUrlBase}${group.join_code}`,
                            code: group.join_code,
                          })
                        }
                        className="absolute -top-2 -right-2 p-1.5 rounded-lg bg-[var(--neon-cyan-glow)]/80 text-white opacity-0 group-hover/qr:opacity-100 transition-opacity shadow-lg"
                        title="Expand QR"
                      >
                        <Maximize2 size={11} />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        {t("dash_join_code")}
                      </p>
                      <p className="text-2xl font-mono font-black text-[var(--neon-green-glow)]/80 tracking-widest">
                        {group.join_code}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-slate-300 text-sm font-semibold">
                          {playerCount} {t("dash_students_label")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {stats && playerCount > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--neon-green-glow)]/75">
                          {playerCount - infected} {t("dash_survivors")}
                        </span>
                        <span className="text-[var(--neon-pink-glow)]/90">
                          {infected} {t("dash_infected")} ({infectionPct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--neon-pink-glow)]/15 transition-all duration-700"
                          style={{ width: `${infectionPct}%` }}
                        />
                      </div>
                      {stats.current_round > 0 && (
                        <p className="text-xs text-slate-500 text-center mt-1 font-mono">
                          {t("dash_round")} {stats.current_round}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openStats(group.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-semibold ${isActive ? "" : "flex-1"}`}
                    >
                      <BarChart2 size={14} /> {t("dash_stats_btn")}
                    </button>
                    {isActive && (
                      <button
                        onClick={() => endGame(group.id)}
                        disabled={actionLoading === group.id}
                        className="flex-1 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] text-sm bg-[var(--neon-pink-glow)]/30 text-white disabled:opacity-60"
                      >
                        {actionLoading === group.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <>
                            <Skull size={14} /> {t("dash_end_game")}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {gameGroups.length === 0 && !lobbyGroup && (
        <div className="text-center py-16 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-40" />
          <p>{t("dash_no_groups")}</p>
          <button
            onClick={() => navigate("/host")}
            className="mt-4 text-d[var(--neon-green-glow)]/90 underline text-sm"
          >
            {t("dash_new_session")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
