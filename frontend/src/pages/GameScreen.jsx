import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Shield, Skull, Timer, Package, Camera, X, Zap, AlertTriangle,
         ChevronRight, ChevronLeft, Info, HelpCircle, Target, CheckCircle2,
         Users } from 'lucide-react';
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

// ── Module slides (7 per module, index 0–6) ───────────────────────────────────
const MODULE_SLIDES = {
  module_1: [
    {
      type: 'story',
      emoji: '🌍',
      title: 'An Apocalyptic World',
      text: 'We are in an apocalyptic world. Everything is falling apart, zombies are getting closer every day, and the only way to get what you need is through trading…',
    },
    {
      type: 'info',
      emoji: '📦',
      title: 'Take the Cards',
      text: 'We are now going to play a trading game.\nStart by opening the box and taking the cards.',
    },
    {
      type: 'info',
      emoji: '🃏',
      title: 'Shuffle & Distribute',
      text: 'Shuffle the cards and distribute 4 cards to each player.\nKeep your cards secret — your information should always stay private!',
    },
    {
      type: 'items',
      emoji: '🎴',
      title: 'The 5 Items',
      text: 'These are the 5 possible items:',
    },
    {
      type: 'scan',
      emoji: '📱',
      title: 'Scan Your Cards',
      text: 'Scan your cards by pointing the camera at the QR code.\nThe scanned cards will appear below.',
    },
    {
      type: 'objectives',
      emoji: '🎯',
      title: 'Your Objectives',
      text: 'Your objective is to acquire the following cards.\nTry to be the first to finish — you will be ranked.',
    },
    {
      type: 'final',
      emoji: '⏱️',
      title: 'Round 1 Begins!',
      text: 'The first round will start. You have 3 minutes to trade with one other player.\n⚠️ ATTENTION: Do ONLY one trade.\nClick "Ready!" when you finish before the timer.',
    },
  ],
  module_2: [
    {
      type: 'story',
      emoji: '🧟',
      title: 'The Zombies Are Here',
      text: 'The zombies have now infiltrated everywhere, and they are trying to infect you. Infected traded items will turn you into a zombie in no time.\nWill you survive?',
    },
    {
      type: 'info',
      emoji: '🃏',
      title: 'Same Rules Apply',
      text: 'The trading rules are the same as in the last module.\nFirst, distribute 4 cards to each player.',
    },
    {
      type: 'scan',
      emoji: '📱',
      title: 'Scan Your Cards',
      text: 'Scan your cards. Keep them secret — your information should always stay private!',
    },
    {
      type: 'info',
      emoji: '☣️',
      title: 'The Big Difference',
      text: 'There are zombies among you, and their objective is to infect survivors with contaminated items.\nSurvivors must trade to acquire their objective cards.\nZombies must trade to infect survivors.',
    },
    {
      type: 'info',
      emoji: '🦠',
      title: 'How Infection Works',
      text: 'You will know that you are infected by scanning your traded card at the end of a round.\nIf you are infected, you will start the next round as a zombie.',
    },
    {
      type: 'role',
      emoji: '🎭',
      title: 'Your Role',
      text: 'Your role is an ABSOLUTE secret. Do not show or tell anyone who you are!',
    },
    {
      type: 'final',
      emoji: '⏭️',
      title: 'Skip Round Rules',
      text: 'If you are unsure about trading with someone and there is no other option, you may skip the round.\nZombies can trade among themselves if necessary, but no points are counted for this.\n⚠️ ATTENTION: You can skip only one trade per game!',
    },
  ],
  module_3: [
    {
      type: 'story',
      emoji: '🧠',
      title: 'A Curious Discovery',
      text: 'Zombie brains are deteriorating, and they have great difficulty remembering information after a few hours…\n\nThe survivors now know how to spot the zombies:\n\nPasswords.',
    },
    {
      type: 'scan',
      emoji: '🃏',
      title: 'Same Trading Rules',
      text: 'Trading works like in the last modules:\nShuffle the cards and distribute 4 cards to each player, then scan them.',
    },
    {
      type: 'info',
      emoji: '🎭',
      title: 'Roles & Objectives',
      text: 'Roles are still secret.\nSurvivors must trade to complete their objectives.\nZombies must trade to infect survivors.',
    },
    {
      type: 'info',
      emoji: '🔑',
      title: 'Passwords Are New!',
      text: 'Along with their role, survivors will now receive a password.\n\nExample: Cat\n\nSurvivors must identify each other using hints about the password.',
    },
    {
      type: 'info',
      emoji: '🤫',
      title: 'Never Say It Out Loud',
      text: 'Passwords must NEVER be spoken out loud!\nZombies are everywhere… and they can hear you!\nA revealed password cannot protect anyone!',
    },
    {
      type: 'hints',
      emoji: '💬',
      title: 'Hint Examples',
      lines: [
        { ok: true,  text: '"Do you have some clothes? I really love fluffy things."' },
        { ok: false, text: '"Can I have food for my CAT?" ← NEVER say this' },
        { ok: true,  text: '"Do you have medicine? I can write the name for you."' },
        { ok: false, text: '"Do you have tools? I must fix my KEYBOARD." ← NEVER say this' },
      ],
    },
    {
      type: 'final',
      emoji: '🧟',
      title: 'Beware of Deception',
      text: 'Zombies will try to make you believe they know the password.\nThe more obvious you are, the easier it is for zombies to discover it.\n\nRemember: Your biggest defense is making the right choice.\nIf something feels off — it probably is.',
    },
  ],
};
MODULE_SLIDES.normal = MODULE_SLIDES.module_3;

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
    { emoji: '⏭️', label: 'Skip Round',desc: 'Once per game: skip a trade round.' },
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
          <p className="text-slate-300 mb-1">You received a contaminated card.</p>
          <p className="text-slate-500 text-sm mb-4">You are now a Zombie. Act normal and try to infect a survivor next round.</p>
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

