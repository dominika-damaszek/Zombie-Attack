import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2, Play, BookOpen, Gamepad2, Activity } from 'lucide-react';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';

const MODULES = [
  {
    id: 'module_1',
    emoji: '📘',
    label: 'Module 1',
    sublabel: 'Trading',
    desc: 'Card trading only. No zombies. Learn data sharing.',
    concepts: ['Trading', 'Verification'],
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
    accent: 'text-blue-400',
  },
  {
    id: 'module_2',
    emoji: '⚠️',
    label: 'Module 2',
    sublabel: 'Zombies',
    desc: 'Zombies introduced. No passwords yet.',
    concepts: ['Malware', 'Incident Response'],
    color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300',
    accent: 'text-orange-400',
  },
  {
    id: 'module_3',
    emoji: '🔒',
    label: 'Module 3',
    sublabel: 'Passwords',
    desc: 'Authentication via secret passwords.',
    concepts: ['Authentication', 'Zero Trust'],
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
    accent: 'text-purple-400',
  },
];

const HostGame = ({ setHasSession }) => {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState('module_1');
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
          const activeSession = data.find(s => s.status === 'active');
          if (activeSession) {
            localStorage.setItem('session_id', activeSession.id);
            localStorage.setItem('session_data', JSON.stringify(activeSession));
            if (setHasSession) setHasSession(true);
            navigate('/dashboard', { state: { session: activeSession } });
          }
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
      <div className="w-full max-w-2xl">
        <BackButton to="/" />

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
              onClick={() => { setModulesOpen(!modulesOpen); setGameOpen(false); }}
              className="w-full flex items-center justify-between p-7 hover:bg-slate-800/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <BookOpen size={28} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-white">MODULES</p>
                  <p className="text-slate-400 text-sm">Guided lesson by cybersecurity module</p>
                </div>
              </div>
              {modulesOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
            </button>

            {modulesOpen && (
              <div className="px-6 pb-6 border-t border-slate-700/50 pt-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {MODULES.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => setSelectedModule(mod.id)}
                      className={`text-left p-4 rounded-2xl border bg-gradient-to-br transition-all ${mod.color} ${
                        selectedModule === mod.id ? 'ring-2 ring-offset-1 ring-offset-slate-900 ring-cyan-500/50 scale-[1.02] shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="text-3xl mb-2">{mod.emoji}</div>
                      <p className={`font-black text-sm ${mod.accent}`}>{mod.label}</p>
                      <p className="font-bold text-slate-200 text-sm">{mod.sublabel}</p>
                      <p className="text-slate-400 text-xs mt-1 leading-tight">{mod.desc}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {mod.concepts.map(c => (
                          <span key={c} className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${mod.badge}`}>{c}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => createSession(selectedModule)}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-lg text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                  {loading ? 'Starting...' : `Launch ${MODULES.find(m => m.id === selectedModule)?.sublabel}`}
                </button>
              </div>
            )}
          </div>

          {/* GAME */}
          <div className="glass-panel rounded-3xl border border-slate-700/50 overflow-hidden">
            <button
              onClick={() => { setGameOpen(!gameOpen); setModulesOpen(false); }}
              className="w-full flex items-center justify-between p-7 hover:bg-slate-800/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Gamepad2 size={28} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-white">GAME</p>
                  <p className="text-slate-400 text-sm">Free play — full zombie infection mechanics</p>
                </div>
              </div>
              {gameOpen ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
            </button>

            {gameOpen && (
              <div className="px-6 pb-6 border-t border-slate-700/50 pt-5">
                <div className="bg-slate-800/60 rounded-2xl p-5 mb-5 border border-slate-700/50">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">🧟</span>
                    <div>
                      <p className="font-black text-white text-lg">Normal Mode</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Zombies infect survivors through item trading. Students scan cards to verify them.
                        ~15% of players start as zombies. 3 rounds of 3 minutes each.
                      </p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {['Infection', 'Trading', 'Verification', 'Zero Trust'].map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => createSession('normal')}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-lg text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                  {loading ? 'Starting...' : 'Launch Normal Game'}
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
