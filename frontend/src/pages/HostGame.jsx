import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2, Play, BookOpen, Gamepad2, Activity } from 'lucide-react';
import { API_URLS } from '../services/api';

const MODULES = [
  {
    id: 'module_1',
    emoji: '📘',
    label: 'Module 1: Trading',
    desc: 'Focus on trading and collecting cards. No passwords, no zombies. 3 rounds of 3 minutes.',
    concepts: ['Trading', 'Verification'],
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  {
    id: 'module_2',
    emoji: '⚠️',
    label: 'Module 2: Zombies',
    desc: 'Introduces the zombie role and malware mechanics. No passwords yet.',
    concepts: ['Malware', 'Incident Response'],
    color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300',
  },
  {
    id: 'module_3',
    emoji: '🔒',
    label: 'Module 3: Passwords',
    desc: 'Adds the Secret Password mechanic to show why authentication matters.',
    concepts: ['Authentication', 'Zero Trust'],
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
  },
];

const GAME_MODES = [
  { id: 'easy',   emoji: '🟢', label: 'Easy',   desc: 'No infected cards. Great for beginners.' },
  { id: 'normal', emoji: '🟡', label: 'Normal', desc: 'Infected cards spread malware on scan.' },
  { id: 'hard',   emoji: '🔴', label: 'Hard',   desc: 'Special roles, random events, and complex infection chains.' },
];

const HostGame = ({ setHasSession }) => {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [jogoOpen, setJogoOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('module_1');
  const [selectedGameMode, setSelectedGameMode] = useState('normal');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch(`${API_URLS.SESSION}/my?token=${token}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.length > 0) {
          const activeSession = data.find(s => s.status === 'active') || data[0];
          localStorage.setItem('session_id', activeSession.id);
          localStorage.setItem('session_data', JSON.stringify(activeSession));
          if (setHasSession) setHasSession(true);
          navigate('/dashboard', { state: { session: activeSession } });
        }
      } catch (e) {
        console.error('Failed to fetch existing sessions', e);
      }
    };
    checkActiveSession();
  }, [navigate, setHasSession]);

  const createSession = async (gameMode) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URLS.SESSION}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_mode: gameMode })
      });
      if (!response.ok) throw new Error('Failed to create session');
      const data = await response.json();
      localStorage.setItem('session_id', data.id);
      localStorage.setItem('session_data', JSON.stringify({ ...data, game_mode: gameMode }));
      if (setHasSession) setHasSession(true);
      navigate('/dashboard', { state: { session: { ...data, game_mode: gameMode } } });
    } catch (error) {
      console.error(error);
      alert('Failed to create session. Are you logged in?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            Teacher Panel
          </h2>
          <p className="text-slate-400">Choose how you want to start today's session</p>
        </div>

        <div className="space-y-4">
          {/* MODULES */}
          <div className="glass-panel rounded-3xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => { setModulesOpen(!modulesOpen); setJogoOpen(false); }}
              className="w-full flex items-center justify-between p-7 hover:bg-slate-800/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <BookOpen size={28} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-white">MODULES</p>
                  <p className="text-slate-400 text-sm">Guided lesson by module</p>
                </div>
              </div>
              {modulesOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
            </button>

            {modulesOpen && (
              <div className="px-6 pb-6 space-y-3 border-t border-slate-700/50 pt-4">
                {MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModule(mod.id)}
                    className={`w-full text-left p-4 rounded-2xl border bg-gradient-to-br transition-all ${mod.color} ${
                      selectedModule === mod.id ? 'scale-[1.02] shadow-lg' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{mod.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-100">{mod.label}</p>
                        <p className="text-slate-400 text-xs mt-1">{mod.desc}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {mod.concepts.map(c => (
                            <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mod.badge}`}>{c}</span>
                          ))}
                        </div>
                      </div>
                      {selectedModule === mod.id && (
                        <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                          <div className="w-2 h-2 rounded-full bg-slate-900" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => createSession(selectedModule)}
                  disabled={loading}
                  className="w-full mt-2 py-4 rounded-2xl font-black text-lg text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                  {loading ? 'Starting...' : `Launch ${MODULES.find(m => m.id === selectedModule)?.label}`}
                </button>
              </div>
            )}
          </div>

          {/* GAME */}
          <div className="glass-panel rounded-3xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => { setJogoOpen(!jogoOpen); setModulesOpen(false); }}
              className="w-full flex items-center justify-between p-7 hover:bg-slate-800/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Gamepad2 size={28} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-white">GAME</p>
                  <p className="text-slate-400 text-sm">Free play with difficulty mode</p>
                </div>
              </div>
              {jogoOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
            </button>

            {jogoOpen && (
              <div className="px-6 pb-6 space-y-3 border-t border-slate-700/50 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  {GAME_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedGameMode(mode.id)}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        selectedGameMode === mode.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.03]'
                          : 'border-slate-700 bg-slate-800/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mode.emoji}</div>
                      <p className="font-bold text-sm text-slate-200">{mode.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-slate-400 text-xs text-center px-2">
                  {GAME_MODES.find(m => m.id === selectedGameMode)?.desc}
                </p>

                <button
                  onClick={() => createSession(selectedGameMode)}
                  disabled={loading}
                  className="w-full mt-2 py-4 rounded-2xl font-black text-lg text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                  {loading ? 'Starting...' : 'Launch Game'}
                </button>
              </div>
            )}
          </div>
        </div>

        {localStorage.getItem('session_id') && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-amber-400" />
              <p className="text-sm text-amber-300 font-semibold">You already have an active session</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2 rounded-xl transition-all"
            >
              View Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostGame;
