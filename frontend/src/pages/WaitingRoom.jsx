import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  Users,
  Wifi,
  WifiOff,
  Copy,
  Check,
  LogOut,
} from "lucide-react";
import { useGameWebSocket } from "../hooks/useGameWebSocket";
import { API_URLS } from "../services/api";
import BackButton from "../components/BackButton";
import { useLanguage } from "../contexts/LanguageContext";

const WaitingRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { groupData, playerData } =
    location.state ||
    (() => {
      try {
        const raw = localStorage.getItem("player_session");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();

  const [currentGroupData, setCurrentGroupData] = useState(groupData);
  const [players, setPlayers] = useState([]);
  const [savingReady, setSavingReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { lastMessage, connected } = useGameWebSocket(
    currentGroupData?.group_id,
    playerData?.id,
  );

  // Fix stale group in localStorage / navigation state (e.g. after split or refresh).
  useEffect(() => {
    if (!playerData?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URLS.BASE}/player/${playerData.id}/group`,
        );
        if (!res.ok || cancelled) return;
        const g = await res.json();
        if (cancelled) return;
        setCurrentGroupData((prev) => {
          if (prev?.group_id === g.group_id && prev?.join_code === g.join_code)
            return prev;
          localStorage.setItem(
            "player_session",
            JSON.stringify({ groupData: g, playerData }),
          );
          return g;
        });
      } catch (e) {
        if (!cancelled) console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerData?.id]);

  const fetchGameState = async (groupId, gData, pData) => {
    const usedGroupData = gData ?? currentGroupData;
    const usedPlayerData = pData ?? playerData;
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/state`);
      const data = await res.json();
      setPlayers(data.players || []);
      if (usedGroupData?.group_number !== 0 && data.game_state !== "lobby") {
        navigate("/game", {
          state: { groupData: usedGroupData, playerData: usedPlayerData },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentGroupData?.group_id) {
      fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
    }
  }, [currentGroupData?.group_id]);

  useEffect(() => {
    if (lastMessage?.type === "MATCHMAKING_COMPLETE") {
      (async () => {
        try {
          const res = await fetch(
            `${API_URLS.BASE}/player/${playerData.id}/group`,
          );
          if (!res.ok) return;
          const newGroupData = await res.json();
          setCurrentGroupData(newGroupData);
          localStorage.setItem(
            "player_session",
            JSON.stringify({ groupData: newGroupData, playerData }),
          );
          await fetchGameState(newGroupData.group_id, newGroupData, playerData);
        } catch (e) {
          console.error(e);
        }
      })();
    } else if (
      lastMessage?.type === "PLAYER_JOINED" ||
      lastMessage?.type === "PLAYER_READY" ||
      lastMessage?.type === "PLAYER_LEFT"
    ) {
      (async () => {
        try {
          if (!playerData?.id) return;
          const res = await fetch(
            `${API_URLS.BASE}/player/${playerData.id}/group`,
          );
          if (!res.ok) return;
          const g = await res.json();
          setCurrentGroupData(g);
          localStorage.setItem(
            "player_session",
            JSON.stringify({ groupData: g, playerData }),
          );
          await fetchGameState(g.group_id, g, playerData);
        } catch (e) {
          console.error(e);
        }
      })();
    } else if (lastMessage?.type === "GAME_STARTED") {
      (async () => {
        try {
          const res = await fetch(
            `${API_URLS.BASE}/player/${playerData.id}/group`,
          );
          const g = res.ok ? await res.json() : currentGroupData;
          navigate("/game", {
            state: { groupData: g || currentGroupData, playerData },
          });
        } catch (e) {
          navigate("/game", {
            state: { groupData: currentGroupData, playerData },
          });
        }
      })();
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!currentGroupData?.group_id) return;
    const id = setInterval(
      async () => {
        if (currentGroupData.group_number === 0) {
          try {
            const pRes = await fetch(
              `${API_URLS.BASE}/player/${playerData.id}/group`,
            );
            const latestGroup = await pRes.json();
            if (latestGroup.group_id !== currentGroupData.group_id) {
              localStorage.setItem(
                "player_session",
                JSON.stringify({ groupData: latestGroup, playerData }),
              );
              setCurrentGroupData(latestGroup);
              return;
            }
          } catch (e) {
            console.error(e);
          }
        }
        fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
      },
      currentGroupData.group_number === 0 ? 5000 : 5000,
    );
    return () => clearInterval(id);
  }, [currentGroupData?.group_id]);

  const markReady = async () => {
    if (savingReady || !playerData?.id) return;
    setSavingReady(true);
    try {
      const gRes = await fetch(
        `${API_URLS.BASE}/player/${playerData.id}/group`,
      );
      if (!gRes.ok) return;
      const latest = await gRes.json();
      setCurrentGroupData(latest);
      localStorage.setItem(
        "player_session",
        JSON.stringify({ groupData: latest, playerData }),
      );

      const res = await fetch(
        `${API_URLS.BASE}/api/game/${latest.group_id}/ready`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerData.id }),
        },
      );
      if (!res.ok) {
        console.error("ready failed", await res.text());
        return;
      }
      const data = await res.json();
      if (data.game_started) {
        const g2Res = await fetch(
          `${API_URLS.BASE}/player/${playerData.id}/group`,
        );
        const g2 = g2Res.ok ? await g2Res.json() : latest;
        localStorage.setItem(
          "player_session",
          JSON.stringify({ groupData: g2, playerData }),
        );
        navigate("/game", { state: { groupData: g2, playerData } });
        return;
      }
      await fetchGameState(latest.group_id, latest, playerData);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingReady(false);
    }
  };

  const handleLeave = async () => {
    if (!playerData?.id || leaving) return;
    setLeaving(true);
    try {
      await fetch(`${API_URLS.BASE}/player/${playerData.id}/leave`, {
        method: "DELETE",
      });
      localStorage.removeItem("player_session");
      navigate("/join");
    } catch (e) {
      console.error(e);
      setLeaving(false);
    }
  };

  if (!currentGroupData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
        <BackButton to="/join" />

        <div className="glass-panel p-8 text-center max-w-sm rounded-3xl">
          <p className="text-slate-400 mb-4">{t("wait_no_group")}</p>
          <button
            onClick={() => navigate("/join")}
            className="btn-primary px-6 py-3"
          >
            {t("wait_go_back")}
          </button>
        </div>
      </div>
    );
  }

  const isLobby = currentGroupData.group_number === 0;
  const me = players.find((p) => p.id === playerData?.id);
  const myReadyState = me?.is_ready;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-10">
      <div className="w-full max-w-md">
        <BackButton to="/join" />

        <div
          className={`flex items-center justify-between px-4 py-2 rounded-2xl mb-5 text-sm font-semibold ${
            isLobby
              ? "bg-[var(--neon-cyan-glow)]/10 border border-[var(--neon-cyan-glow)]/20 text-[var(--neon-cyan)]/90"
              : "bg-[var(--neon-cyan-glow)]n/10 border border-[var(--neon-green-glow)]/20 text-[var(--neon-green-glow)]"
          }`}
        >
          <span>
            {isLobby
              ? t("wait_global_lobby")
              : `${t("wait_group")} ${currentGroupData.group_number}`}
          </span>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <Wifi size={14} /> {t("wait_live")}
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-slate-500" />{" "}
                <span className="text-slate-500">{t("wait_reconnecting")}</span>
              </>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl mb-1">
              {isLobby
                ? t("wait_waiting_teacher")
                : `${t("wait_in_group")} ${currentGroupData.group_number}`}
            </h2>
            <p className="text-slate-400 text-sm">
              {isLobby ? t("wait_teacher_splitting") : t("wait_gather_group")}
            </p>
          </div>

          {currentGroupData?.join_code && (
            <div
              className="mb-5 rounded-2xl p-4"
              style={{
                background: "rgba(180,90,150,0.2)",
                border: "1px solid rgba(180,90,150,0.6)",
              }}
            >
              <p
                className="text-xs uppercase tracking-widest font-mono text-center mb-2"
                style={{ color: "#6D7162" }}
              >
                {t("wait_room_code")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                <span
                  className="text-4xl font-black font-mono tracking-[0.3em] break-all sm:break-normal"
                  style={{ color: "#a8c4a0" }}
                >
                  {currentGroupData.join_code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard
                      .writeText(currentGroupData.join_code)
                      .catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={
                    copied
                      ? {
                          background: "rgba(168,196,160,0.2)",
                          color: "rgba(180,230,180,0.8)",
                          border: "1px solid rgba(168,196,160,0.4)",
                        }
                      : {
                          background: "rgba(180,90,150,0.4)",
                          color: "rgba(220,150,190,1)",
                          border: "1px solid rgba(220,150,190,1)",
                        }
                  }
                >
                  {copied ? (
                    <>
                      <Check size={13} /> {t("wait_copied")}
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> {t("wait_copy")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <Users size={16} className="text-[var(--neon-green-glow)]" />
                {isLobby ? t("wait_students_in_room") : t("wait_group_members")}
              </div>
              <span className="bg-[var(--neon-green-glow)]/10 text-[var(--neon-green-glow)] font-black px-3 py-0.5 rounded-full text-xs">
                {players.length}
              </span>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    p.id === playerData?.id
                      ? "bg-emerald-500/15 border border-emerald-500/30"
                      : "bg-slate-800/60"
                  }`}
                >
                  <span
                    className={`font-semibold text-sm ${p.id === playerData?.id ? "text-[var(--neon-green-glow)]/80" : "text-slate-300"}`}
                  >
                    {p.username}
                    {p.id === playerData?.id && (
                      <span className="ml-2 text-xs text-[var(--neon-cyan-glow)]/80 font-normal">
                        {t("wait_you")}
                      </span>
                    )}
                  </span>
                  {!isLobby &&
                    (p.is_ready ? (
                      <CheckCircle2
                        size={16}
                        className="text-[var(--neon-cyan-glow)]"
                      />
                    ) : (
                      <Loader2
                        size={16}
                        className="text-amber-400 animate-spin"
                      />
                    ))}
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-4">
                  {t("wait_no_players")}
                </p>
              )}
            </div>
          </div>

          {!isLobby && (
            <button
              onClick={markReady}
              disabled={myReadyState || savingReady}
              className={`w-full py-4 mb-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all ${
                myReadyState
                  ? "bg-[var(--neon-green-glow)]/15 border border-[var(--neon-cyan-glow)]/30 cursor-default neon-btn"
                  : "bg-[var(--neon-cyan-glow)] hover:bg-[var(--neon-cyan-glow)]/50 hover:scale-[1.01] active:scale-[0.99] neon-btn"
              }`}
            >
              {savingReady ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {myReadyState ? t("wait_ready_waiting") : t("wait_ready")}
            </button>
          )}

          {isLobby && (
            <div className="flex justify-center gap-2 mb-6 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleLeave}
            disabled={leaving}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-[0.99]"
          >
            {leaving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LogOut size={18} />
            )}
            {t("leave_game") || "Leave Game"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