// ── Instruction Slide Renderer ─────────────────────────────────────────────────
function SlideContent({ slide, playerState, inventory, objectives }) {
  if (!slide) return null;
  const { type, emoji, title, text, lines } = slide;

  if (type === 'items') {
    return (
      <div className="text-center">
        <div className="text-7xl mb-6 animate-zw-float">{emoji}</div>
        <h2 className="text-3xl font-black text-white mb-3">{title}</h2>
        <p className="text-slate-400 mb-6">{text}</p>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(CARD_TYPES).filter(([k]) => k !== 'unknown').map(([key, ct]) => (
            <div key={key} className={`flex flex-col items-center gap-1 p-3 rounded-2xl border ${ct.bg}`}>
              <span className="text-3xl">{ct.emoji}</span>
              <span className={`text-xs font-bold ${ct.color}`}>{ct.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'objectives') {
    return (
      <div className="text-center">
        <div className="text-7xl mb-6 animate-zw-float">{emoji}</div>
        <h2 className="text-3xl font-black text-white mb-3">{title}</h2>
        {text.split('\n').map((line, i) => <p key={i} className="text-slate-400 mb-1">{line}</p>)}
        <div className="mt-5 space-y-3 text-left">
          {objectives.length === 0 ? (
            <p className="text-slate-600 text-sm text-center italic">Objectives will appear here after you scan your cards.</p>
          ) : objectives.map((type, i) => {
            const ct = CARD_TYPES[type] || CARD_TYPES.unknown;
            const owned = inventory.some(c => c.type === type);
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${owned ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/60 border-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ct.emoji}</span>
                  <span className={`font-bold ${owned ? 'text-emerald-300' : 'text-slate-200'}`}>{ct.label}</span>
                </div>
                {owned ? <CheckCircle2 size={20} className="text-emerald-400" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-600" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === 'role') {
    const isZombie = playerState?.role === 'zombie';
    const cfg = isZombie
      ? { emoji: '🧟', label: 'ZOMBIE',   color: '#d97559', bg: 'rgba(80,30,20,0.6)', border: 'rgba(217,117,89,0.4)' }
      : { emoji: '🛡️', label: 'SURVIVOR', color: '#a8c4a0', bg: 'rgba(30,50,35,0.6)', border: 'rgba(168,196,160,0.4)' };
    return (
      <div className="text-center">
        <div className="text-7xl mb-5 animate-zw-float">{cfg.emoji}</div>
        <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>Your Role Is</p>
        <h2 className="text-5xl font-black mb-5 uppercase" style={{ color: cfg.color }}>{cfg.label}</h2>
        <div className="rounded-2xl p-4 mb-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <p className="text-slate-200 font-semibold text-lg">{text}</p>
        </div>
      </div>
    );
  }

  if (type === 'hints') {
    return (
      <div className="text-center">
        <div className="text-7xl mb-5 animate-zw-float">{emoji}</div>
        <h2 className="text-3xl font-black text-white mb-5">{title}</h2>
        <div className="space-y-3 text-left">
          {lines.map((line, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${line.ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
              <span className="text-lg flex-shrink-0">{line.ok ? '✅' : '❌'}</span>
              <p className={`text-sm leading-relaxed ${line.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{line.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'story') {
    return (
      <div className="text-center">
        <div className="text-8xl mb-8 animate-zw-float">{emoji}</div>
        <h2 className="text-3xl font-black mb-6" style={{ color: '#AD9E97' }}>{title}</h2>
        <div className="rounded-2xl p-6" style={{ background: 'rgba(56,44,37,0.4)', border: '1px solid rgba(109,113,98,0.2)' }}>
          {text.split('\n').map((line, i) => <p key={i} className="text-slate-300 text-lg leading-relaxed">{line}</p>)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-8xl mb-8 animate-zw-float">{emoji}</div>
      <h2 className="text-3xl font-black text-white mb-5">{title}</h2>
      <div className="space-y-1">
        {text.split('\n').map((line, i) => <p key={i} className="text-slate-300 text-lg leading-relaxed">{line}</p>)}
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
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showInitialScanner, setShowInitialScanner] = useState(false);
  const [showInfectionAlert, setShowInfectionAlert] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [eduContext, setEduContext] = useState(null);
  const [loading, setLoading] = useState(!mockData);
  const [isDoneTrading, setIsDoneTrading] = useState(false);
  const [hasSkippedTrade, setHasSkippedTrade] = useState(false);
  const [localSlideReady, setLocalSlideReady] = useState(false);
  const [initialScanCount, setInitialScanCount] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [objectives, setObjectives] = useState([]);

  const gameModeRef = useRef('module_1');

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
      gameModeRef.current = data.game_mode || 'module_1';
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
    if (lastMessage.type === 'GAME_STARTED') { fetchState(); }
    if (lastMessage.type === 'SLIDE_ADVANCED') { setLocalSlideReady(false); fetchState(); }
    if (lastMessage.type === 'PLAYER_READY') { fetchState(); }
    if (lastMessage.type === 'PHASE_CHANGED') { fetchState(); }
    if (lastMessage.type === 'PLAYER_INFECTED' && lastMessage.player_id === playerData?.id) {
      setShowInfectionAlert(true);
      setPlayerState(p => ({ ...p, role: 'zombie', is_infected: true }));
      playSFX('infected');
    }
    if (lastMessage.type === 'ROUND_STARTED') {
      setIsDoneTrading(false);
      const mode = gameModeRef.current;
      if (mode === 'module_3' || mode === 'normal') setShowRoleReveal(true);
      fetchState();
    }
    if (lastMessage.type === 'ROUND_ENDED' || lastMessage.type === 'GAME_ENDED') {
      fetchState();
    }
  }, [lastMessage, playerData?.id, fetchState, playSFX]);

  const handleSlideReady = async () => {
    if (localSlideReady || mockData) { setLocalSlideReady(true); return; }
    setLocalSlideReady(true);
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/slide_ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id }),
      });
      fetchState();
    } catch (e) { console.error(e); setLocalSlideReady(false); }
  };

  const handleInitialScan = async (cardCode) => {
    setShowInitialScanner(false);
    setScanFeedback({ status: 'scanning' });
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
  const gameMode = gameState?.game_mode || mockData?.gameState?.game_mode || 'module_1';
  const statusColor = isZombie ? '#d97559' : '#a8c4a0';
  const statusEmoji = isZombie ? '🧟' : '🛡️';
  const statusLabel = isZombie ? 'Zombie' : 'Survivor';
  const otherZombies = gameState?.players?.filter(p => p.is_infected && p.id !== playerData?.id) || [];

  // ── Full-screen synchronized instruction slides ───────────────────────────
  if (gamePhase === 'module_instructions') {
    const slides = MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1;
    const slideIndex = mockData ? 0 : (gameState?.instruction_slide ?? 0);
    const slide = slides[Math.min(slideIndex, slides.length - 1)];
    const isLast = slideIndex >= slides.length - 1;
    const isScanSlide = slide?.type === 'scan';
    const scanDone = initialScanCount >= 4;

    const readyCount = gameState?.ready_count ?? 0;
    const totalPlayers = gameState?.players?.length ?? 1;
    const notReady = gameState?.not_ready ?? [];

    const meIsReady = localSlideReady || (gameState?.players?.find(p => p.id === playerData?.id)?.is_ready ?? false);

    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 px-4 overflow-y-auto py-8">
        {showInitialScanner && (
          <QRScannerModal
            onScan={handleInitialScan}
            onClose={() => setShowInitialScanner(false)}
            title="Scan Starting Card"
            hint="Point at your physical card's QR code. Scan all 4 starting cards."
          />
        )}

        <div className="w-full max-w-lg">
          {/* Progress pills */}
          <div className="flex justify-center gap-1.5 mb-8">
            {slides.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${
                slideIndex === idx ? 'bg-cyan-400 w-8' :
                slideIndex > idx ? 'bg-slate-600 w-4' : 'bg-slate-800 w-4'
              }`} />
            ))}
          </div>

          {/* Slide content */}
          <SlideContent
            slide={slide}
            playerState={playerState}
            inventory={inventory}
            objectives={objectives}
          />

          {/* Scan UI (embedded in scan slide) */}
          {isScanSlide && (
            <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-300 font-bold text-sm">Scanning Progress</span>
                <span className="font-black text-lg" style={{ color: scanDone ? '#a8c4a0' : '#AD9E97' }}>{initialScanCount}/4</span>
              </div>
              <div className="flex gap-2 mb-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`flex-1 h-2.5 rounded-full transition-all ${i < initialScanCount ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                ))}
              </div>

              {/* Scanned card mini-inventory */}
              {inventory.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {inventory.slice(0, 4).map((card, idx) => {
                    const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                    return (
                      <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border text-sm ${ct.bg}`}>
                        <span className="text-xl">{ct.emoji}</span>
                        <span className={`font-semibold ${ct.color}`}>{ct.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {scanFeedback && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 mb-3 ${scanFeedback.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : scanFeedback.status === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-300'}`}>
                  {scanFeedback.status === 'success' && <><Zap size={16} /> {(CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown).emoji} Scanned!</>}
                  {scanFeedback.status === 'error' && <><AlertTriangle size={16} /> {scanFeedback.message}</>}
                  {scanFeedback.status === 'scanning' && <><Camera size={16} /> Verifying...</>}
                </div>
              )}

              {scanDone ? (
                <div className="text-center py-2">
                  <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-emerald-400 font-black text-sm">All 4 cards scanned!</p>
                  <p className="text-slate-500 text-xs animate-pulse mt-0.5">Waiting for other players to finish scanning…</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowInitialScanner(true)}
                  className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg, #454D3E, #6D7162)' }}
                >
                  <Camera size={20} /> Scan Card {initialScanCount + 1} of 4
                </button>
              )}
            </div>
          )}

          {/* Navigation / Next button */}
          {!isScanSlide && (
            <div className="mt-8">
              {meIsReady ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle2 size={20} className="text-cyan-400" />
                    <span className="text-cyan-400 font-bold">You're ready!</span>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.2)' }}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users size={14} style={{ color: '#6D7162' }} />
                      <span className="text-xs font-mono" style={{ color: '#6D7162' }}>
                        {readyCount}/{totalPlayers} players ready
                      </span>
                    </div>
                    {notReady.length > 0 && (
                      <p className="text-xs text-slate-600 text-center">
                        Waiting for: {notReady.join(', ')}…
                      </p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {Array.from({ length: totalPlayers }).map((_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full ${i < readyCount ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSlideReady}
                  className="w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={isLast
                    ? { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 0 30px rgba(6,182,212,0.25)', color: '#fff' }
                    : { background: '#a8c4a0', color: '#0f1a0e' }
                  }
                >
                  {isLast ? <><CheckCircle2 size={22} /> I'm Ready!</> : <>Next <ChevronRight size={22} /></>}
                </button>
              )}
            </div>
          )}
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
                  <div key={idx} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${owned ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-800/40'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{ct.emoji}</span>
                      <span className={`font-bold text-sm ${owned ? 'text-emerald-300' : 'text-slate-300'}`}>{ct.label}</span>
                    </div>
                    {owned ? <CheckCircle2 size={18} className="text-emerald-400" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-600" />}
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

        {/* ── Zombie Objective ────────────────────────────────────────────── */}
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
              {scanFeedback.status === 'success' && (() => { const ct = CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown; return `${ct.emoji} ${ct.label} scanned!`; })()}
              {scanFeedback.status === 'error' && scanFeedback.message}
              {scanFeedback.status === 'scanning' && 'Verifying…'}
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
