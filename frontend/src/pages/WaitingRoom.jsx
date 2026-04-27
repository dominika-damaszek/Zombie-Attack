import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Users, CheckCircle2, Loader2, Target } from 'lucide-react';
import { useGameWebSocket } from '../hooks/useGameWebSocket';

import { API_URLS } from '../services/api';

const WaitingRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { groupData, playerData } = location.state || (() => {
    try {
      const raw = localStorage.getItem('player_session');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();
  const pollingRef = useRef(null);

  const [currentGroupData, setCurrentGroupData] = useState(groupData);
  const [players, setPlayers] = useState([]);
  const [savingReady, setSavingReady] = useState(false);

  const { lastMessage } = useGameWebSocket(currentGroupData?.group_id, playerData?.id);

  // Function to fetch the game state and grab players
  // Accepts explicit args so it's never stale inside closures
  const fetchGameState = async (groupId, gData, pData) => {
    const usedGroupData = gData ?? currentGroupData;
    const usedPlayerData = pData ?? playerData;
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupId}/state`);
      const data = await res.json();
      setPlayers(data.players || []);
      
      // If we are in a real team (not lobby) and game has left 'lobby' state → Launch!
      if (usedGroupData?.group_number !== 0 && data.game_state !== 'lobby') {
         navigate('/game', { state: { groupData: usedGroupData, playerData: usedPlayerData } });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Initial fetch and on Group ID change
  useEffect(() => {
    if (currentGroupData?.group_id) {
       fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupData?.group_id]);

  // Handle Websocket Real-time Events
  useEffect(() => {
    if (lastMessage?.type === 'MATCHMAKING_COMPLETE') {
      const handleMatchmaking = async () => {
        try {
          const res = await fetch(`${API_URLS.BASE}/player/${playerData.id}/group`);
          const newGroupData = await res.json();
          setCurrentGroupData(newGroupData); // Switches WS instantly
          
          // Save the NEW group to local storage so a refresh doesn't drop them back into the empty main lobby!
          localStorage.setItem('player_session', JSON.stringify({
             groupData: newGroupData,
             playerData: playerData
          }));

          // Immediately check new group state — game may already be started
          await fetchGameState(newGroupData.group_id, newGroupData, playerData);
        } catch (e) {
          console.error(e);
        }
      };
      // Short delay to ensure backend has fully committed
      setTimeout(handleMatchmaking, 500);
    } else if (lastMessage?.type === 'PLAYER_JOINED' || lastMessage?.type === 'PLAYER_READY') {
       fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
    } else if (lastMessage?.type === 'GAME_STARTED') {
      // currentGroupData is the real group by now (WS reconnected after MATCHMAKING_COMPLETE)
      navigate('/game', { state: { groupData: currentGroupData, playerData } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  // Polling fallback — always uses latest currentGroupData via closure on the effect dependency
  useEffect(() => {
    if (!currentGroupData?.group_id) return;
    const id = setInterval(async () => {
      // If we are in the lobby, we should proactively check if we were assigned a new group but missed the WS event
      if (currentGroupData.group_number === 0) {
        try {
          const pRes = await fetch(`${API_URLS.BASE}/player/${playerData.id}/group`);
          const latestGroup = await pRes.json();
          if (latestGroup.group_id !== currentGroupData.group_id) {
             localStorage.setItem('player_session', JSON.stringify({
                groupData: latestGroup,
                playerData: playerData
             }));
             setCurrentGroupData(latestGroup);
             // Return early; the effect will re-run with the new currentGroupData
             return;
          }
        } catch (e) {
           console.error(e);
        }
      }
      
      fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
    }, 4000);
    pollingRef.current = id;
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupData?.group_id]);


  const markReady = async () => {
    if (savingReady) return;
    setSavingReady(true);
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${currentGroupData.group_id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id })
      });
      if (res.ok) {
         fetchGameState(currentGroupData.group_id, currentGroupData, playerData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingReady(false);
    }
  };

  if (!currentGroupData) {
    return (
      <div className="p-8 text-center bg-rose-500/10 text-rose-400 rounded-xl max-w-md mx-auto mt-12">
        <p>No group data found.</p>
        <button onClick={() => navigate('/join')} className="mt-4 underline">
          Go join a game
        </button>
      </div>
    );
  }

  const isLobby = currentGroupData.group_number === 0;
  
  // Find self
  const me = players.find(p => p.id === playerData?.id);
  const myReadyState = me?.is_ready;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700 py-10">
      <div className="relative w-full max-w-xl">
        <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 rounded-full animate-pulse" />
        
        <div className="glass-panel p-8 text-center relative z-10 border-t-4 border-cyan-500 rounded-2xl w-full">
          
          <div className="bg-slate-900/80 rounded-full p-6 inline-block mb-6 shadow-inner border border-slate-700">
            {isLobby ? (
               <Users size={48} className="text-cyan-400 animate-pulse" />
            ) : (
               <Target size={48} className="text-emerald-400 animate-spin-slow" />
            )}
          </div>

          <h2 className="text-3xl font-black text-slate-100 mb-2">
            {isLobby ? "Global Matchmaking Lobby" : "Mission Deployment"}
          </h2>
          
          <p className="text-slate-400 mb-6 font-medium text-sm">
            {isLobby 
               ? "Waiting for the Teacher to divide squads..." 
               : `You have been assigned to Squad ${currentGroupData.group_number}. Gather your team and grab a deck of cards!`}
          </p>

          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-4 mb-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <span className="text-slate-300 font-semibold">{isLobby ? "Players Joined" : "Your Squad"}</span>
              <span className="bg-cyan-500/20 text-cyan-400 font-black px-3 py-1 rounded-full text-xs">
                {players.length} Players {isLobby ? "Waiting" : ""}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar text-left">
              {players.map((p) => (
                <div key={p.id} className="bg-slate-800/80 px-4 py-3 rounded-lg flex justify-between items-center shadow-sm">
                   <span className={`font-bold ${p.id === playerData?.id ? "text-cyan-300" : "text-slate-300"}`}>
                     {p.username} {p.id === playerData?.id && "(You)"}
                   </span>
                   
                   {!isLobby && (
                     <div className="flex items-center gap-2">
                       <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                         {p.is_ready ? "Ready" : "Organizing..."}
                       </span>
                       {p.is_ready ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                       ) : (
                          <Loader2 size={18} className="text-amber-400 animate-spin" />
                       )}
                     </div>
                   )}
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-slate-500 text-sm py-4 text-center">No players populated yet.</div>
              )}
            </div>
          </div>

          {!isLobby && (
            <div className="mt-8">
               <button
                 onClick={markReady}
                 disabled={myReadyState || savingReady}
                 className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex justify-center items-center gap-3 transition-all ${
                   myReadyState 
                     ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                     : "bg-cyan-500 text-slate-900 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                 }`}
               >
                 {savingReady ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                 {myReadyState ? "You Are Ready!" : "I'm with my Squad & Ready!"}
               </button>
               {!myReadyState && (
                 <p className="text-slate-500 text-xs mt-3 uppercase tracking-wider">
                   Press when your entire group is gathered and ready to start the round
                 </p>
               )}
            </div>
          )}

          {isLobby && (
             <div className="flex justify-center gap-2 mt-4">
               {[0, 1, 2].map((i) => (
                 <div
                   key={i}
                   className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce"
                   style={{ animationDelay: `${i * 0.15}s` }}
                 />
               ))}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
