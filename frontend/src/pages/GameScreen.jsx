import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Shield, Skull, Timer, Package, Camera, X, Zap, AlertTriangle, ChevronRight, Info } from 'lucide-react';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useAudio } from '../hooks/useAudio';
import AudioToggle from '../components/AudioToggle';
import EduPopup from '../components/EduPopup';

import { API_URLS } from '../services/api';


// ─── Role Reveal ──────────────────────────────────────────────────────────────
function RoleReveal({ role, secretWord, gameMode, onContinue }) {
  const isZombie = role === 'zombie';
  const isFirewall = role === 'firewall';
  const isAnalyst = role === 'analyst';

  const roleConfig = {
    zombie:   { emoji: '🧟', label: 'Zombie',   color: '#d97559', border: 'rgba(217,117,89,0.5)', glow: 'rgba(217,117,89,0.3)', desc: 'Infect survivors by getting them to scan items you\'ve touched. Spread the malware!' },
    survivor: { emoji: '🛡️', label: 'Survivor', color: '#a8c4a0', border: 'rgba(168,196,160,0.5)', glow: 'rgba(168,196,160,0.25)', desc: 'Trade items, verify your contacts, and protect the password from zombies.' },
    firewall: { emoji: '🔥', label: 'Firewall', color: '#60b8d4', border: 'rgba(96,184,212,0.5)', glow: 'rgba(96,184,212,0.25)', desc: 'Your special role blocks one infection attempt automatically. Use it wisely.' },
    analyst:  { emoji: '🔍', label: 'Analyst',  color: '#c4a8d4', border: 'rgba(196,168,212,0.5)', glow: 'rgba(196,168,212,0.25)', desc: 'When you scan an item, you can see if the previous holder was infected. Investigate!' },
  };
  const cfg = roleConfig[role] || roleConfig.survivor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.97)' }}>
      <div className="relative text-center max-w-sm w-full px-6">
        <div className="absolute inset-0 rounded-3xl blur-3xl opacity-25 scale-75" style={{ background: cfg.glow }} />
        <div className="relative glass-panel p-8 rounded-3xl" style={{ border: `2px solid ${cfg.border}` }}>
          <div className="text-8xl mb-5 animate-zw-float">{cfg.emoji}</div>

          <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>Your Role</p>
          <h1 className="text-5xl font-black mb-2 uppercase" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
            {cfg.label}
          </h1>

          <div className={`inline-block text-xs px-3 py-1 rounded-full font-mono mb-5 mode-${gameMode || 'normal'}`}>
            {gameMode?.toUpperCase()} MODE
          </div>

          {!isZombie && secretWord && (
            <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(56,44,37,0.7)', border: '1px solid rgba(168,196,160,0.3)' }}>
              <p className="text-xs uppercase tracking-widest mb-1 font-mono" style={{ color: '#a8c4a0' }}>🔑 Secret Password (Authentication)</p>
              <p className="text-3xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{secretWord}</p>
              <p className="text-slate-500 text-xs mt-1">Never share this with someone you haven't verified.</p>
            </div>
          )}

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{cfg.desc}</p>

          <button
            onClick={onContinue}
            className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`, boxShadow: `0 0 20px ${cfg.glow}` }}
          >
            Enter the Field <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Infection Alert ──────────────────────────────────────────────────────────
function InfectionAlert({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(80,20,15,0.85)' }}>
      <div className="relative text-center max-w-xs w-full px-6">
        <div className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse" style={{ background: 'rgba(217,117,89,0.6)' }} />
        <div className="relative glass-panel p-8 rounded-3xl animate-zw-shake" style={{ border: '2px solid #d97559' }}>
          <div className="text-7xl mb-4 animate-bounce">🧟</div>
          <h2 className="text-4xl font-black mb-2" style={{ color: '#d97559', textShadow: '0 0 20px rgba(217,117,89,0.8)' }}>INFECTED!</h2>
          <p className="text-slate-300 mb-1">Malware transferred.</p>
          <p className="text-slate-500 text-sm mb-1">You received a file from an infected source.</p>
          <p className="text-xs font-mono mb-6" style={{ color: '#795846' }}>💡 This is how ransomware spreads via email attachments.</p>
          <button onClick={onDismiss} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: '#795846' }}>
            Accept Fate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Banner ─────────────────────────────────────────────────────────────
function EventBanner({ event, onDismiss }) {
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [event, onDismiss]);
  if (!event) return null;
  return (
    <div className="fixed top-4 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-3 animate-zw-slide" style={{ background: 'rgba(56,44,37,0.95)', border: '1px solid rgba(173,158,151,0.3)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="text-3xl">{event.title.split(' ')[0]}</div>
      <div className="flex-1">
        <p className="font-black" style={{ color: '#AD9E97' }}>{event.title.replace(/^\S+\s/, '')}</p>
        <p className="text-sm text-slate-400">{event.desc}</p>
      </div>
      <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
    </div>
  );
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScannerModal({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => { try { onScan(JSON.parse(text)); } catch { setError('Invalid QR format.'); } },
      () => {}
    ).catch((e) => setError('Camera denied: ' + e));
    return () => scanner.stop().catch(() => {});
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.92)' }}>
      <div className="relative rounded-3xl p-6 max-w-sm w-full mx-4" style={{ background: 'rgba(42,38,34,0.95)', border: '1px solid rgba(109,113,98,0.4)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={24} /></button>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <Camera size={20} style={{ color: '#795846' }} /> Scan Item Card
        </h3>
        <p className="text-slate-500 text-sm mb-4">Point at a physical item card's QR code. Each scan verifies the item — like checking a file's digital signature.</p>
        {error ? (
          <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(217,117,89,0.1)', border: '1px solid rgba(217,117,89,0.3)', color: '#d97559' }}>{error}</div>
        ) : (
          <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(109,113,98,0.3)', minHeight: 280 }} />
        )}
      </div>
    </div>
  );
}

// ─── Timer Bar ────────────────────────────────────────────────────────────────
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
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: urgent ? 'linear-gradient(90deg,#795846,#d97559)' : 'linear-gradient(90deg,#454D3E,#6D7162)' }}
        />
      </div>
    </div>
  );
}

// ─── Step Hint ────────────────────────────────────────────────────────────────
const HINTS = [
  { icon: '🔑', text: 'The password = authentication token. Guard it like your login credentials.' },
  { icon: '📦', text: 'Scanning items = downloading files. Always verify the source!' },
  { icon: '🤝', text: 'Trusting someone = granting access. Apply Zero Trust — verify always.' },
  { icon: '🧟', text: 'Infection = malware. One compromised device can infect the whole network.' },
];

// ─── Main GameScreen ──────────────────────────────────────────────────────────
const GameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { groupData, playerData } = location.state || {};

  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [showRoleReveal, setShowRoleReveal] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showInfectionAlert, setShowInfectionAlert] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [eduContext, setEduContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hintIndex, setHintIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDoneTrading, setIsDoneTrading] = useState(false);
  const [hasSkippedTrade, setHasSkippedTrade] = useState(false);

  const { playSFX, toggle, isEnabled } = useAudio();
  const { lastMessage } = useGameWebSocket(groupData?.group_id, playerData?.id);

  // Rotate hints every 12s
  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % HINTS.length), 12000);
    return () => clearInterval(id);
  }, []);

  const fetchState = useCallback(async () => {
    if (!groupData?.group_id) return;
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/state`);
      const data = await res.json();
      setGameState(data);
      const me = data.players?.find((p) => p.id === playerData?.id);
      if (me) setPlayerState(me);
      // Navigate to EndGame if state is end_game
      if (data.game_state === 'end_game') {
        navigate('/endgame', { state: { groupId: groupData.group_id } });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [groupData?.group_id, playerData?.id, navigate]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 10000);
    return () => clearInterval(id);
  }, [fetchState]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'GAME_STARTED') {
      if (lastMessage.event) setActiveEvent(lastMessage.event);
      fetchState();
      playSFX('role_reveal');
    }
    if (lastMessage.type === 'PLAYER_INFECTED' && lastMessage.player_id === playerData?.id) {
      setShowInfectionAlert(true);
      setPlayerState((p) => ({ ...p, role: 'zombie', is_infected: true }));
      playSFX('infected');
    }
    if (lastMessage.type === 'GAME_ENDED') {
      fetchState();
    }
    if (lastMessage.type === 'ROUND_STARTED' || lastMessage.type === 'ROUND_ENDED') {
      if (lastMessage.type === 'ROUND_STARTED') setIsDoneTrading(false);
      fetchState();
    }
  }, [lastMessage, playerData?.id, fetchState, playSFX]);

  const handleFinishInstructions = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/finish_instructions`, { method: 'POST' });
    } catch (e) { console.error(e); }
  };

  const handleFinishRound = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/finish_round`, { method: 'POST' });
    } catch (e) { console.error(e); }
  };

  const handleDoneTrading = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/trade_done`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id })
      });
      setIsDoneTrading(true);
    } catch (e) { console.error(e); }
  };

  const handleSkipTrade = async () => {
    if (hasSkippedTrade) return;
    if (!window.confirm("You can only use Skip Trade ONCE per game. Use it now?")) return;
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/skip_trade`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id })
      });
      setHasSkippedTrade(true);
      setIsDoneTrading(true);
    } catch (e) { console.error(e); }
  };

  const handleNextRound = async () => {
    try {
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/next_round`, { method: 'POST' });
      setPlayerState(prev => ({...prev, isReadyForNext: true}));
    } catch (e) { console.error(e); }
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

      setInventory((prev) => {
        if (prev.find((i) => i.id === item.id)) return prev;
        return [{ ...item, scannedAt: new Date().toLocaleTimeString() }, ...prev];
      });

      if (data.edu) setEduContext(data.edu);

      if (data.infected) {
        setShowInfectionAlert(true);
        setPlayerState((p) => ({ ...p, role: 'zombie', is_infected: true }));
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

  if (!groupData || !playerData) {
    return (
      <div className="p-8 text-center rounded-xl max-w-md mx-auto mt-12" style={{ background: 'rgba(121,88,70,0.1)', border: '1px solid rgba(121,88,70,0.3)', color: '#d97559' }}>
        <p>No game data found.</p>
        <button onClick={() => navigate('/join')} className="mt-4 underline">Join a game</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-zw-float">🧟</div>
          <p className="font-mono animate-pulse" style={{ color: '#6D7162' }}>Connecting to the field…</p>
        </div>
      </div>
    );
  }

  const isZombie = playerState?.role === 'zombie';
  const isFirewall = playerState?.role === 'firewall';
  const isAnalyst = playerState?.role === 'analyst';
  const gamePhase = gameState?.game_state || 'lobby';
  const gameMode = gameState?.game_mode || 'normal';

  const phaseLabel = {
    module_instructions:   '📘 Instructions',
    module_between_rounds: '🛡️ Scanning Phase',
    round_active:     '⚔️ Round Active',
    scan_phase:       '📡 Scan Phase',
    round_transition: '🔄 Transitioning',
    end_game:         '🏁 Game Over',
    lobby:            '⏳ Lobby',
    role_assignment:  '🎭 Roles',
  }[gamePhase] || gamePhase;

  const statusColor = isZombie ? '#d97559' : isFirewall ? '#60b8d4' : isAnalyst ? '#c4a8d4' : '#a8c4a0';
  const statusEmoji = isZombie ? '🧟' : isFirewall ? '🔥' : isAnalyst ? '🔍' : '🛡️';
  const statusLabel = isZombie ? 'Zombie' : isFirewall ? 'Firewall' : isAnalyst ? 'Analyst' : 'Survivor';

  const hint = HINTS[hintIndex];

  const MODULE_SLIDES = {
    module_1: [
      { emoji: '🌐', title: 'Trading Hub', text: 'Welcome to the network! Today we learn how to share data safely.' },
      { emoji: '🤝', title: 'Data Transfer', text: 'In this simulation, data is shared physically using your Item Cards. Find other players around the room!' },
      { emoji: '🚫', title: 'No Scanners Yet', text: 'Trade cards with other people face-down. Do NOT use your digital scanner until the round is completely over and you return to your seat!' }
    ],
    module_2: [
      { emoji: '⚠️', title: 'The Infection', text: 'Warning! A rogue virus has breached the network.' },
      { emoji: '🧟', title: 'Malware Spread', text: 'Some players are now Zombies (Malware). Their goal is to spread the infection by touching your item cards before you trade them.' },
      { emoji: '📱', title: 'Contamination', text: 'If you log an item using your digital scanner that a Zombie previously touched, your device gets infected too!' },
      { emoji: '🗣️', title: 'No Security', text: 'There are no passwords to protect you. Try to figure out who is infected by talking to people before swapping cards!' }
    ],
    module_3: [
      { emoji: '🔒', title: 'Authentication', text: 'We need better security to stop the virus! We have deployed Authentication.' },
      { emoji: '🔑', title: 'Secret Passwords', text: 'Survivors now have a Secret Password on their screens. Zombies do not have this password!' },
      { emoji: '🛑', title: 'Zero Trust', text: 'Before trading items with anyone, ask them for the password. If they don\'t know it, they are Malware trying to infect you!' }
    ]
  };

  if (gamePhase === 'module_instructions') {
    const slides = MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1;
    const slide = slides[currentSlide];
    const isLast = currentSlide === slides.length - 1;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-in fade-in flex-1">
        <div className="glass-panel p-8 max-w-lg w-full text-center rounded-3xl relative overflow-hidden" style={{ border: '1px solid rgba(109,113,98,0.4)' }}>
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, idx) => (
              <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-cyan-500 scale-125' : 'bg-slate-700'}`} />
            ))}
          </div>

          <div className="text-7xl mb-6 animate-zw-float">{slide.emoji}</div>
          <h2 className="text-3xl font-black mb-4 h-10" style={{ color: '#AD9E97' }}>{slide.title}</h2>
          
          <div className="text-center text-slate-300 mb-10 h-28 flex items-center justify-center text-lg leading-relaxed">
            <p>{slide.text}</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setCurrentSlide(p => Math.max(0, p - 1))}
              disabled={currentSlide === 0}
              className={`py-4 px-6 rounded-xl font-bold transition-all ${currentSlide === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95 bg-slate-800'}`}
              style={{ flex: 1 }}
            >
              Back
            </button>

            {isLast ? (
              <button 
                onClick={handleFinishInstructions}
                className="py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                style={{ flex: 2, background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}
              >
                Start Round 1
              </button>
            ) : (
              <button 
                onClick={() => setCurrentSlide(p => Math.min(slides.length - 1, p + 1))}
                className="py-4 rounded-xl font-bold text-slate-900 text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ flex: 2, background: '#a8c4a0' }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate if round timer hit 0
  const isTimeUp = gamePhase === 'round_active' && gameState?.round_end_time && (gameState.round_end_time - Math.floor(Date.now() / 1000)) <= 0;
  const showScanButton = gamePhase !== 'round_active' || (gameMode !== 'module_1' && gameMode !== 'module_2' && gameMode !== 'module_3');

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
      {showScanner && <QRScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {activeEvent && <EventBanner event={activeEvent} onDismiss={() => setActiveEvent(null)} />}

      {eduContext && <EduPopup edu={eduContext} onDismiss={() => setEduContext(null)} />}

      <AudioToggle toggle={toggle} isEnabled={isEnabled} />

      <div className="max-w-lg mx-auto py-4 px-2 animate-zw-fade">
        {/* Status Bar */}
        <div className="rounded-2xl p-4 mb-3 flex items-center justify-between" style={{ background: `rgba(${isZombie ? '80,30,20' : '40,55,40'},0.5)`, border: `1px solid ${statusColor}44` }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusEmoji}</span>
            <div>
              <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#6D7162' }}>Status</p>
              <p className="text-xl font-black uppercase" style={{ color: statusColor }}>{statusLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono mode-${gameMode}`}>{gameMode.toUpperCase()}</span>
            <p className="text-xs mt-1 font-mono" style={{ color: '#6D7162' }}>{phaseLabel}</p>
          </div>
        </div>

        {/* Timer */}
        {gameState?.round_end_time && gamePhase === 'round_active' && (
          <TimerBar endTime={gameState.round_end_time} label="Round Timer" />
        )}
        {gameState?.scan_end_time && gamePhase === 'scan_phase' && (
          <TimerBar endTime={gameState.scan_end_time} label="Scan Phase" />
        )}

        {/* Password / Objective panel */}
        {!isZombie && gameState?.secret_word && (
          <div className="rounded-2xl p-5 mb-3 relative overflow-hidden" style={{ background: 'rgba(40,55,40,0.4)', border: '1px solid rgba(168,196,160,0.25)' }}>
            <p className="text-xs uppercase tracking-widest mb-1 font-mono flex items-center gap-1" style={{ color: '#a8c4a0' }}>
              <Shield size={12} /> Authentication Password
            </p>
            <p className="text-4xl font-black tracking-widest font-mono mb-1" style={{ color: '#a8c4a0' }}>
              {gameState.secret_word}
            </p>
            <p className="text-xs" style={{ color: '#6D7162' }}>Round {gameState.current_round} · Never share with unverified agents</p>
          </div>
        )}

        {isZombie && (
          <div className="rounded-2xl p-5 mb-3" style={{ background: 'rgba(80,30,20,0.4)', border: '1px solid rgba(121,88,70,0.3)' }}>
            <p className="text-xs uppercase tracking-widest mb-1 font-mono flex items-center gap-1" style={{ color: '#795846' }}>
              <Skull size={12} /> Malware Objective
            </p>
            <p className="text-slate-300 text-sm">Spread the infection. Get survivors to scan items you've previously held.</p>
          </div>
        )}

        {/* Scan Button (Hidden during Module round_active) */}
        {showScanButton ? (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-5 rounded-2xl font-black text-white text-xl flex items-center justify-center gap-3 mb-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isZombie
                ? 'linear-gradient(135deg, #795846, #d97559)'
                : 'linear-gradient(135deg, #454D3E, #6D7162)',
              boxShadow: `0 0 30px ${isZombie ? 'rgba(217,117,89,0.25)' : 'rgba(109,113,98,0.25)'}`,
            }}
          >
            <Camera size={28} /> SCAN ITEM
          </button>
        ) : (
          <div className="text-center p-6 mb-3 rounded-2xl" style={{ border: '2px dashed rgba(109,113,98,0.4)', background: 'rgba(56,44,37,0.4)' }}>
            <div className="text-4xl mb-2 animate-bounce">🤝</div>
            <p className="font-bold text-lg" style={{ color: '#AD9E97' }}>Go Trade Physical Cards!</p>
            <p className="text-slate-500 text-sm">Scanner disabled until the round is over.</p>
            
            {!isDoneTrading ? (
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleDoneTrading} 
                  className="flex-1 py-3 bg-emerald-600/80 text-white font-bold rounded-xl active:scale-95 transition-all text-sm"
                >
                  Done Trading
                </button>
                <button 
                  onClick={handleSkipTrade} 
                  disabled={hasSkippedTrade}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all text-sm ${hasSkippedTrade ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-600/80 text-white active:scale-95'}`}
                >
                  Skip Trade (1x)
                </button>
              </div>
            ) : (
              <p className="text-emerald-400 font-bold mt-4 animate-pulse">Waiting for others to finish...</p>
            )}

            {isTimeUp && (
              <button onClick={handleFinishRound} className="mt-4 w-full py-3 bg-cyan-600 text-white font-bold rounded-xl animate-pulse">
                Time is up! End Round
              </button>
            )}
          </div>
        )}

        {/* Between Rounds UI */}
        {gamePhase === 'module_between_rounds' && (
          <div className="mb-4 glass-panel p-4 rounded-2xl text-center">
            <h3 className="font-black text-xl mb-2" style={{ color: '#AD9E97' }}>
              {gameState?.current_round === 0 ? "Initial Scan Phase" : `Round ${gameState?.current_round} Complete!`}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {gameState?.current_round === 0 ? "Scan your starting cards before the first round begins." : "Scan all the items you collected during this round."}
            </p>
            <button 
              onClick={handleNextRound}
              className="w-full py-3 rounded-xl font-bold text-slate-900 transition-all"
              style={{ background: '#a8c4a0' }}
            >
               I'm Ready for {gameState?.current_round >= 3 ? "Game Over" : "Next Round"}
            </button>
          </div>
        )}

        {/* Scan Feedback */}
        {scanFeedback && (
          <div
            className="rounded-2xl p-4 mb-3 flex items-center gap-3 animate-zw-slide"
            style={{
              background: scanFeedback.status === 'success'
                ? 'rgba(40,55,40,0.5)' : scanFeedback.status === 'error'
                ? 'rgba(80,30,20,0.5)' : 'rgba(50,50,60,0.5)',
              border: `1px solid ${scanFeedback.status === 'success' ? 'rgba(168,196,160,0.3)' : scanFeedback.status === 'error' ? 'rgba(217,117,89,0.3)' : 'rgba(109,113,98,0.3)'}`,
            }}
          >
            {scanFeedback.status === 'success' && <Zap size={18} style={{ color: '#a8c4a0' }} />}
            {scanFeedback.status === 'error' && <AlertTriangle size={18} style={{ color: '#d97559' }} />}
            {scanFeedback.status === 'scanning' && <Camera size={18} style={{ color: '#AD9E97' }} />}
            <p className="text-sm font-semibold text-slate-300">
              {scanFeedback.status === 'success' && `${scanFeedback.item.type} acquired — item verified!`}
              {scanFeedback.status === 'error' && scanFeedback.message}
              {scanFeedback.status === 'scanning' && 'Verifying digital signature…'}
            </p>
          </div>
        )}

        {/* Cybersecurity Hint */}
        <div className="rounded-2xl p-4 mb-3 flex items-start gap-3 transition-all duration-500" style={{ background: 'rgba(56,44,37,0.5)', border: '1px solid rgba(109,113,98,0.2)' }}>
          <Info size={16} className="mt-0.5 shrink-0" style={{ color: '#795846' }} />
          <div>
            <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: '#6D7162' }}>💡 Cybersecurity Insight</p>
            <p className="text-slate-400 text-xs leading-relaxed">{hint.icon} {hint.text}</p>
          </div>
        </div>

        {/* Inventory */}
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
            <Package size={18} style={{ color: '#795846' }} />
            Item Inventory
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(56,44,37,0.7)', color: '#6D7162' }}>
              {inventory.length} items
            </span>
          </h3>
          {inventory.length === 0 ? (
            <p className="text-xs text-center py-4 font-mono" style={{ color: '#454D3E' }}>
              No items scanned yet.<br />Scan physical cards to collect items.
            </p>
          ) : (
            <div className="space-y-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <p className="text-slate-200 font-semibold capitalize text-sm">{item.type}</p>
                      <p className="text-xs font-mono" style={{ color: '#454D3E' }}>{item.id}</p>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: '#454D3E' }}>{item.scannedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GameScreen;
