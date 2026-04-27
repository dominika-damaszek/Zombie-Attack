import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UsersRound, Send, ChevronRight, Activity } from 'lucide-react';
import { API_URLS } from '../services/api';

const MODES_GAME = [
  {
    id: 'easy',
    emoji: '🟢',
    label: 'Easy',
    badge: 'mode-easy',
    tagline: 'Perfect for beginners',
    items: 3,
    desc: 'No infected cards, simple rules. Great for learning the basics of trust and authentication.',
    concepts: ['Authentication', 'Password Safety'],
  },
  {
    id: 'normal',
    emoji: '🟡',
    label: 'Normal',
    badge: 'mode-normal',
    tagline: 'The standard experience',
    items: 5,
    desc: 'Infected cards spread malware on scan. Players can inspect and discard suspicious items.',
    concepts: ['Malware Spread', 'Zero Trust', 'Phishing'],
  },
  {
    id: 'hard',
    emoji: '🔴',
    label: 'Hard',
    badge: 'mode-hard',
    tagline: 'Advanced threat landscape',
    items: 8,
    desc: 'Special roles (Firewall, Analyst), random round events, and a complex infection chain.',
    concepts: ['Firewalls', 'Threat Analysis', 'Incident Response', 'Zero Trust'],
  },
];

const MODES_MODULES = [
  {
    id: 'module_1',
    emoji: '📘',
    label: 'Module 1: Trading',
    badge: 'mode-easy',
    tagline: 'Learn the Trading mechanics',
    desc: 'Focus entirely on trading and gathering cards. No passwords, no zombies. Features 3 rounds of 3 minutes.',
    concepts: ['Trading', 'Verification'],
  },
  {
    id: 'module_2',
    emoji: '⚠️',
    label: 'Module 2: Infection',
    badge: 'mode-normal',
    tagline: 'Introduce Malware',
    desc: 'Introduces the zombie role and malware mechanics. No passwords exist yet.',
    concepts: ['Malware Spread', 'Incident Response'],
  },
  {
    id: 'module_3',
    emoji: '🔒',
    label: 'Module 3: Trust',
    badge: 'mode-hard',
    tagline: 'Introduce Authentication',
    desc: 'Adds the Secret Password mechanic to show why authentication is important.',
    concepts: ['Authentication', 'Zero Trust'],
  }
];

const HostGame = ({ setHasSession }) => {
  const [trackType, setTrackType] = useState('modules'); // 'modules' or 'game'
  const [gameMode, setGameMode] = useState('module_1'); // default matches first track
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await axios.get(`${API_URLS.SESSION}/my?token=${token}`);
        if (response.data && response.data.length > 0) {
          // Found active sessions!
          const activeSession = response.data.find(s => s.status === 'active') || response.data[0];
          localStorage.setItem('session_id', activeSession.id);
          localStorage.setItem('session_data', JSON.stringify(activeSession));
          if (setHasSession) setHasSession(true);
          navigate('/dashboard', { state: { session: activeSession } });
        }
      } catch (e) {
        console.error("Failed to fetch existing sessions", e);
      }
    };
    
    checkActiveSession();
  }, [navigate, setHasSession]);

  const handleTrackChange = (track) => {
    setTrackType(track);
    setGameMode(track === 'modules' ? 'module_1' : 'normal');
  };

  const submitSession = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URLS.SESSION}?token=${token}`,
        { game_mode: gameMode }
      );
      localStorage.setItem('session_id', response.data.id);
      localStorage.setItem('session_data', JSON.stringify({ ...response.data, game_mode: gameMode }));
      if (setHasSession) setHasSession(true);
      navigate('/dashboard', { state: { session: { ...response.data, game_mode: gameMode } } });
    } catch (error) {
      console.error(error);
      alert('Failed to create session. Are you logged in?');
      setLoading(false);
    }
  };

  const currentModes = trackType === 'modules' ? MODES_MODULES : MODES_GAME;
  const selectedMode = currentModes.find((m) => m.id === gameMode);

  return (
    <div className="max-w-2xl mx-auto py-10 animate-zw-fade">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-black mb-1 zw-text-gradient">Host a Session</h2>
        <p className="text-slate-500 text-sm">Configure your classroom activity before launching.</p>
      </div>

      {localStorage.getItem('session_id') && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500">
               <Activity size={20} />
             </div>
             <div>
               <p className="text-sm font-bold text-amber-400">Você já tem uma sessão ativa!</p>
               <p className="text-xs text-slate-500">Deseja continuar ou encerrar para criar outra?</p>
             </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-amber-500 text-slate-900 font-bold rounded-xl text-sm flex-1 sm:flex-none"
            >
              Continuar
            </button>
            <button 
              onClick={async () => {
                if (!window.confirm("Encerrar sessão anterior?")) return;
                try {
                  const sId = localStorage.getItem('session_id');
                  const token = localStorage.getItem('token');
                  await axios.delete(`${API_URLS.SESSION}/${sId}?token=${token}`);
                  localStorage.removeItem('session_id');
                  localStorage.removeItem('session_data');
                  if (setHasSession) setHasSession(false);
                  window.location.reload();
                } catch (e) {
                   localStorage.removeItem('session_id');
                   window.location.reload();
                }
              }}
              className="px-4 py-2 bg-rose-500/20 text-rose-400 font-bold rounded-xl text-sm flex-1 sm:flex-none"
            >
              Encerrar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Track Selector */}
        <div className="glass-panel p-2 flex rounded-2xl">
          <button
            onClick={() => handleTrackChange('modules')}
            className={`flex-1 py-3 text-center font-bold text-lg transition-all rounded-xl ${
              trackType === 'modules'
                ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Modules
          </button>
          <button
            onClick={() => handleTrackChange('game')}
            className={`flex-1 py-3 text-center font-bold text-lg transition-all rounded-xl ${
              trackType === 'game'
                ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Game
          </button>
        </div>

        {/* Game Mode Selector */}
        <div className="glass-panel p-6 rounded-2xl animate-zw-fade" key={trackType}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
             Select specific {trackType === 'modules' ? 'Module' : 'Game Mode'}
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {currentModes.map((m) => (
              <button
                key={m.id}
                onClick={() => setGameMode(m.id)}
                className={`p-3 rounded-xl text-center transition-all border-2 ${
                  gameMode === m.id
                    ? 'border-amber-500/50 scale-[1.03]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: gameMode === m.id ? 'rgba(121,88,70,0.2)' : 'rgba(56,44,37,0.4)',
                }}
              >
                <div className="text-2xl mb-1">{m.emoji}</div>
                <p className="font-bold text-sm" style={{ color: '#AD9E97' }}>{m.label}</p>
                <p className="text-xs text-slate-500">{m.tagline}</p>
              </button>
            ))}
          </div>

          {/* Mode Detail */}
          {selectedMode && (
            <div
              className={`rounded-xl p-4 ${selectedMode.badge}`}
              style={{ background: 'rgba(56,44,37,0.6)', border: '1px solid rgba(109,113,98,0.25)' }}
            >
              <p className="text-sm font-semibold mb-2">{selectedMode.desc}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMode.concepts.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(173,158,151,0.12)', color: '#AD9E97', border: '1px solid rgba(173,158,151,0.2)' }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Launch */}
        <button
          onClick={submitSession}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-3 py-5 text-xl rounded-2xl"
        >
          {loading ? (
            <span className="animate-pulse">Generating Mission Codes…</span>
          ) : (
            <>
              <Send size={22} />
              Launch {selectedMode?.label}
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default HostGame;
