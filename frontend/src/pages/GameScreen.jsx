import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Shield, Skull, Timer, Package, Camera, X, Zap, AlertTriangle,
         ChevronRight, ChevronLeft, Info, HelpCircle, Target, CheckCircle2 } from 'lucide-react';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useAudio } from '../hooks/useAudio';
import AudioToggle from '../components/AudioToggle';
import EduPopup from '../components/EduPopup';
import { API_URLS } from '../services/api';

// ── Card catalogue ─────────────────────────────────────────────────────────────
const CARD_TYPES = {
  remedio:     { emoji: '💊', label: 'Medicine',  color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/30' },
  comida:      { emoji: '🍎', label: 'Food',      color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  arma:        { emoji: '🔫', label: 'Weapon',    color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/30' },
  roupa:       { emoji: '👕', label: 'Clothing',  color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/30' },
  ferramentas: { emoji: '🔧', label: 'Tools',     color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/30' },
  unknown:     { emoji: '📦', label: 'Unknown',   color: 'text-slate-400',   bg: 'bg-slate-500/20 border-slate-500/30' },
};

// ── Instruction slides per module ─────────────────────────────────────────────
const MODULE_SLIDES = {
  module_1: [
    { emoji: '🌐', title: 'Welcome to Zombieware', text: 'You are about to experience a simulation of how data moves through a network. Each player is a node — connected, vulnerable, and important.' },
    { emoji: '🃏', title: 'Your Physical Cards',   text: 'Each of you has 4 physical item cards. These represent files and data packets being shared across the network.' },
    { emoji: '🤝', title: 'How to Trade',          text: 'Walk around the room and exchange one card with another player per round. Face to face — just like peer-to-peer file sharing.' },
    { emoji: '🎯', title: 'Your Objectives',       text: 'You have 3 secret objectives — 3 card types you must collect. Trade strategically to complete all 3 goals!' },
    { emoji: '📱', title: 'Scanning Cards',        text: 'At the end of each round, scan every card in your hand. This logs the data transfer on the network. Do NOT scan during trading!' },
    { emoji: '✅', title: 'Ready to Start!',       text: 'You will now scan your 4 starting cards to register them on the network. When you\'re done reading, press "I\'m Ready!" below.' },
  ],
  module_2: [
    { emoji: '⚠️', title: 'Danger Ahead',          text: 'The network has been compromised. A rogue malware strain has infected some players — they look just like you.' },
    { emoji: '🧟', title: 'Meet the Zombies',      text: 'Some players are Zombies (Malware). Their goal is to infect others by contaminating their item cards before a trade.' },
    { emoji: '☣️', title: 'How Infection Spreads', text: 'If you scan a card at the end of a round that a Zombie previously touched, YOUR device becomes infected too.' },
    { emoji: '🤔', title: 'No Security Yet',       text: 'There are no passwords this round. Use social engineering — talk to people, observe behavior, and decide who to trust.' },
    { emoji: '🎯', title: 'Your Objectives',       text: 'Collect your 3 target card types while avoiding infected ones. Surviving all rounds scores your team extra points!' },
    { emoji: '✅', title: 'Ready to Play!',        text: 'Scan your 4 starting cards to begin. Good luck — and be very careful who you trade with.' },
  ],
  module_3: [
    { emoji: '🔒', title: 'Security Upgraded',     text: 'The network admins have deployed an authentication system. The zombie outbreak forced an upgrade to Zero Trust security.' },
    { emoji: '🔑', title: 'Secret Password',       text: 'Every Survivor now has a Secret Password visible on their screen. Zombies do NOT have this password — they are locked out.' },
    { emoji: '🛑', title: 'Zero Trust Protocol',   text: 'Before accepting a card from anyone, ask them for the Secret Password. If they cannot provide it — DO NOT trade.' },
    { emoji: '🧟', title: 'Zombie Deception',      text: 'Zombies will try to fake the password or social engineer you. Verify every time — even with people you already traded with.' },
    { emoji: '🎯', title: 'Your Objectives',       text: 'Collect your 3 target cards. Only trade with verified survivors (confirmed password). Complete objectives to score maximum points.' },
    { emoji: '✅', title: 'Ready for Battle!',     text: 'The simulation begins now. Scan your starting cards to register on the network and protect it from the outbreak.' },
  ],
  normal: [
    { emoji: '🧟', title: 'Welcome to Zombieware', text: 'The network is under attack! You are either a Survivor protecting data — or a Zombie spreading malware. The simulation begins now.' },
    { emoji: '🃏', title: 'Your Physical Cards',   text: 'Each player starts with 4 item cards. These represent files in the network. Scan them to verify and log them.' },
    { emoji: '☣️', title: 'Infection Rules',       text: 'Zombies infect by contaminating cards. If you scan an infected card at the end of a round, you become a Zombie too.' },
    { emoji: '🔑', title: 'The Password',          text: 'Survivors have a Secret Password. Before trading with anyone, ask them for it. No password = Zombie. No exceptions.' },
    { emoji: '🎯', title: 'Your Objectives',       text: 'You have 3 secret card types to collect. Complete objectives to score points for your team. Survivors vs Zombies — who wins?' },
    { emoji: '✅', title: 'Let\'s Play!',          text: 'Scan your 4 starting cards now to enter the network. The simulation begins when everyone is ready.' },
  ],
};

// ── Info modal content ─────────────────────────────────────────────────────────
const INFO_SECTIONS = [
  { title: 'Card Types', items: [
    { emoji: '💊', label: 'Medicine',  desc: 'Rare and valuable. Represents critical security patches.' },
    { emoji: '🍎', label: 'Food',      desc: 'Common resource. Represents regular data files.' },
    { emoji: '🔫', label: 'Weapon',    desc: 'Powerful item. Represents offensive security tools.' },
    { emoji: '👕', label: 'Clothing',  desc: 'Utility item. Represents network configuration files.' },
    { emoji: '🔧', label: 'Tools',     desc: 'Versatile item. Represents system administration tools.' },
  ]},
  { title: 'Roles', items: [
    { emoji: '🛡️', label: 'Survivor',  desc: 'Your goal: collect objectives and survive all 3 rounds.' },
    { emoji: '🧟', label: 'Zombie',    desc: 'Your goal: infect as many survivors as possible by contaminating cards.' },
  ]},
  { title: 'Mechanics', items: [
    { emoji: '🔑', label: 'Password',  desc: 'The shared secret that proves you\'re a Survivor. Ask before trading!' },
    { emoji: '🎯', label: 'Objectives',desc: '3 card types to collect. Complete all 3 to score maximum points.' },
    { emoji: '⏭️', label: 'Skip Round',desc: 'Once per game: draw a random card from the pool and discard one.' },
  ]},
];

// ── Role Reveal ────────────────────────────────────────────────────────────────
function RoleReveal({ role, secretWord, gameMode, onContinue }) {
  const isZombie = role === 'zombie';
  const cfg = isZombie
    ? { emoji: '🧟', label: 'Zombie',   color: '#d97559', border: 'rgba(217,117,89,0.5)', glow: 'rgba(217,117,89,0.3)', desc: 'Infect survivors by contaminating their item cards. Spread the malware!' }
    : { emoji: '🛡️', label: 'Survivor', color: '#a8c4a0', border: 'rgba(168,196,160,0.5)', glow: 'rgba(168,196,160,0.25)', desc: 'Trade cards, collect your objectives, and protect the network from zombies.' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.97)' }}>
      <div className="relative text-center max-w-sm w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl" style={{ border: `2px solid ${cfg.border}` }}>
          <div className="text-8xl mb-5 animate-zw-float">{cfg.emoji}</div>
          <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>Your Role</p>
          <h1 className="text-5xl font-black mb-4 uppercase" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
            {cfg.label}
          </h1>
          {!isZombie && secretWord && (
            <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(56,44,37,0.7)', border: '1px solid rgba(168,196,160,0.3)' }}>
              <p className="text-xs uppercase tracking-widest mb-1 font-mono" style={{ color: '#a8c4a0' }}>🔑 Your Secret Password</p>
              <p className="text-3xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{secretWord}</p>
              <p className="text-slate-500 text-xs mt-1">Never share with unverified players.</p>
            </div>
          )}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{cfg.desc}</p>
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)` }}
          >
            Enter the Field <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Infection Alert ────────────────────────────────────────────────────────────
function InfectionAlert({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(80,20,15,0.85)' }}>
      <div className="relative text-center max-w-xs w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl animate-zw-shake" style={{ border: '2px solid #d97559' }}>
          <div className="text-7xl mb-4 animate-bounce">🧟</div>
          <h2 className="text-4xl font-black mb-2" style={{ color: '#d97559' }}>INFECTED!</h2>
          <p className="text-slate-300 mb-1">Malware transferred to your device.</p>
          <p className="text-slate-500 text-sm mb-4">You received a file from an infected source. You are now a Zombie.</p>
          <button onClick={onDismiss} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: '#795846' }}>
            Accept Fate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QR Scanner ─────────────────────────────────────────────────────────────────
function QRScannerModal({ onScan, onClose, title = 'Scan Item Card', hint = '' }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    const handleResult = (text) => {
      let result = text.trim();
      try { const parsed = JSON.parse(text); result = parsed.code || parsed.id || text; } catch {}
      onScan(result.toUpperCase());
    };
    const startScanner = async () => {
      try {
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, handleResult, () => {});
      } catch {
        try {
          await scanner.start({ facingMode: 'user' }, { fps: 10, qrbox: { width: 240, height: 240 } }, handleResult, () => {});
        } catch { setError('Camera access denied. Allow camera permissions and try again.'); }
      }
    };
    startScanner();
    return () => scanner.stop().catch(() => {});
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.92)' }}>
      <div className="relative rounded-3xl p-6 max-w-sm w-full mx-4" style={{ background: 'rgba(42,38,34,0.95)', border: '1px solid rgba(109,113,98,0.4)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={24} /></button>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <Camera size={20} style={{ color: '#795846' }} /> {title}
        </h3>
        {hint && <p className="text-slate-500 text-sm mb-4">{hint}</p>}
        {error ? (
          <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(217,117,89,0.1)', border: '1px solid rgba(217,117,89,0.3)', color: '#d97559' }}>{error}</div>
        ) : (
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(109,113,98,0.3)', minHeight: 280 }} />
        )}
      </div>
    </div>
  );
}

// ── Timer Bar ──────────────────────────────────────────────────────────────────
function TimerBar({ endTime, label }) {
  const [remaining, setRemaining] = useState(0);
  const totalRef = useRef(1);
  useEffect(() => {
    if (!endTime) return;
    totalRef.current = Math.max(1, endTime - Math.floor(Date.now() / 1000));
    const id = setInterval(() => setRemaining(Math.max(0, endTime - Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const pct = Math.min(100, (remaining / totalRef.current) * 100);
  const urgent = pct < 25;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <div className="glass-panel rounded-2xl p-4 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono uppercase tracking-widest flex items-center gap-1" style={{ color: '#6D7162' }}>
          <Timer size={12} /> {label}
        </span>
        <span className={`text-xl font-black font-mono ${urgent ? 'animate-pulse' : ''}`} style={{ color: urgent ? '#d97559' : '#AD9E97' }}>
          {mins}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(173,158,151,0.12)' }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: urgent ? 'linear-gradient(90deg,#795846,#d97559)' : 'linear-gradient(90deg,#454D3E,#6D7162)' }} />
      </div>
    </div>
  );
}

// ── Info Modal ─────────────────────────────────────────────────────────────────
function InfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,22,18,0.93)' }}>
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden overflow-y-auto max-h-[90vh]"
           style={{ background: 'rgba(42,38,34,0.98)', border: '1px solid rgba(109,113,98,0.4)' }}>
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#AD9E97' }}>
            <HelpCircle size={20} style={{ color: '#795846' }} /> Game Guide
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={22} /></button>
        </div>
        <div className="p-6 space-y-6">
          {INFO_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs uppercase tracking-widest font-mono mb-3" style={{ color: '#6D7162' }}>{section.title}</h3>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(56,44,37,0.5)' }}>
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{item.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main GameScreen ────────────────────────────────────────────────────────────
const GameScreen = ({ mockData } = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { groupData, playerData } = location.state || {};

  const [gameState, setGameState] = useState(mockData?.gameState || null);
  const [playerState, setPlayerState] = useState(mockData?.playerState || null);
  const [showRoleReveal, setShowRoleReveal] = useState(!mockData);
  const [showScanner, setShowScanner] = useState(false);
  const [showInitialScanner, setShowInitialScanner] = useState(false);
  const [showInfectionAlert, setShowInfectionAlert] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [eduContext, setEduContext] = useState(null);
  const [loading, setLoading] = useState(!mockData);
  const [isDoneTrading, setIsDoneTrading] = useState(false);
  const [hasSkippedTrade, setHasSkippedTrade] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [instructionsReady, setInstructionsReady] = useState(false);
  const [initialScanCount, setInitialScanCount] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [objectives, setObjectives] = useState([]);

  const { playSFX, toggle, isEnabled } = useAudio();
  const { lastMessage } = useGameWebSocket(
    mockData ? null : groupData?.group_id,
    mockData ? null : playerData?.id
  );

  const fetchState = useCallback(async () => {
    if (!groupData?.group_id || mockData) return;
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/state`);
      const data = await res.json();
      setGameState(data);
      const me = data.players?.find(p => p.id === playerData?.id);
      if (me) {
        setPlayerState(me);
        setInventory(me.inventory || []);
        setObjectives(me.objectives || []);
        setInitialScanCount(me.initial_cards_scanned || 0);
        setHasSkippedTrade(me.has_skipped_trade || false);
      }
      if (data.game_state === 'end_game') navigate('/endgame', { state: { groupId: groupData.group_id } });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [groupData?.group_id, playerData?.id, navigate, mockData]);

  useEffect(() => { fetchState(); const id = setInterval(fetchState, 10000); return () => clearInterval(id); }, [fetchState]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'GAME_STARTED') { fetchState(); playSFX('role_reveal'); }
    if (lastMessage.type === 'PHASE_CHANGED') { fetchState(); }
    if (lastMessage.type === 'PLAYER_INFECTED' && lastMessage.player_id === playerData?.id) {
      setShowInfectionAlert(true);
      setPlayerState(p => ({ ...p, role: 'zombie', is_infected: true }));
      playSFX('infected');
    }
    if (lastMessage.type === 'GAME_ENDED' || lastMessage.type === 'ROUND_STARTED' || lastMessage.type === 'ROUND_ENDED') {
      if (lastMessage.type === 'ROUND_STARTED') setIsDoneTrading(false);
      fetchState();
    }
  }, [lastMessage, playerData?.id, fetchState, playSFX]);

  // Keyboard navigation for instructions
  useEffect(() => {
    const gamePhase = gameState?.game_state || mockData?.gameState?.game_state;
    if (gamePhase !== 'module_instructions') return;
    const gameMode = gameState?.game_mode || mockData?.gameState?.game_mode || 'module_1';
    const slides = MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSlideIndex(i => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setSlideIndex(i => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState?.game_state, gameState?.game_mode, mockData]);

  const handleFinishInstructions = async () => {
    if (!mockData) {
      try {
        await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/finish_instructions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerData.id }),
        });
        setInstructionsReady(true);
      } catch (e) { console.error(e); }
    } else {
      setInstructionsReady(true);
    }
  };

  const handleInitialScan = async (cardCode) => {
    setShowInitialScanner(false);
    setScanFeedback({ status: 'scanning', item: { type: 'card' } });
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/initial_scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id, card_code: cardCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setInitialScanCount(data.initial_cards_scanned);
        setInventory(data.inventory || []);
        if (data.objectives?.length) setObjectives(data.objectives);
        const ct = CARD_TYPES[data.card_type] || CARD_TYPES.unknown;
        setScanFeedback({ status: 'success', item: { type: data.card_type } });
        setTimeout(() => setScanFeedback(null), 2500);
        playSFX('scan_success');
        if (data.initial_cards_scanned >= 4) fetchState();
      } else {
        setScanFeedback({ status: 'error', message: data.detail || 'Unknown card code' });
        setTimeout(() => setScanFeedback(null), 3000);
      }
    } catch { setScanFeedback({ status: 'error', message: 'Scan failed. Try again.' }); setTimeout(() => setScanFeedback(null), 3000); }
  };

  const handleScan = useCallback(async (item) => {
    setShowScanner(false);
    setScanFeedback({ status: 'scanning', item });
    playSFX('button_click');
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id, item }),
      });
      const data = await res.json();
      if (data.inventory) setInventory(data.inventory);
      if (data.edu) setEduContext(data.edu);
      if (data.infected) {
        setShowInfectionAlert(true);
        setPlayerState(p => ({ ...p, role: 'zombie', is_infected: true }));
        setScanFeedback(null);
      } else {
        playSFX('scan_success');
        setScanFeedback({ status: 'success', item });
        setTimeout(() => setScanFeedback(null), 3000);
      }
    } catch {
      setScanFeedback({ status: 'error', message: 'Scan failed. Try again.' });
      setTimeout(() => setScanFeedback(null), 3000);
    }
  }, [groupData?.group_id, playerData?.id, playSFX]);

  const handleDoneTrading = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/trade_done`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id }),
      });
      setIsDoneTrading(true);
    } catch (e) { console.error(e); }
  };

  const handleSkipTrade = async () => {
    if (hasSkippedTrade) return;
    if (!window.confirm('Use your Skip Round? This can only be used ONCE per game.')) return;
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/skip_trade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id }),
      });
      setHasSkippedTrade(true);
      setIsDoneTrading(true);
    } catch (e) { console.error(e); }
  };

  const handleNextRound = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/next_round`, { method: 'POST' });
    } catch (e) { console.error(e); }
  };

  if (!groupData || !playerData) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12" style={{ background: 'rgba(121,88,70,0.1)', border: '1px solid rgba(121,88,70,0.3)', color: '#d97559', borderRadius: 24 }}>
        <p>No game data found.</p>
        <button onClick={() => navigate('/join')} className="mt-4 underline">Join a game</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center"><div className="text-6xl mb-4 animate-zw-float">🧟</div>
          <p className="font-mono animate-pulse" style={{ color: '#6D7162' }}>Connecting to the field…</p></div>
      </div>
    );
  }

  const isZombie = playerState?.role === 'zombie';
  const gamePhase = gameState?.game_state || 'lobby';
  const gameMode = gameState?.game_mode || 'normal';
  const statusColor = isZombie ? '#d97559' : '#a8c4a0';
  const statusEmoji = isZombie ? '🧟' : '🛡️';
  const statusLabel = isZombie ? 'Zombie' : 'Survivor';
  const otherZombies = gameState?.players?.filter(p => p.is_infected && p.id !== playerData?.id) || [];

  // ── Full-screen instruction slides ─────────────────────────────────────────
  if (gamePhase === 'module_instructions') {
    const slides = MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1;
    const slide = slides[slideIndex];
    const isLast = slideIndex === slides.length - 1;

    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg">
          <div className="flex justify-center gap-2 mb-10">
            {slides.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${slideIndex === idx ? 'bg-cyan-400 w-8' : slideIndex > idx ? 'bg-slate-600 w-4' : 'bg-slate-800 w-4'}`} />
            ))}
          </div>

          <div className="text-center">
            <div className="text-8xl mb-8 animate-zw-float">{slide.emoji}</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-5">{slide.title}</h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-12 max-w-md mx-auto">{slide.text}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
              disabled={slideIndex === 0}
              className={`flex items-center gap-1 py-4 px-5 rounded-2xl font-bold text-sm transition-all ${slideIndex === 0 ? 'opacity-20 cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}`}
            >
              <ChevronLeft size={20} /> Back
            </button>

            {isLast ? (
              <button
                onClick={handleFinishInstructions}
                disabled={instructionsReady}
                className="flex-1 py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 0 30px rgba(6,182,212,0.25)' }}
              >
                <CheckCircle2 size={22} />
                {instructionsReady ? "Waiting for others..." : "I'm Ready!"}
              </button>
            ) : (
              <button
                onClick={() => setSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                className="flex-1 py-4 rounded-2xl font-black text-lg text-slate-900 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: '#a8c4a0' }}
              >
                Next <ChevronRight size={22} />
              </button>
            )}
          </div>

          <p className="text-center text-slate-700 text-xs mt-4 font-mono">Press Space or → to advance</p>
        </div>
      </div>
    );
  }

  // ── Initial Scan Phase ─────────────────────────────────────────────────────
  if (gamePhase === 'initial_scan_phase') {
    const progress = initialScanCount;
    const isDone = progress >= 4;

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 py-8">
        {showInitialScanner && (
          <QRScannerModal
            onScan={handleInitialScan}
            onClose={() => setShowInitialScanner(false)}
            title="Scan Starting Card"
            hint="Point at your physical card's QR code. Scan all 4 starting cards."
          />
        )}

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-3xl font-black text-white mb-2">Scan Your Cards</h2>
            <p className="text-slate-400">Scan all 4 physical cards to register them on the network</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-300 font-bold">Progress</span>
              <span className="font-black text-xl" style={{ color: isDone ? '#a8c4a0' : '#AD9E97' }}>{progress}/4</span>
            </div>
            <div className="flex gap-2 mb-5">
              {[0,1,2,3].map(i => (
                <div key={i} className={`flex-1 h-3 rounded-full transition-all ${i < progress ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 min-h-16">
              {inventory.map((card, idx) => {
                const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                return (
                  <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm ${ct.bg}`}>
                    <span className="text-xl">{ct.emoji}</span>
                    <span className={`font-semibold ${ct.color}`}>{ct.label}</span>
                  </div>
                );
              })}
            </div>

            {scanFeedback && (
              <div className={`p-3 rounded-xl text-sm flex items-center gap-2 mb-3 ${scanFeedback.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : scanFeedback.status === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-300'}`}>
                {scanFeedback.status === 'success' && <><Zap size={16} /> {(CARD_TYPES[scanFeedback.item.type] || CARD_TYPES.unknown).emoji} {(CARD_TYPES[scanFeedback.item.type] || CARD_TYPES.unknown).label} scanned!</>}
                {scanFeedback.status === 'error' && <><AlertTriangle size={16} /> {scanFeedback.message}</>}
                {scanFeedback.status === 'scanning' && <><Camera size={16} /> Verifying...</>}
              </div>
            )}

            {isDone ? (
              <div className="text-center py-4">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 font-black">All cards registered!</p>
                <p className="text-slate-500 text-sm animate-pulse mt-1">Waiting for other players...</p>
              </div>
            ) : (
              <button
                onClick={() => setShowInitialScanner(true)}
                disabled={isDone}
                className="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #454D3E, #6D7162)' }}
              >
                <Camera size={22} /> Scan Card {progress + 1} of 4
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Game Dashboard ────────────────────────────────────────────────────
  const isTimeUp = gamePhase === 'round_active' && gameState?.round_end_time && (gameState.round_end_time - Math.floor(Date.now() / 1000)) <= 0;
  const isModule = gameMode?.startsWith('module');
  const showScanButton = !isModule || gamePhase !== 'round_active';

  return (
    <>
      {showRoleReveal && playerState?.role && (
        <RoleReveal
          role={playerState.role}
          secretWord={!isZombie ? gameState?.secret_word : null}
          gameMode={gameMode}
          onContinue={() => { setShowRoleReveal(false); playSFX('role_reveal'); }}
        />
      )}
      {showInfectionAlert && <InfectionAlert onDismiss={() => setShowInfectionAlert(false)} />}
      {showScanner && (
        <QRScannerModal
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan Item Card"
          hint="Point at the physical card's QR code to log the transfer."
        />
      )}
      {eduContext && <EduPopup edu={eduContext} onDismiss={() => setEduContext(null)} />}
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
      <AudioToggle toggle={toggle} isEnabled={isEnabled} />

      {/* Info button */}
      <button
        onClick={() => setShowInfoModal(true)}
        className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(121,88,70,0.8)', border: '1px solid rgba(173,158,151,0.4)' }}
      >
        <HelpCircle size={22} style={{ color: '#AD9E97' }} />
      </button>

      <div className="max-w-lg mx-auto py-4 px-3 animate-zw-fade pb-20">

        {/* ── Role Banner ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 mb-3 flex items-center justify-between"
             style={{ background: `rgba(${isZombie ? '80,30,20' : '30,50,35'},0.6)`, border: `2px solid ${statusColor}33` }}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{statusEmoji}</span>
            <div>
              <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: '#6D7162' }}>Your Role</p>
              <p className="text-3xl font-black uppercase" style={{ color: statusColor }}>{statusLabel}</p>
              {gameMode === 'module_1' && <p className="text-xs text-slate-500 mt-0.5">Module 1 — Survivors only</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono mb-1" style={{ color: '#6D7162' }}>Round</p>
            <p className="text-3xl font-black text-white">{gameState?.current_round || '-'}</p>
            <p className="text-xs font-mono" style={{ color: '#6D7162' }}>of 3</p>
          </div>
        </div>

        {/* Password (Module 3 / Normal) */}
        {!isZombie && gameState?.secret_word && (
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ background: 'rgba(40,55,40,0.4)', border: '1px solid rgba(168,196,160,0.25)' }}>
            <Shield size={20} style={{ color: '#a8c4a0' }} />
            <div>
              <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#a8c4a0' }}>Secret Password</p>
              <p className="text-2xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{gameState.secret_word}</p>
            </div>
          </div>
        )}

        {/* Timer */}
        {gameState?.round_end_time && gamePhase === 'round_active' && (
          <TimerBar endTime={gameState.round_end_time} label="Round Timer" />
        )}

        {/* ── Objectives ──────────────────────────────────────────────────── */}
        {objectives.length > 0 && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
            <p className="text-xs uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5" style={{ color: '#6D7162' }}>
              <Target size={12} /> Your Objectives
            </p>
            <div className="space-y-2">
              {objectives.map((type, idx) => {
                const ct = CARD_TYPES[type] || CARD_TYPES.unknown;
                const owned = inventory.some(c => c.type === type);
                return (
                  <div key={idx} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    owned ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-800/40'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{ct.emoji}</span>
                      <span className={`font-bold text-sm ${owned ? 'text-emerald-300' : 'text-slate-300'}`}>{ct.label}</span>
                    </div>
                    {owned
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Zombie Network ──────────────────────────────────────────────── */}
        {isZombie && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(80,30,20,0.4)', border: '1px solid rgba(121,88,70,0.3)' }}>
            <p className="text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1" style={{ color: '#795846' }}>
              <Skull size={12} /> Zombie Network
            </p>
            <p className="text-slate-400 text-xs mb-3">Other infected players — coordinate to maximize spread.</p>
            {otherZombies.length === 0 ? (
              <p className="text-slate-600 text-xs italic">You are the only zombie... for now.</p>
            ) : (
              <div className="space-y-1.5">
                {otherZombies.map(z => (
                  <div key={z.id} className="flex items-center gap-2 text-sm" style={{ color: '#d97559' }}>
                    <span>🧟</span><span className="font-semibold">{z.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Zombie Objective (no password) ──────────────────────────────── */}
        {isZombie && (
          <div className="rounded-2xl p-4 mb-3 text-sm text-slate-400" style={{ background: 'rgba(80,30,20,0.25)', border: '1px solid rgba(121,88,70,0.2)' }}>
            <p className="font-bold mb-1" style={{ color: '#d97559' }}>Zombie Objective</p>
            Contaminate as many cards as possible before the round ends. Hand infected items to survivors during trading.
          </div>
        )}

        {/* ── Scan / Trading UI ───────────────────────────────────────────── */}
        {showScanButton ? (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-5 rounded-2xl font-black text-white text-xl flex items-center justify-center gap-3 mb-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isZombie ? 'linear-gradient(135deg, #795846, #d97559)' : 'linear-gradient(135deg, #454D3E, #6D7162)',
              boxShadow: `0 0 30px ${isZombie ? 'rgba(217,117,89,0.2)' : 'rgba(109,113,98,0.2)'}`,
            }}
          >
            <Camera size={28} /> SCAN ITEM
          </button>
        ) : (
          <div className="text-center p-6 mb-3 rounded-2xl" style={{ border: '2px dashed rgba(109,113,98,0.4)', background: 'rgba(56,44,37,0.4)' }}>
            <div className="text-4xl mb-2 animate-bounce">🤝</div>
            <p className="font-bold text-lg" style={{ color: '#AD9E97' }}>Go Trade Physical Cards!</p>
            <p className="text-slate-500 text-sm mb-4">Scanner is disabled until the round ends.</p>
            {!isDoneTrading ? (
              <div className="flex gap-2">
                <button onClick={handleDoneTrading} className="flex-1 py-3 bg-emerald-600/80 text-white font-bold rounded-xl active:scale-95 transition-all text-sm">
                  Done Trading
                </button>
                <button
                  onClick={handleSkipTrade}
                  disabled={hasSkippedTrade}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all text-sm ${hasSkippedTrade ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-600/80 text-white active:scale-95'}`}
                  title="Draw a random card from the pool and discard one of yours (once per game)"
                >
                  Skip Round {hasSkippedTrade ? '(used)' : '(1×)'}
                </button>
              </div>
            ) : (
              <p className="text-emerald-400 font-bold animate-pulse">Waiting for others to finish...</p>
            )}
            {isTimeUp && (
              <button onClick={handleNextRound} className="mt-4 w-full py-3 bg-cyan-600 text-white font-bold rounded-xl animate-pulse">
                Time's up — Start Next Round
              </button>
            )}
          </div>
        )}

        {/* Between rounds */}
        {gamePhase === 'module_between_rounds' && (
          <div className="mb-3 glass-panel p-4 rounded-2xl text-center">
            <h3 className="font-black text-xl mb-1" style={{ color: '#AD9E97' }}>
              {gameState?.current_round === 0 ? 'Scan Your Starting Cards' : `Round ${gameState?.current_round} Complete!`}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {gameState?.current_round === 0 ? 'Scan the items you just received.' : 'Scan all items you collected this round.'}
            </p>
            <button onClick={() => setShowScanner(true)} className="w-full py-3 rounded-xl font-bold text-white mb-2" style={{ background: 'linear-gradient(135deg, #454D3E, #6D7162)' }}>
              <Camera size={16} className="inline mr-2" />Scan Card
            </button>
            <button onClick={handleNextRound} className="w-full py-3 rounded-xl font-bold text-slate-900 transition-all" style={{ background: '#a8c4a0' }}>
              Ready for {gameState?.current_round >= 3 ? 'Game Over' : 'Next Round'} →
            </button>
          </div>
        )}

        {/* Scan Feedback */}
        {scanFeedback && (
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-3 animate-zw-slide"
            style={{
              background: scanFeedback.status === 'success' ? 'rgba(40,55,40,0.5)' : scanFeedback.status === 'error' ? 'rgba(80,30,20,0.5)' : 'rgba(50,50,60,0.5)',
              border: `1px solid ${scanFeedback.status === 'success' ? 'rgba(168,196,160,0.3)' : scanFeedback.status === 'error' ? 'rgba(217,117,89,0.3)' : 'rgba(109,113,98,0.3)'}`,
            }}
          >
            {scanFeedback.status === 'success' && <Zap size={18} style={{ color: '#a8c4a0' }} />}
            {scanFeedback.status === 'error' && <AlertTriangle size={18} style={{ color: '#d97559' }} />}
            {scanFeedback.status === 'scanning' && <Camera size={18} style={{ color: '#AD9E97' }} />}
            <p className="text-sm font-semibold text-slate-300">
              {scanFeedback.status === 'success' && (() => { const ct = CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown; return `${ct.emoji} ${ct.label} scanned and verified!`; })()}
              {scanFeedback.status === 'error' && scanFeedback.message}
              {scanFeedback.status === 'scanning' && 'Verifying digital signature…'}
            </p>
          </div>
        )}

        {/* ── Inventory ──────────────────────────────────────────────────── */}
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
            <Package size={18} style={{ color: '#795846' }} />
            Inventory
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(56,44,37,0.7)', color: '#6D7162' }}>
              {inventory.length} cards
            </span>
          </h3>
          {inventory.length === 0 ? (
            <p className="text-xs text-center py-4 font-mono" style={{ color: '#454D3E' }}>
              No cards yet.<br />Scan your physical cards to register them.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inventory.map((card, idx) => {
                const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                return (
                  <div key={idx} className={`flex items-center gap-2 p-3 rounded-xl border ${card.contaminated ? 'bg-rose-500/10 border-rose-500/30' : ct.bg}`}>
                    <span className="text-2xl">{ct.emoji}</span>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${ct.color}`}>{ct.label}</p>
                      {card.contaminated && <p className="text-xs text-rose-400 font-mono">☣️ infected</p>}
                      <p className="text-xs font-mono truncate" style={{ color: '#454D3E' }}>{card.code}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GameScreen;
