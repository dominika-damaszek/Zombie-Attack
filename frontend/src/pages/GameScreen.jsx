import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Shield, Skull, Timer, Package, Camera, X, Zap, AlertTriangle,
  ChevronRight, ChevronLeft, Info, HelpCircle, Target, CheckCircle2,
  Users, Globe, Layers, Smartphone, Activity, FastForward, Brain, Key, EyeOff, MessageSquare,
  PinIcon,
  Briefcase,
  HandHelping
} from 'lucide-react';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { useAudio } from '../hooks/useAudio';
import AudioToggle from '../components/AudioToggle';
import EduPopup from '../components/EduPopup';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

// NOTE: `desc` keys are translation IDs resolved at render time via t(key).
// Do NOT call t() at module-load — `t` is not in scope here and would throw.
const CARD_TYPES = {
  security_patch: { label: 'Security Patch', symbol: '../../public/medicine2.png', descKey: 'info_medicine_desc', color: 'text-[var(--neon-green-glow)]/70', bg: 'bg-[var(--neon-green-glow)]/10 border-[var(--neon-green)]', glow: 'shadow-[0_0_15px_var(--neon-green)]' },
  system_boost: { label: 'System Boost', symbol: '../../public/food2.png', descKey: 'info_food_desc', color: 'text-[#eb9844]/80', bg: 'bg-[#eb9844]/20 border-[#f2cfab]', glow: 'shadow-[0_0_15px_#eb9844]' },
  firewall: { label: 'Firewall', symbol: '../../public/gun2.png', descKey: 'info_weapon_desc', color: 'text-[var(--neon-cyan)]/70', bg: 'bg-[var(--neon-cyan-glow)]/20 border-[var(--neon-cyan)]', glow: 'shadow-[0_0_15px_var(--neon-cyan)]' },
  security_layer: { label: 'Security Layer', symbol: '../../public/clothing12.png', descKey: 'info_clothing_desc', color: 'text-[#e2bdfe]/70', bg: 'bg-[#bd68fd]/20 border-[#e2bdfe]', glow: 'shadow-[0_0_15px_#e2bdfe]' },
  hacking_tool: { label: 'Hacking Tool', symbol: '../../public/tool3.png', descKey: 'info_tools_desc', color: 'text-[#b8708b]/90', bg: 'bg-[#a75373]/30 border-[#ddbbc8]', glow: 'shadow-[0_0_15px_#b8708b]' },
  unknown: { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30', descKey: 'info_unknown_desc', glow: 'shadow-[0_0_15px_slate-500]' },
};

function getCardLabel(key) {
  return CARD_TYPES[key]?.label || 'Unknown';
}

// ── Objective helpers ────────────────────────────────────────────────────────
// The backend may return objectives in two shapes:
//   • Legacy:    ["security_patch", "system_boost", "firewall"]
//                (each entry is one card; max 3 entries)
//   • New:       [{ type: "security_layer", qty: 2 }, { type: "security_patch", qty: 1 }]
//                (count-based; each entry is one *type* with how many copies needed)
// `normalizeObjectives` always returns the new shape, deduped by type.
function normalizeObjectives(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const counts = {};
  for (const entry of raw) {
    if (entry && typeof entry === 'object') {
      const t = entry.type;
      const q = Number(entry.qty) || 0;
      if (t && q > 0) counts[t] = (counts[t] || 0) + q;
    } else if (typeof entry === 'string') {
      counts[entry] = (counts[entry] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([type, qty]) => ({ type, qty }));
}

// Count how many of a type the player owns in their inventory.
function ownedCount(inventory, type) {
  return (inventory || []).filter(c => c.type === type).length;
}

function getModuleSlides(t) {
  return {
    module_1: [
      { type: 'story', icon: Globe, title: t('slide_m1_0_title'), text: t('slide_m1_0_text') },
      { type: 'info', icon: Package, title: t('slide_m1_1_title'), text: t('slide_m1_1_text') },
      { type: 'info', icon: Layers, title: t('slide_m1_2_title'), text: t('slide_m1_2_text') },
      { type: 'items', icon: Layers, title: t('slide_m1_3_title'), text: t('slide_m1_3_text') },
      { type: 'scan', icon: Smartphone, title: t('slide_m1_4_title'), text: t('slide_m1_4_text') },
      { type: 'objectives', icon: Target, title: t('slide_m1_5_title'), text: t('slide_m1_5_text') },
      { type: 'final', icon: Timer, title: t('slide_m1_6_title'), text: t('slide_m1_6_text') },
    ],
    module_2: [
      { type: 'story', icon: Skull, title: t('slide_m2_0_title'), text: t('slide_m2_0_text') },
      { type: 'info', icon: Layers, title: t('slide_m2_1_title'), text: t('slide_m2_1_text') },
      { type: 'scan', icon: Smartphone, title: t('slide_m2_2_title'), text: t('slide_m2_2_text') },
      { type: 'info', icon: Activity, title: t('slide_m2_3_title'), text: t('slide_m2_3_text') },
      { type: 'info', icon: Activity, title: t('slide_m2_4_title'), text: t('slide_m2_4_text') },
      { type: 'role', icon: Users, title: t('slide_m2_5_title'), text: t('slide_m2_5_text') },
      { type: 'final', icon: FastForward, title: t('slide_m2_6_title'), text: t('slide_m2_6_text') },
    ],
    module_3: [
      { type: 'story', icon: Brain, title: t('slide_m3_0_title'), text: t('slide_m3_0_text') },
      { type: 'scan', icon: Layers, title: t('slide_m3_1_title'), text: t('slide_m3_1_text') },
      { type: 'info', icon: Users, title: t('slide_m3_2_title'), text: t('slide_m3_2_text') },
      { type: 'info', icon: Key, title: t('slide_m3_3_title'), text: t('slide_m3_3_text') },
      { type: 'info', icon: EyeOff, title: t('slide_m3_4_title'), text: t('slide_m3_4_text') },
      {
        type: 'hints', icon: MessageSquare, title: t('slide_m3_5_title'), groups: [
          {
            pw: t('slide_m3_5_pw1'), lines: [
              { ok: true, text: t('slide_m3_5_h1') },
              { ok: false, text: t('slide_m3_5_h2') },
            ]
          },
          {
            pw: t('slide_m3_5_pw2'), lines: [
              { ok: true, text: t('slide_m3_5_h3') },
              { ok: false, text: t('slide_m3_5_h4') },
            ]
          },
        ]
      },
      { type: 'final', icon: Skull, title: t('slide_m3_6_title'), text: t('slide_m3_6_text') },
    ],
    // Normal (Full Game) — same slide structure as module_3, only the
    // intro story slide is swapped for a cybersecurity-themed one.
    normal: [
      { type: 'story', icon: Globe, title: t('slide_n0_title'), text: t('slide_n0_text') },
      { type: 'scan', icon: Smartphone, title: t('slide_n1_title'), text: t('slide_n1_text') },
      { type: 'info', icon: Target, title: t('slide_n2_title'), text: t('slide_n2_text') },
      { type: 'info', icon: Key, title: t('slide_n3_title'), text: t('slide_n3_text') },
      { type: 'info', icon: EyeOff, title: t('slide_n4_title'), text: t('slide_n4_text') },
      {
        type: 'hints', icon: MessageSquare, title: t('slide_m3_5_title'), groups: [
          {
            pw: t('slide_m3_5_pw1'), lines: [
              { ok: true, text: t('slide_m3_5_h1') },
              { ok: false, text: t('slide_m3_5_h2') },
            ]
          },
          {
            pw: t('slide_m3_5_pw2'), lines: [
              { ok: true, text: t('slide_m3_5_h3') },
              { ok: false, text: t('slide_m3_5_h4') },
            ]
          },
        ]
      },
      { type: 'final', icon: Zap, title: t('slide_n6_title'), text: t('slide_n6_text') },
    ],
  };
}

function getInfoSections(t) {
  return [
    {
      title: t('game_item_types_title'), items: Object.entries(CARD_TYPES).filter(([k]) => k !== 'unknown').map(([, ct]) => ({
        icon: ct.symbol ? null : Layers, imgUrl: ct.symbol, label: ct.label, desc: t(ct.descKey) || 'Unidentified item. Scan it to reveal what type it is.',
      }))
    },
    {
      title: t('game_roles_title'), items: [
        { label: t('game_survivor'), desc: t('info_survivor_desc'), icon: Shield },
        { label: t('game_zombie'), desc: t('info_zombie_desc'), icon: Skull },
      ]
    },
    {
      title: t('game_mechanics_title'), items: [
        { icon: Key, label: t('info_password'), desc: t('info_password_desc') },
        { icon: Target, label: t('info_objectives'), desc: t('info_objectives_desc') },
        { icon: FastForward, label: t('info_skip_round'), desc: t('info_skip_round_desc') },
      ]
    },
  ];
}

function RoleReveal({ role, secretWord, gameMode, onContinue, t }) {
  const isZombie = role === 'zombie';
  const cfg = isZombie
    ? { label: t('game_zombie'), icon: Skull, color: '#d96259ff', border: 'rgba(217, 98, 89, 0.5)', glow: 'rgba(217, 104, 89, 0.3)', desc: t('game_zombie_desc') }
    : { label: t('game_survivor'), icon: Shield, color: '#a8c4a0', border: 'rgba(168,196,160,0.5)', glow: 'rgba(168,196,160,0.25)', desc: t('game_survivor_desc') };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.97)' }}>
      <div className="relative text-center max-w-sm w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl" style={{ border: `2px solid ${cfg.border}` }}>
          <div className="flex justify-center mb-4 sm:mb-5 animate-zw-float" style={{ color: cfg.color, filter: `drop-shadow(0 0 15px ${cfg.glow})` }}>
            <cfg.icon size={80} />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>{t('game_your_role')}</p>
          <h1 className="text-4xl sm:text-5xl mb-3 sm:mb-4 uppercase" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
            {cfg.label}
          </h1>
          {!isZombie && secretWord && (
            <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(56,44,37,0.7)', border: '1px solid rgba(168,196,160,0.3)' }}>
              <p className="text-xs uppercase tracking-widest mb-1 font-mono" style={{ color: '#a8c4a0' }}>{t('game_your_secret_password')}</p>
              <p className="text-2xl sm:text-3xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{secretWord}</p>
              <p className="text-slate-500 text-xs mt-1">{t('game_never_share')}</p>
            </div>
          )}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{cfg.desc}</p>
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)` }}
          >
            {t('game_enter_field')} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CardTakenPopup({ playerName, onClose }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.92)' }}>
      <div className="relative rounded-3xl p-7 max-w-sm w-full mx-4 text-center" style={{ background: 'rgba(42,38,34,0.97)', border: '2px solid rgba(217,117,89,0.5)', backdropFilter: 'blur(20px)' }}>
        <div className="flex justify-center mb-3 text-rose-500">
          <AlertTriangle size={48} />
        </div>
        <h3 className="text-xl mb-2" style={{ color: '#d97559' }}>{t('game_card_taken_title')}</h3>
        <p className="text-slate-300 text-sm mb-1 leading-relaxed">
          {t('game_card_taken_body')}
        </p>
        <p className="text-lg font-black mb-3" style={{ color: '#AD9E97' }}>{playerName}</p>
        <p className="text-slate-500 text-xs mb-5 leading-relaxed">
          {t('game_card_taken_sub')}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #795846, #a87a64)' }}
        >
          {t('game_card_taken_ok')}
        </button>
      </div>
    </div>
  );
}

function EarlyCompletionPopup({ onDismiss, t }) {
  // Auto-dismiss after 7 s but the player can also tap to close.
  useEffect(() => {
    const timer = setTimeout(onDismiss, 7000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade"
      style={{ background: 'rgba(8,30,40,0.85)' }}
    >
      <div className="relative text-center max-w-xs w-full px-6">
        <div
          className="relative glass-panel p-8 rounded-3xl"
          style={{
            border: '2px solid #06b6d4',
            boxShadow: '0 0 40px rgba(6,182,212,0.45)',
          }}
        >
          <div className="text-7xl mb-3 animate-bounce">🏆</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: '#06b6d4' }}>
            {t('game_early_complete_title') || 'Objectives Complete!'}
          </h2>
          <p className="text-slate-300 mb-1">
            {t('game_early_complete_desc') ||
              "You've collected all your objective cards!"}
          </p>
          <p className="text-emerald-300 text-sm font-bold mb-4">
            {t('game_early_complete_bonus') ||
              'Bonus points awarded! Keep helping others trade.'}
          </p>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}
          >
            {t('game_close') || 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfectionAlert({ onDismiss, t }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(80,20,15,0.85)' }}>
      <div className="relative text-center max-w-xs w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl animate-zw-shake" style={{ border: '2px solid #d97559' }}>
          <div className="flex justify-center mb-4 text-rose-500">
            <Skull size={72} className="animate-bounce" />
          </div>
          <h2 className="text-4xl mb-2" style={{ color: '#d97559' }}>{t('game_infected_title')}</h2>
          <p className="text-slate-300 mb-1">{t('game_infected_desc')}</p>
          <p className="text-slate-500 text-sm mb-4">{t('game_infected_sub')}</p>
          <button onClick={onDismiss} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: '#795846' }}>
            {t('game_accept_fate')}
          </button>
        </div>
      </div>
    </div>
  );
}

async function startCameraScanner(scanner, handleResult) {
  const config = { fps: 10, qrbox: { width: 240, height: 240 } };
  // Try facingMode: 'environment' first — most reliable on mobile and avoids
  // the black-camera bug that camera-ID enumeration causes on many devices.
  try {
    await scanner.start({ facingMode: { exact: 'environment' } }, config, handleResult, () => { });
    return true;
  } catch {
    try {
      await scanner.start({ facingMode: 'environment' }, config, handleResult, () => { });
      return true;
    } catch {
      // Fall back to explicit camera ID (useful for laptops / desktops)
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const back = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
          await scanner.start(back.id, config, handleResult, () => { });
          return true;
        }
      } catch { /* ignore */ }
      try {
        await scanner.start({ facingMode: 'user' }, config, handleResult, () => { });
        return true;
      } catch {
        return false;
      }
    }
  }
}

function QRScannerModal({ onScan, onClose, title, hint }) {
  const { t } = useLanguage();
  const [permState, setPermState] = useState('checking'); // 'checking'|'prompt'|'requesting'|'granted'|'denied'
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);
  const pendingLaunchRef = useRef(null); // stores doRequest fn when we need to start after DOM renders
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        s.stop().catch(() => { });
      } catch { scannerRef.current = null; }
    }
  }, []);

  const scheduleRetry = useCallback((doRequest) => {
    clearTimeout(retryTimerRef.current);
    clearInterval(countdownRef.current);
    const secs = Math.floor(Math.random() * 6) + 5;
    setRetryCountdown(secs);
    let remaining = secs;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setRetryCountdown(r => r !== null ? r - 1 : null);
      if (remaining <= 0) clearInterval(countdownRef.current);
    }, 1000);
    retryTimerRef.current = setTimeout(() => {
      setRetryCountdown(null);
      doRequest();
    }, secs * 1000);
  }, []);

  const startScannerNow = useCallback(async (doRequest) => {
    setLoading(true);
    const el = document.getElementById('qr-reader');
    if (!el) { setPermState('denied'); scheduleRetry(doRequest); setLoading(false); return; }
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    const handleResult = (text) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      // Stop the scanner immediately to prevent repeated callbacks
      if (scannerRef.current) { scannerRef.current.stop().catch(() => { }); scannerRef.current = null; }
      let result = text.trim();
      try { const parsed = JSON.parse(text); result = parsed.code || parsed.id || text; } catch { }
      onScanRef.current(result.toUpperCase());
    };
    const ok = await startCameraScanner(scanner, handleResult);
    setLoading(false);
    if (!ok) {
      stopScanner();
      setPermState('denied');
      scheduleRetry(doRequest);
    }
  }, [stopScanner, scheduleRetry]);

  // When permState becomes 'granted', the qr-reader div is now in the DOM — start scanner
  useEffect(() => {
    if (permState === 'granted' && pendingLaunchRef.current) {
      const doRequest = pendingLaunchRef.current;
      pendingLaunchRef.current = null;
      startScannerNow(doRequest);
    }
  }, [permState, startScannerNow]);

  const launchScanner = useCallback((doRequest) => {
    hasScannedRef.current = false;
    pendingLaunchRef.current = doRequest;
    setPermState('granted'); // triggers re-render → qr-reader div mounts → useEffect starts scanner
  }, []);

  const doRequest = useCallback(async () => {
    setPermState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      launchScanner(doRequest);
    } catch {
      setPermState('denied');
      scheduleRetry(doRequest);
    }
  }, [launchScanner, scheduleRetry]);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        if (result.state === 'granted') {
          launchScanner(doRequest);
        } else {
          setPermState('prompt');
        }
      } catch {
        setPermState('prompt');
      }
    };
    check();
    return () => {
      stopScanner();
      clearTimeout(retryTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    clearTimeout(retryTimerRef.current);
    clearInterval(countdownRef.current);
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  const needsPermission = permState === 'prompt' || permState === 'denied' || permState === 'requesting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(19, 26, 18, 0.92)' }}>
      <div className="relative rounded-3xl p-6 max-w-sm w-full mx-4" style={{ background: 'rgba(34, 42, 34, 0.95)', border: '1px solid rgba(61, 126, 59, 0.4)', backdropFilter: 'blur(20px)' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={24} /></button>
        <h3 className="text-xl mb-1 flex items-center gap-2">
          <Camera size={20} /> {title}
        </h3>
        {hint && <p className="text-slate-500 text-sm mb-4">{hint}</p>}

        {needsPermission ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center text-center py-4 px-2">
              <div className="mb-4 text-[var(--neon-pink)] drop-shadow-[0_0_15px_var(--neon-pink)]">
                <Camera size={64} />
              </div>
              <h4 className="text-lg mb-2" style={{ color: '#AD9E97' }}>{t('scan_camera_needed')}</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-1">
                {t('scan_camera_allow_desc')}
              </p>
              {permState === 'denied' && (
                <p className="text-xs mt-1" style={{ color: '#d97559' }}>
                  {t('scan_camera_denied')}
                </p>
              )}
            </div>
            {retryCountdown !== null ? (
              <div className="text-center py-3 rounded-2xl" style={{ background: 'rgba(176, 214, 70, 0.7)', border: '1px solid rgba(109,113,98,0.2)' }}>
                <p className="text-slate-400 text-sm mb-1">{t('scan_retry_in')}</p>
                <p className="text-4xl font-black font-mono" style={{ color: '#795846' }}>{retryCountdown}</p>
              </div>
            ) : (
              <button
                onClick={doRequest}
                disabled={permState === 'requesting'}
                className="w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #795846, #a87a64)', opacity: permState === 'requesting' ? 0.7 : 1 }}
              >
                <Camera size={22} />
                {permState === 'requesting' ? t('scan_requesting') : t('scan_allow_camera')}
              </button>
            )}
            <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(109,113,98,0.15)', color: '#6D7162' }}>
              {t('game_close')}
            </button>
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              className="w-full rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(109,113,98,0.3)', minHeight: 280 }}
            />
            {(loading || permState === 'checking') && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl" style={{ background: 'rgba(42,38,34,0.85)' }}>
                <div className="text-center">
                  <Camera size={32} style={{ color: '#795846' }} className="mx-auto mb-2 animate-pulse" />
                  <p className="text-sm" style={{ color: '#AD9E97' }}>{t('scan_starting')}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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

function InfoModal({ onClose, t }) {
  const sections = getInfoSections(t);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,22,18,0.93)' }}>
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden overflow-y-auto max-h-[90vh]"
        style={{ background: 'rgba(42,38,34,0.98)', border: '1px solid rgba(109,113,98,0.4)' }}>
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
          <h2 className="text-xl flex items-center gap-2" style={{ color: '#AD9E97' }}>
            <HelpCircle size={20} style={{ color: '#795846' }} /> {t('game_guide')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={22} /></button>
        </div>
        <div className="p-6 space-y-6">
          {sections.map(section => (
            <div key={section.title}>
              <h3 className="text-xs uppercase tracking-widest font-mono mb-3" style={{ color: '#6D7162' }}>{section.title}</h3>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(56,44,37,0.5)' }}>
                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                      {item.icon && <item.icon size={24} className="text-[var(--neon-pink)] drop-shadow-[0_0_8px_var(--neon-pink)]" />}
                      {item.imgUrl && <img src={item.imgUrl} alt={item.label} className="w-8 h-8 object-contain drop-shadow-md" />}
                    </div>
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

function SlideContent({ slide, playerState, inventory, objectives, t, secretWord }) {
  if (!slide) return null;

  const { type, icon: Icon, image, cardImages, title, text, groups } = slide;

  const cardLabel = (key) => getCardLabel(key);

  // Title header from lb-safely-add-css
  const TitleHeader = ({ children }) => (
    <h2 className="text-2xl sm:text-3xl mb-2 sm:mb-4 text-[var(--neon-pink)] drop-shadow-[0_0_10px_var(--neon-pink-glow)]">
      {children}
    </h2>
  );

  // Hero visual: image → icon → nothing
  const HeroVisual = () => (
    image ? (
      <img
        src={image}
        alt=""
        className="mx-auto mb-4 sm:mb-6 max-h-40 sm:max-h-56 object-contain animate-zw-float drop-shadow-[0_0_20px_rgba(168,196,160,0.25)]"
      />
    ) : Icon ? (
      <div className="flex justify-center mb-4 sm:mb-6 animate-zw-float text-[var(--neon-pink)] drop-shadow-[0_0_15px_var(--neon-pink)]">
        <Icon size={64} />
      </div>
    ) : null
  );

  if (type === 'items') {
    return (
      <div className="text-center">
        <HeroVisual />

        {/* Neon title from lb-safely-add-css */}
        <TitleHeader>{title}</TitleHeader>

        <p className="text-slate-400 mb-6">{text}</p>

        {cardImages && cardImages.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {cardImages.map((src, i) => (
              <div
                key={i}
                className="rounded-2xl p-2 sm:p-2.5 transition-all hover:scale-105
                           w-[calc(33.333%-0.5rem)]
                           sm:w-[calc(33.333%-0.7rem)]
                           md:w-[calc(20%-0.8rem)]"
                style={{
                  background: 'rgba(56,44,37,0.45)',
                  border: '1px solid rgba(168,196,160,0.25)',
                  boxShadow: '0 0 14px rgba(168,196,160,0.18)',
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(CARD_TYPES)
              .filter(([k]) => k !== 'unknown')
              .map(([key, ct]) => (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border ${ct.bg}`}
                >
                  {ct.symbol ? (
                    <img
                      src={ct.symbol}
                      alt={ct.label}
                      className="w-8 h-8 object-contain drop-shadow-md"
                    />
                  ) : (
                    <Layers size={24} className={ct.color} />
                  )}
                  <span className={`text-[10px] font-bold text-center leading-tight ${ct.color}`}>
                    {ct.label}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'objectives') {
    const objs = normalizeObjectives(objectives);
    return (
      <div className="text-center">
        <HeroVisual />
        <TitleHeader>{title}</TitleHeader>
        {text.split('\n').map((line, i) => <p key={i} className="text-slate-400 mb-1">{line}</p>)}
        <div className="mt-5 space-y-3 text-left">
          {objs.length === 0 ? (
            <p className="text-slate-600 text-sm text-center italic">Objectives will appear here after you scan your cards.</p>
          ) : objs.map((obj, i) => {
            const ct = CARD_TYPES[obj.type] || CARD_TYPES.unknown;
            const have = ownedCount(inventory, obj.type);
            const need = obj.qty;
            const met = have >= need;
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${met ? 'bg-[var(--neon-green-glow)]/15 border-[var(--neon-green-glow)]/30' : 'bg-slate-800/60 border-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                  {ct.symbol ? (
                    <img src={ct.symbol} alt={ct.label} className="w-6 h-6 object-contain drop-shadow-md" />
                  ) : (
                    <Layers size={20} className={ct.color} />
                  )}
                  <span className={`font-bold ${met ? 'text-[var(--neon-green-glow)]' : 'text-slate-200'}`}>
                    {need}× {getCardLabel(obj.type)}
                  </span>
                </div>
                <span className={`font-mono text-sm ${met ? 'text-[var(--neon-green-glow)]' : 'text-slate-400'}`}>
                  {Math.min(have, need)}/{need}
                </span>
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
      ? { label: t('game_zombie'), Icon: Skull, color: '#d97559', bg: 'rgba(80,30,20,0.6)', border: 'rgba(217,117,89,0.4)' }
      : { label: t('game_survivor'), Icon: Shield, color: '#a8c4a0', bg: 'rgba(30,50,35,0.6)', border: 'rgba(168,196,160,0.4)' };
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4 animate-zw-float" style={{ color: cfg.color }}>
          <cfg.Icon size={72} />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>{t('game_your_role_is')}</p>
        <h2 className="text-4xl sm:text-5xl mb-4 sm:mb-5 uppercase" style={{ color: cfg.color }}>{cfg.label}</h2>
        <div className="rounded-2xl p-4 mb-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <p className="text-slate-200 font-semibold text-lg">{text}</p>
        </div>
      </div>
    );
  }

  if (type === 'hints') {
    // Render each group with its example password header (e.g. "Password: Cat")
    // followed by the good/bad hints for that example. We deliberately do NOT
    // display the player's real password here — it's already shown in the
    // header section of the in-game UI for survivors.
    const groupList = groups || [{ lines: [] }];
    const isZombie = playerState?.role === 'zombie';
    return (
      <div className="text-center">
        <HeroVisual />
        <TitleHeader>{title}</TitleHeader>
        {secretWord && !isZombie && (
          <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(56,44,37,0.7)', border: '1px solid rgba(168,196,160,0.4)' }}>
            <p className="text-xs uppercase tracking-widest mb-1 font-mono" style={{ color: '#a8c4a0' }}>{t('game_your_secret_password')}</p>
            <p className="text-2xl sm:text-3xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{secretWord}</p>
            <p className="text-slate-500 text-xs mt-1">{t('game_never_share')}</p>
          </div>
        )}
        <div className="space-y-5 text-left">
          {groupList.map((g, gi) => (
            <div key={gi}>
              {g.pw && (
                <div className="mb-2 rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(56,44,37,0.7)', border: '1px solid rgba(168,196,160,0.4)' }}>
                  <p className="text-base sm:text-lg font-black tracking-wider font-mono flex items-center justify-center gap-2" style={{ color: '#a8c4a0' }}>
                    <Key size={16} /> {g.pw}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {(g.lines || []).map((line, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${line.ok ? 'bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20' : 'bg-[var(--neon-pink)]/10 border border-[var(--neon-pink)]/20'}`}>
                    <span className="flex-shrink-0 mt-0.5">
                      {line.ok ? (
                        <CheckCircle2 size={18} className="text-[var(--neon-green)]" />
                      ) : (
                        <X size={18} className="text-[var(--neon-pink)]" />
                      )}
                    </span>
                    <p className={`text-sm leading-relaxed ${line.ok ? 'text-[var(--neon-green)]' : 'text-[var(--neon-pink)]'}`}>{line.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'story') {
    return (
      <div className="text-center">

        {/* Hero visual: image → icon → nothing */}
        {image ? (
          <img
            src={image}
            alt=""
            className="mx-auto mb-5 sm:mb-8 max-h-44 sm:max-h-60 object-contain animate-zw-float drop-shadow-[0_0_20px_rgba(168,196,160,0.25)]"
          />
        ) : Icon ? (
          <div className="flex justify-center mb-5 sm:mb-8 animate-zw-float text-[var(--neon-pink)] drop-shadow-[0_0_15px_var(--neon-pink)]">
            <Icon size={72} />
          </div>
        ) : null}

        {/* Neon title from lb-safely-add-css */}
        <h2 className="text-2xl sm:text-3xl mb-4 sm:mb-6 text-[var(--neon-pink)] drop-shadow-[0_0_10px_var(--neon-pink-glow)]">
          {title}
        </h2>

        {/* Story box using lb-safely-add-css colors */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(255, 0, 128, 0.10)', // var(--neon-pink-glow)/10 equivalent
            border: '1px solid rgba(179, 102, 162, 0.38)',
          }}
        >
          {text.split('\n').map((line, i) => (
            <p
              key={i}
              className="text-slate-300 text-base sm:text-lg leading-relaxed"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  }


    // Generic info-style slide (covers `info`, `final` and any custom type that
  // doesn't render its own special layout above).
  return (
    <div className="text-center">

      {/* Hero visual: image → icon → nothing */}
      {image ? (
        <img
          src={image}
          alt=""
          className="mx-auto mb-5 sm:mb-8 max-h-44 sm:max-h-60 object-contain animate-zw-float drop-shadow-[0_0_20px_rgba(168,196,160,0.25)]"
        />
      ) : Icon ? (
        <div className="flex justify-center mb-5 sm:mb-8 animate-zw-float text-[var(--neon-pink)] drop-shadow-[0_0_15px_var(--neon-pink)]">
          <Icon size={72} />
        </div>
      ) : null}

      {/* Neon title from lb-safely-add-css */}
      <h2 className="text-2xl sm:text-3xl mb-4 sm:mb-5 text-[var(--neon-pink)] drop-shadow-[0_0_10px_var(--neon-pink-glow)]">
        {title}
      </h2>

      <div className="space-y-1">
        {text.split('\n').map((line, i) => (
          <p
            key={i}
            className="text-slate-300 text-base sm:text-lg leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}


function WhatToDoNow({
  gamePhase, isScanSlide, scanDone, meIsReady, isLast,
  isModule, isDoneTrading, hasSkippedTrade, isZombie,
  initialScanCount,
  onShowInitialScanner, onSlideReady, onDoneTrading, onSkipTrade, onOpenScanner,
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  let IconComp = HelpCircle;
  let title = '';
  let body = '';
  let actions = [];

  if (gamePhase === 'module_instructions') {
    if (isScanSlide) {
      if (!scanDone) {
        IconComp = Camera;
        title = t('game_scan_starting_cards_title');
        body = t('wtd_body_scan_cards').replace('{n}', initialScanCount);
        actions = [{ label: `${t('game_scan_card_n')} ${initialScanCount + 1} ${t('game_of_4')}`, color: 'var(--neon-pink)', onClick: () => { setOpen(false); onShowInitialScanner(); } }];
      } else {
        IconComp = Timer;
        title = t('wtd_all_cards_scanned');
        body = t('wtd_body_all_scanned');
      }
    } else if (!meIsReady) {
      IconComp = Info;
      title = isLast ? t('wtd_tap_ready') : t('wtd_read_and_next');
      body = isLast ? t('wtd_body_tap_ready') : t('wtd_body_read_next');
      actions = [{ label: isLast ? `${t('game_im_ready')} ✓` : `${t('game_next')} →`, color: 'var(--neon-pink)', dark: true, onClick: () => { setOpen(false); onSlideReady(); } }];
    } else {
      IconComp = CheckCircle2;
      title = t('wtd_waiting_others');
      body = t('wtd_body_waiting');
    }
  } else if (gamePhase === 'round_active') {
    if (isModule) {
      if (!isDoneTrading) {
        IconComp = Users;
        title = t('wtd_go_trade');
        body = t('wtd_body_go_trade');
      } else {
        IconComp = CheckCircle2;
        title = t('wtd_done_trading_title');
        body = t('wtd_body_done_trading');
        actions = [{ label: t('wtd_open_scanner'), color: 'var(--neon-pink)', onClick: () => { setOpen(false); onOpenScanner(); } }];
      }
    } else {
      IconComp = isZombie ? Skull : Camera;
      title = isZombie ? t('wtd_infect_others') : t('wtd_scan_card_title');
      body = isZombie ? t('wtd_body_zombie') : t('wtd_body_survivor');
      actions = [{ label: t('wtd_open_scanner'), color: 'var(--neon-pink)', onClick: () => { setOpen(false); onOpenScanner(); } }];
    }
  } else if (gamePhase === 'module_between_rounds') {
    IconComp = Package;
    title = t('wtd_scan_cards');
    body = t('wtd_body_between_rounds');
    actions = [{ label: t('wtd_open_scanner'), color: 'var(--neon-pink)', onClick: () => { setOpen(false); onOpenScanner(); } }];
  } else {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-16 sm:top-20 md:right-16 sm:right-5 z-40 flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full font-bold text-md shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ background: 'rgba(145, 56, 110, 0.36)', border: '1px solid var(--neon-pink)', color: 'var(--neon-pink)', backdropFilter: 'blur(12px)', boxShadow: '0 0 10px rgba(240, 149, 194, 1)' }}
      >
        {"?"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 overflow-y-auto" style={{ background: 'rgba(20, 1, 26, 0.53)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'rgba(59, 27, 49, 0.74)', border: '1px solid var(--neon-pink)', backdropFilter: 'blur(24px)', boxShadow: '0 0 30px rgba(216, 123, 196, 0.8)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--neon-pink-glow)' }}>
              <div className="flex items-center gap-2.5 text-[var(--neon-pink)] drop-shadow-[0_0_10px_var(--neon-pink)]">
                <IconComp size={24} className="!drop-shadow-[0_0_2px_var(--neon-pink-glow)]/50" />
                <h2 className="text-lg !text-[var(--neon-pink)] !drop-shadow-[0_0_2px_var(--neon-pink-glow)]/10">{title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-[var(--neon-pink)] hover:text-slate-300 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-5 space-y-4 flex flex-col items-center">
              <p className="text-slate-300 text-sm leading-relaxed">{body}</p>

              <button onClick={() => setOpen(false)} className=" p-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--neon-pink-glow)]/20 hover:bg-[var(--neon-pink-glow)]/30 neon-btn-alt !mx-0" style={{ color: 'var(--neon-pink)' }}>
                {t('wtd_got_it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const GameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { groupData, playerData } = location.state || (() => {
    try {
      const raw = localStorage.getItem('player_session');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showInitialScanner, setShowInitialScanner] = useState(false);
  const [showInfectionAlert, setShowInfectionAlert] = useState(false);
  const [cardTakenByPlayer, setCardTakenByPlayer] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [eduContext, setEduContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDoneTrading, setIsDoneTrading] = useState(false);
  const [hasSkippedTrade, setHasSkippedTrade] = useState(false);
  const [betweenRoundsDone, setBetweenRoundsDone] = useState(false);
  const [localSlideReady, setLocalSlideReady] = useState(false);
  const [initialScanCount, setInitialScanCount] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [selectedTradePartner, setSelectedTradePartner] = useState("");
  // True briefly when the player's "all objectives complete" bonus triggers
  // for the first time. Drives the EarlyCompletionPopup.
  const [showEarlyCompletion, setShowEarlyCompletion] = useState(false);

  // Persist session to localStorage so page reload can rejoin the game
  useEffect(() => {
    if (groupData?.group_id && playerData?.id) {
      localStorage.setItem('player_session', JSON.stringify({ groupData, playerData }));
    }
  }, [groupData?.group_id, playerData?.id]);

  const gameModeRef = useRef('module_1');
  const [localNormalSlideIndex, setLocalNormalSlideIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const { playSFX, toggle, isEnabled } = useAudio();
  const { lastMessage } = useGameWebSocket(
    groupData?.group_id,
    playerData?.id
  );

  const fetchState = useCallback(async () => {
    if (!groupData?.group_id) return;
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
      if (data.secret_word && me?.role !== 'zombie') {
        localStorage.setItem('active_secret_word', data.secret_word);
      } else if (!data.secret_word) {
        localStorage.removeItem('active_secret_word');
      }
      if (data.session_status === 'finished' || data.game_state === 'end_game') {
        localStorage.setItem('endgame_group_id', groupData.group_id);
        localStorage.removeItem('player_session');
        navigate('/endgame', { state: { groupId: groupData.group_id } });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [groupData?.group_id, playerData?.id, navigate]);

  useEffect(() => { fetchState(); const id = setInterval(fetchState, 10000); return () => clearInterval(id); }, [fetchState]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'GAME_STARTED') { fetchState(); }
    if (lastMessage.type === 'SLIDE_ADVANCED') {
      setLocalSlideReady(false);
      // For normal mode, also advance the local slide index so players see next instruction
      if (gameModeRef.current === 'normal' && lastMessage.slide !== undefined) {
        setLocalNormalSlideIndex(lastMessage.slide);
      }
      fetchState();
    }
    if (lastMessage.type === 'PLAYER_READY') { fetchState(); }
    if (lastMessage.type === 'SESSION_TERMINATED') {
      if (groupData?.group_id) {
        localStorage.setItem('endgame_group_id', groupData.group_id);
        localStorage.removeItem('player_session');
        navigate('/endgame', { state: { groupId: groupData.group_id } });
      } else {
        localStorage.removeItem('player_session');
        navigate('/');
      }
    }
    if (lastMessage.type === 'PHASE_CHANGED') { fetchState(); }
    if (lastMessage.type === 'PLAYER_INFECTED' && lastMessage.player_id === playerData?.id) {
      setShowInfectionAlert(true);
      setPlayerState(p => ({ ...p, role: 'zombie', is_infected: true }));
      playSFX('infected');
    }
    if (lastMessage.type === 'ROUND_STARTED') {
      setIsDoneTrading(false);
      setBetweenRoundsDone(false);
      setSelectedTradePartner("");
      const mode = gameModeRef.current;
      if (mode === 'module_3' || mode === 'normal') setShowRoleReveal(true);
      if (lastMessage.secret_word && playerState?.role !== 'zombie') {
        localStorage.setItem('active_secret_word', lastMessage.secret_word);
      }
      fetchState();
    }
    if (lastMessage.type === 'ROUND_ENDED') {
      // Reset per-round local state so the between-rounds scan flow starts fresh.
      setBetweenRoundsDone(false);
      // If THIS player just completed all their objectives for the first
      // time, show the celebration popup once.
      const myScore = (lastMessage.scores || []).find(s => s.player_id === playerData?.id);
      if (myScore?.early_completion) {
        setShowEarlyCompletion(true);
        playSFX('role_reveal');
      }
      fetchState();
    }
    if (lastMessage.type === 'SCAN_PHASE_COMPLETE') {
      // Every player has scanned their 1 card → the ready-gate popup
      // becomes the active UI. Refresh so we can render it.
      setBetweenRoundsDone(false);
      fetchState();
    }
    if (lastMessage.type === 'OBJECTIVES_ASSIGNED') {
      // Group-aware objectives were just generated server-side.
      fetchState();
    }
    if (lastMessage.type === 'GAME_ENDED') {
      if (groupData?.group_id) {
        localStorage.setItem('endgame_group_id', groupData.group_id);
        localStorage.removeItem('player_session');
        navigate('/endgame', { state: { groupId: groupData.group_id } });
      } else {
        fetchState();
      }
    }
  }, [lastMessage, playerData?.id, fetchState, playSFX]);

  const handleSlideReady = async () => {
    if (localSlideReady) { setLocalSlideReady(true); return; }
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
      } else if (res.status === 409 && typeof data.detail === 'string' && data.detail.startsWith('already_owned_by:')) {
        const owner = data.detail.split('already_owned_by:')[1];
        setScanFeedback(null);
        setCardTakenByPlayer(owner);
      } else {
        setScanFeedback({ status: 'error', message: data.detail || 'Unknown card code' });
        setTimeout(() => setScanFeedback(null), 3000);
      }
    } catch { setScanFeedback({ status: 'error', message: t('game_scan_failed') }); setTimeout(() => setScanFeedback(null), 3000); }
  };

  const handleScan = useCallback(async (cardCode) => {
    setShowScanner(false);
    setScanFeedback({ status: 'scanning' });
    try {
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id, card_code: cardCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanFeedback({ status: 'error', message: data.detail || t('game_scan_failed') });
        setTimeout(() => setScanFeedback(null), 3000);
        return;
      }
      if (data.inventory) setInventory(data.inventory);
      if (data.edu) setEduContext(data.edu);
      if (data.newly_infected) {
        setShowInfectionAlert(true);
        setPlayerState(p => ({ ...p, role: 'zombie', is_infected: true }));
        setScanFeedback(null);
      } else {
        playSFX('scan_success');
        setScanFeedback({ status: 'success', item: { type: data.inventory?.find(i => i.code === cardCode)?.type } });
        setTimeout(() => setScanFeedback(null), 3000);
      }
      if (data.round_ended) fetchState();
      // Mark between-rounds scan as done so UI updates immediately
      if (gameState?.game_state === 'module_between_rounds') {
        setBetweenRoundsDone(true);
        // Always refresh — the server marked us as ready and may have
        // triggered the ready-gate transition (scan_phase_complete=True).
        fetchState();
      }
    } catch {
      setScanFeedback({ status: 'error', message: t('game_scan_failed') });
      setTimeout(() => setScanFeedback(null), 3000);
    }
  }, [groupData?.group_id, playerData?.id, playSFX, fetchState, gameState?.game_state]);

  const handleTradeAction = async (action) => {
    // action === null is the m1/m2 simple "Done Trading" path (no partner / no accusation).
    // For m3/normal accept/decline a partner is required.
    if (action && !selectedTradePartner) return;
    try {
      const body = action
        ? { player_id: playerData.id, partner_id: selectedTradePartner, action }
        : { player_id: playerData.id };
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/trade_done`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setIsDoneTrading(true);
    } catch (e) { console.error(e); }
  };

  const handleSkipTrade = async () => {
    if (hasSkippedTrade) return;
    if (!window.confirm(t('game_skip_confirm'))) return;
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
      const res = await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/next_round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerData.id }),
      });
      const data = await res.json();
      // If the server responded that the game ended, navigate immediately
      // rather than waiting for the WebSocket or the next poll.
      fetchState();
    } catch (e) { console.error(e); }
  };

  if (!groupData || !playerData) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12" style={{ background: 'rgba(121,88,70,0.1)', border: '1px solid rgba(121,88,70,0.3)', color: '#d97559', borderRadius: 24 }}>
        <p>{t('game_no_data')}</p>
        <button onClick={() => navigate('/join')} className="mt-4 underline">{t('game_join_game')}</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="flex justify-center mb-4 animate-zw-float text-slate-500">
            <Skull size={64} />
          </div>
          <p className="font-mono animate-pulse" style={{ color: '#6D7162' }}>{t('game_connecting')}</p>
        </div>
      </div>
    );
  }

const isZombie = playerState?.role === 'zombie';
const gamePhase = gameState?.game_state || 'lobby';
const gameMode = gameState?.game_mode || 'module_1';
const statusColor = isZombie ? '#d97559' : '#a8c4a0';
const StatusIcon = isZombie ? Skull : Shield;
const statusLabel = isZombie ? t('game_zombie') : t('game_survivor');

const otherZombies =
  gameState?.players?.filter(
    p => p.is_infected && p.id !== playerData?.id
  ) || [];

if (gamePhase === 'module_instructions') {
  const isNormalMode = gameMode === 'normal';
  const MODULE_SLIDES = getModuleSlides(t);

  const slides = isNormalMode
    ? MODULE_SLIDES.normal
    : (MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1);

  const slideIndex = isNormalMode
      ? localNormalSlideIndex
      : (gameState?.instruction_slide ?? 0);

  const slide = slides[Math.min(slideIndex, slides.length - 1)];
  const isLast = slideIndex >= slides.length - 1;
  const isScanSlide = slide?.type === 'scan';
  const scanDone = initialScanCount >= 4;

  const readyCount = gameState?.ready_count ?? 0;
  const totalPlayers = gameState?.players?.length ?? 1;
  const notReady = gameState?.not_ready ?? [];

  const meIsReady =
    localSlideReady ||
    (gameState?.players?.find(
      p => p.id === playerData?.id
    )?.is_ready ?? false);

  const handleNormalNext = () => {
    if (isLast) {
      setLocalSlideReady(true);
      handleSlideReady();
    } else {
      setLocalNormalSlideIndex(i =>
        Math.min(i + 1, slides.length - 1)
      );
    }
  };

  const handleNormalSkipAll = () => {
    const scanIdx = slides.findIndex(s => s.type === 'scan');

    setLocalNormalSlideIndex(
      scanIdx >= 0 ? scanIdx : slides.length - 1
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 px-4 overflow-y-auto py-8">
      {showInitialScanner && (
        <QRScannerModal
          onScan={handleInitialScan}
          onClose={() => setShowInitialScanner(false)}
          title={t('game_scan_starting_card')}
          hint={t('game_scan_starting_hint')}
        />
      )}

      {cardTakenByPlayer && (
        <CardTakenPopup
          playerName={cardTakenByPlayer}
          onClose={() => setCardTakenByPlayer(null)}
        />
      )}

      <WhatToDoNow
        gamePhase="module_instructions"
        isScanSlide={isScanSlide}
        scanDone={scanDone}
        meIsReady={meIsReady}
        isLast={isLast}
        initialScanCount={initialScanCount}
        onShowInitialScanner={() =>
          setShowInitialScanner(true)
        }
        onSlideReady={handleSlideReady}
      />

      <div
        className="w-full max-w-lg p-6 sm:p-10 rounded-[2rem]"
        style={{
          background: 'rgba(48, 26, 42, 0.59)',
          border: '1px solid var(--neon-pink)',
          boxShadow: '0 0 50px rgba(194, 95, 181, 0.5)'
        }}
      >
        <div className="flex justify-center gap-1.5 mb-4 sm:mb-8">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                slideIndex === idx
                  ? 'bg-[var(--neon-pink)] drop-shadow-[0_0_8px_var(--neon-pink)] w-8'
                  : slideIndex > idx
                    ? 'bg-[var(--neon-pink-glow)]/70 w-4'
                    : 'bg-[var(--neon-green-glow)]/30 w-4'
              }`}
            />
          ))}
        </div>

        <SlideContent
          slide={slide}
          playerState={playerState}
          inventory={inventory}
          objectives={objectives}
          t={t}
          secretWord={
            playerState?.role !== 'zombie'
              ? (
                  gameState?.secret_word ||
                  localStorage.getItem('active_secret_word')
                )
              : null
          }
        />

        {isScanSlide && (
          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background: 'rgba(37, 66, 29, 0.33)',
              border: '1px solid rgba(47, 124, 54, 0.3)'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-300 font-bold text-sm">
                {t('game_scanning_progress')}
              </span>

              <span
                className="font-black text-lg"
                style={{
                  color: scanDone
                    ? '#a8c4a0'
                    : '#AD9E97'
                }}
              >
                {initialScanCount}/4
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`flex-1 h-2.5 rounded-full transition-all ${
                    i < initialScanCount
                      ? 'bg-[var(--neon-green-glow)]/50'
                      : 'bg-[var(--neon-pink-glow)]/50'
                  }`}
                />
              ))}
            </div>

            {inventory.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {inventory.slice(0, 4).map((card, idx) => {
                  const ct =
                    CARD_TYPES[card.type] ||
                    CARD_TYPES.unknown;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-sm ${ct.bg}`}
                    >
                      {ct.symbol ? (
                        <img
                          src={ct.symbol}
                          alt={ct.label}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        <Layers
                          size={18}
                          className={ct.color}
                        />
                      )}

                      <span
                        className={`font-semibold ${ct.color}`}
                      >
                        {getCardLabel(card.type)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {scanFeedback && (
              <div
                className={`p-3 rounded-xl text-sm flex items-center gap-2 mb-3 ${
                  scanFeedback.status === 'success'
                    ? 'bg-[var(--neon-green-glow)]/10 text-[var(--neon-green-glow)] border border-[var(--neon-green-glow)]/30'
                    : scanFeedback.status === 'error'
                      ? 'bg-[var(--neon-pink-glow)]/10 text-[var(--neon-pink-glow)] border border-[var(--neon-pink-glow)]/30'
                      : 'bg-slate-800 text-slate-300'
                }`}
              >
                {scanFeedback.status === 'success' && (
                  <>
                    <Zap size={16} />

                    {(() => {
                      const ct =
                        CARD_TYPES[
                          scanFeedback.item?.type
                        ] || CARD_TYPES.unknown;

                      return ct.symbol ? (
                        <img
                          src={ct.symbol}
                          alt={ct.label}
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <Layers size={16} />
                      );
                    })()}

                    {t('game_scanned')}
                  </>
                )}

                {scanFeedback.status === 'error' && (
                  <>
                    <AlertTriangle size={16} />{' '}
                    {scanFeedback.message}
                  </>
                )}

                {scanFeedback.status === 'scanning' && (
                  <>
                    <Camera size={16} />{' '}
                    {t('game_verifying')}
                  </>
                )}
              </div>
            )}

            {scanDone ? (
              <div className="text-center py-2">
                <CheckCircle2
                  size={28}
                  className="text-[var(--neon-green-glow)] mx-auto mb-1"
                />

                <p className="text-[var(--neon-green-glow)] font-black text-sm">
                  {t('game_all_scanned')}
                </p>

                <p className="text-slate-500 text-xs animate-pulse mt-0.5">
                  {t('game_waiting_others_scan')}
                </p>
              </div>
            ) : (
              <button
                onClick={() =>
                  setShowInitialScanner(true)
                }
                className="w-full py-3.5 rounded-xl neon-btn mt-6 font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Camera size={20} />{' '}
                {t('game_scan_card_n')}{' '}
                {initialScanCount + 1}{' '}
                {t('game_of_4')}
              </button>
            )}
          </div>
        )}

        {!isScanSlide && (
          <div className="mt-8">
            {isNormalMode ? (
              meIsReady ? (
                <div className="text-center py-4">
                  <CheckCircle2
                    size={28}
                    className="text-[var(--neon-green-glow)] mx-auto mb-2"
                  />

                  <p className="text-[var(--neon-green-glow)] font-bold">
                    {t('game_youre_ready')}
                  </p>

                  <p className="text-slate-500 text-xs mt-1 animate-pulse">
                    {t('game_waiting_teacher_start')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleNormalNext}
                    className="neon-btn w-full py-4 mb-5 sm:py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={
                      isLast
                        ? {
                            background:
                              'linear-gradient(135deg, #0891b2, #06b6d4)',
                            boxShadow:
                              '0 0 30px rgba(6,182,212,0.25)',
                            color: '#fff'
                          }
                        : {
                            background: '#4aca26ff',
                            color: '#0f1a0e'
                          }
                    }
                  >
                    {isLast ? (
                      <>
                        <CheckCircle2 size={22} />{' '}
                        {t('game_im_ready')}
                      </>
                    ) : (
                      <>
                        {t('game_next')}{' '}
                        <ChevronRight size={22} />
                      </>
                    )}
                  </button>
                </div>
              )
            ) : meIsReady ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3 drop-shadow-[0_0_3px_rgba(6,212,6,1)]">
                  <CheckCircle2
                    size={20}
                    className="text-[var(--neon-green-glow)]"
                  />

                  <span className="text-[var(--neon-green-glow)] font-bold">
                    {t('game_youre_ready')}
                  </span>
                </div>

                <div
                  className="rounded-xl p-3"
                  style={{
                    background:
                      'rgba(34, 42, 35, 0.83)',
                    border:
                      '1px solid rgba(77, 126, 80, 0.4)'
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users
                      size={14}
                      style={{
                        color: '#86ac86ff'
                      }}
                    />

                    <span
                      className="text-xs font-mono"
                      style={{
                        color: '#86ac86ff'
                      }}
                    >
                      {readyCount}/{totalPlayers}{' '}
                      {t('game_players_ready')}
                    </span>
                  </div>

                  {notReady.length > 0 && (
                    <p className="text-xs text-slate-600 text-center">
                      {t('game_waiting_for')}{' '}
                      {notReady.join(', ')}…
                    </p>
                  )}

                  <div className="flex gap-1 mt-2">
                    {Array.from({
                      length: totalPlayers
                    }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full ${
                          i < readyCount
                            ? 'bg-cyan-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSlideReady}
                className="neon-btn w-full py-4 sm:py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={
                  isLast
                    ? {
                        background:
                          'linear-gradient(135deg, #0891b2, #06b6d4)',
                        boxShadow:
                          '0 0 30px rgba(6,182,212,0.25)',
                        color: '#fff'
                      }
                    : {
                        background: 'var',
                        color: '#0f1a0e'
                      }
                }
              >
                {isLast ? (
                  <>
                    <CheckCircle2 size={22} />{' '}
                    {t('game_im_ready')}
                  </>
                ) : (
                  <>
                    {t('game_next')}{' '}
                    <ChevronRight size={22} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

  const isTimeUp = gamePhase === 'round_active' && gameState?.round_end_time && (gameState.round_end_time - Math.floor(Date.now() / 1000)) <= 0;
  const isModule = gameMode?.startsWith('module') || gameMode === 'normal';
  const isNormal = gameMode === 'normal';
  const scanPhaseComplete = !!gameState?.scan_phase_complete;
  // Scanning is *only* allowed during module_between_rounds, before all
  // players have scanned (i.e. before scan_phase_complete). During
  // round_active players trade physically — no QR scanning.
  const showScanButton = gamePhase === 'module_between_rounds' && !scanPhaseComplete && !betweenRoundsDone;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 relative overflow-hidden max-w-lg mx-auto px-4 py-8">
      {showRoleReveal && playerState?.role && (
        <RoleReveal
          role={playerState.role}
          secretWord={!isZombie ? gameState?.secret_word : null}
          gameMode={gameMode}
          onContinue={() => { setShowRoleReveal(false); playSFX('role_reveal'); }}
          t={t}
        />
      )}
      {showInfectionAlert && <InfectionAlert onDismiss={() => setShowInfectionAlert(false)} t={t} />}
      {showEarlyCompletion && <EarlyCompletionPopup onDismiss={() => setShowEarlyCompletion(false)} t={t} />}
      {showScanner && (
        <QRScannerModal
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title={t('game_scan_item_card')}
          hint={t('game_scan_item_hint')}
        />
      )}
      {eduContext && <EduPopup edu={eduContext} onDismiss={() => setEduContext(null)} />}
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} t={t} />}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(10, 19, 11, 0.87)' }} onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden bg-[var(--neon-green-glow)]/10 border-2 border-[var(--neon-light-green-glow)] shadow-[0_0_30px_var(--neon-green-glow)]/50" style={{ backdropFilter: 'blur(24px)' }} onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {(() => {
                  const ct = CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown;
                  return ct.symbol ? (
                    <img src={ct.symbol} alt={ct.label} className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(20,200,35,0.5)]" />
                  ) : (
                    <Layers size={64} className={ct.color} />
                  );
                })()}
              </div>
              <h2 className={`text-2xl mb-1 ${(CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).color}`}>
                {getCardLabel(selectedItem.type)}
              </h2>
              <p className="text-xs font-mono mb-4" style={{ color: '#727c69ff' }}>{selectedItem.code}</p>
              <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: 'rgba(51, 80, 52, 0.38)', border: '1px solid rgba(93, 117, 91, 0.2)' }}>
                <p className="text-slate-300 text-sm leading-relaxed">{t((CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).descKey)}</p>
              </div>
              {selectedItem.contaminated && (
                <div className="rounded-xl px-4 py-2 mb-4 text-sm font-bold text-rose-400 flex items-center justify-center gap-2" style={{ background: 'rgba(80,30,20,0.5)', border: '1px solid rgba(217,117,89,0.3)' }}>
                  {t('game_contaminated')}
                </div>
              )}
              <button onClick={() => setSelectedItem(null)} className="w-full py-3 rounded-2xl font-bold text-slate-300 transition-all neon-btn mt-2">
                {t('game_close')}
              </button>
            </div>
          </div>
        </div>
      )}


      <WhatToDoNow
        gamePhase={gamePhase}
        isModule={isModule}
        isDoneTrading={isDoneTrading}
        hasSkippedTrade={hasSkippedTrade}
        isZombie={isZombie}
        initialScanCount={initialScanCount}
        onSkipTrade={handleSkipTrade}
        onOpenScanner={() => setShowScanner(true)}
      />

      <div className="max-w-lg mx-auto py-2 px-2 sm:px-3 animate-zw-fade pb-24">

        <div className="rounded-2xl p-3 sm:p-5 mb-2 flex items-center justify-between"
          style={{ background: `rgba(${isZombie ? '80,30,20' : '30,50,35'},0.6)`, border: `2px solid ${statusColor}33` }}>
          <div className="flex items-center gap-3">
            <StatusIcon size={36} style={{ color: statusColor }} />
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: '#6D7162' }}>{t('game_your_role')}</p>
              <p className="text-lg sm:text-2xl uppercase" style={{ color: statusColor }}>{statusLabel}</p>
              {gameMode === 'module_1' && <p className="text-[10px] text-slate-500 mt-0.5">{t('game_module1_survivors_only')}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs font-mono mb-0.5" style={{ color: '#6D7162' }}>{t('game_round')}</p>
            <p className="text-xl sm:text-3xl font-black text-white">{gameState?.current_round || '-'}</p>
            <p className="text-[10px] sm:text-xs font-mono" style={{ color: '#6D7162' }}>{t('game_of_3')}</p>
          </div>
        </div>

        {!isZombie && gameState?.secret_word && (
          <div className="rounded-2xl p-3 sm:p-4 mb-2 flex items-center gap-3" style={{ background: '#5338147e', border: '1px solid #8b5815bb' }}>

            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest font-mono flex flex-row gap-2" style={{ color: '#daa867ff' }}><Shield size={18} style={{ color: '#daa867ff' }} /> {t('game_secret_password')}</p>
              <p className="text-base sm:text-2xl font-black tracking-widest font-mono" style={{ color: '#daa867ff' }}>{gameState.secret_word}</p>
            </div>
          </div>
        )}

        {gameState?.round_end_time && gamePhase === 'round_active' && (
          <TimerBar endTime={gameState.round_end_time} label={t('game_round_timer')} />
        )}

{objectives.length > 0 && (() => {
  const objs = normalizeObjectives(objectives);

  return (
    <div
      className="rounded-2xl p-3 sm:p-4 mb-2 bg-[var(--dark-cyan)]/60"
      style={{
        border: '1px solid rgba(137, 195, 228, 0.4)'
      }}
    >
      <p
        className="text-[10px] sm:text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5"
        style={{ color: '#8cbbc4ff' }}
      >
        <PinIcon size={12} /> {t('game_your_objectives')}
      </p>

      <div className="space-y-1.5">
        {objs.map((obj, idx) => {
          const ct =
            CARD_TYPES[obj.type] ||
            CARD_TYPES.unknown;

          const have = ownedCount(
            inventory,
            obj.type
          );

          const need = obj.qty;
          const met = have >= need;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-2.5 py-2 rounded-xl transition-all ${
                met
                  ? 'bg-[var(--neon-green-glow)]/15 border border-[var(--neon-green-glow)]/30'
                  : 'bg-[var(--neon-cyan)]/15'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {ct.symbol ? (
                    <img
                      src={ct.symbol}
                      alt={ct.label}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <Layers
                      size={18}
                      className={ct.color}
                    />
                  )}
                </div>

                <span
                  className={`font-bold text-xs sm:text-sm ${
                    met
                      ? 'text-[var(--neon-green-glow)]'
                      : 'text-slate-300'
                  }`}
                >
                  {need}× {getCardLabel(obj.type)}
                </span>
              </div>

              <span
                className={`font-mono text-[10px] sm:text-xs ${
                  met
                    ? 'text-[var(--neon-green-glow)]'
                    : 'text-slate-500'
                }`}
              >
                {Math.min(have, need)}/{need}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
})()}

        {isZombie && (
          <div className="rounded-2xl p-3 sm:p-4 mb-2" style={{ background: 'rgba(80,30,20,0.4)', border: '1px solid rgba(121,88,70,0.3)' }}>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1" style={{ color: '#795846' }}>
              <Skull size={12} /> {t('game_zombie_network')}
            </p>
            <p className="text-slate-400 text-[10px] sm:text-xs mb-2">{t('game_zombie_network_desc')}</p>
            {otherZombies.length === 0 ? (
              <p className="text-slate-600 text-xs italic">{t('game_only_zombie')}</p>
            ) : (
              <div className="space-y-1">
                {otherZombies.map(z => (
                  <div key={z.id} className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: '#d97559' }}>
                    <Skull size={14} style={{ color: '#d97559' }} />
                    <span className="font-semibold">{z.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isZombie && (
          <div className="rounded-2xl p-3 sm:p-4 mb-2 text-xs sm:text-sm text-slate-400" style={{ background: 'rgba(80,30,20,0.25)', border: '1px solid rgba(121,88,70,0.2)' }}>
            <p className="font-bold mb-1" style={{ color: '#d97559' }}>{t('game_zombie_objective')}</p>
            {t('game_zombie_objective_desc')}
          </div>
        )}

        {/* ── Trading phase (module & normal during round_active) ── */}
        {isModule && gamePhase === 'round_active' && !isDoneTrading && (
          <div className="rounded-2xl p-3 sm:p-4 mb-2" style={{ border: '1px solid rgba(218, 119, 204, 0.7)', background: 'rgba(66, 32, 66, 0.4)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5 text-[var(--neon-pink)]/90"><HandHelping size={12} />{t('game_go_trade')}</p>
            </div>
            <p className="text-[var(--neon-pink-glow)] text-[10px] sm:text-xs mb-2.5">{t('game_scanner_disabled')}</p>

{/* Accept / Decline mechanic only meaningful in m3/normal where
    passwords let you actually authenticate the other player. */}
{(gameMode === 'module_3' ||
  gameMode === 'normal') ? (
  <>
    <div className="mb-3">
      <select
        value={selectedTradePartner}
        onChange={(e) =>
          setSelectedTradePartner(
            e.target.value
          )
        }
        className="w-full p-2.5 rounded-xl bg-[var(--dark-cyan)]/90 text-[var(--neon-cyan)]/70 border border-[var(--neon-cyan)]/30 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/80"
      >
        <option value="">
          {t('game_select_trade_partner') ||
            'Select a player...'}
        </option>

        {gameState?.players
          ?.filter(
            p => p.id !== playerData?.id
          )
          .map(p => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.username}
            </option>
          ))}
      </select>
    </div>

    <div className="flex gap-2">
      <button
        disabled={!selectedTradePartner}
        onClick={() =>
          handleTradeAction('accept')
        }
        className={`flex-1 py-2.5 sm:py-3 font-bold rounded-xl transition-all text-xs sm:text-sm ${
          selectedTradePartner
            ? 'bg-[var(--neon-green)]/50 text-white active:scale-95 hover:bg-[var(--neon-green-glow)]/90'
            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
        }`}
      >
        {'Accept'}{' '}
        ✓
      </button>

      <button
        disabled={!selectedTradePartner}
        onClick={() =>
          handleTradeAction('decline')
        }
        className={`flex-1 py-2.5 sm:py-3 font-bold rounded-xl transition-all text-xs sm:text-sm ${
          selectedTradePartner
            ? 'bg-[var(--neon-pink)]/50 text-white active:scale-95 hover:bg-[var(--neon-pink)]/70'
            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
        }`}
      >
        {'Decline'}{' '}
        ✗
      </button>
    </div>
  </>
) : (
  <button
    onClick={() =>
      handleTradeAction(null)
    }
    className="w-full py-2.5 sm:py-3 font-bold rounded-xl transition-all text-xs sm:text-sm bg-[var(--neon-green)]/50 text-white active:scale-95 hover:bg-[var(--neon-green-glow)]/90"
  >
    {t('game_done_trading')} ✓
  </button>
)}

            {!hasSkippedTrade && (
              <div className="mt-2">
                <button
                  onClick={handleSkipTrade}
                  className="w-full py-2 sm:py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm bg-[var(--neon-cyan-glow)]/80 hover:bg-[var(--neon-cyan-glow)] text-white active:scale-95"
                >
                  {t('game_skip_round')} {t('game_skip_once')}
                </button>
              </div>
            )}
          </div>
        )}

        {isModule && gamePhase === 'round_active' && isDoneTrading && !isTimeUp && (
          <div className="rounded-2xl px-3 py-2.5 mb-2 text-center" style={{ background: 'rgba(40,80,40,0.3)', border: '1px solid rgba(100,200,100,0.2)' }}>
            <p className="text-[var(--neon-green-glow)] font-bold text-xs sm:text-sm animate-pulse">{t('game_already_done')}</p>
          </div>
        )}

        {isTimeUp && gamePhase === 'round_active' && (
          <div className="flex items-center justify-center gap-2 py-2 mb-2 rounded-xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-[10px] sm:text-xs font-mono text-cyan-500">{t('game_time_up')}…</p>
          </div>
        )}

        {showScanButton && gamePhase !== 'module_between_rounds' && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 mb-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isZombie ? 'linear-gradient(135deg, #795846, #d97559)' : 'linear-gradient(135deg, #454D3E, #6D7162)',
              boxShadow: `0 0 30px ${isZombie ? 'rgba(217,117,89,0.2)' : 'rgba(109,113,98,0.2)'}`,
            }}
          >
            <Camera size={22} /> {t('game_scan_card').toUpperCase()}
          </button>
        )}

        {gamePhase === 'module_between_rounds' && (() => {
  const totalPlayers =
    gameState?.players?.length || 0;

  const readyCount =
    gameState?.ready_count || 0;

  const waitingFor =
    gameState?.not_ready || [];

  const me =
    gameState?.players?.find(
      p => p.id === playerData?.id
    );

  const meScanned =
    !!me?.is_ready ||
    betweenRoundsDone;

  const meReadyForNext =
    scanPhaseComplete &&
    !!me?.is_ready;

  const nextRoundN =
    (gameState?.current_round || 0) +
    1;

  const isLastTransition =
    (gameState?.current_round || 0) >=
    3;

  // ── Phase A: SCANNING ─────────────────────
  if (!scanPhaseComplete) {
    return (
      <div className="mb-2 glass-panel p-3 sm:p-4 rounded-2xl">
        <h3
          className="text-base sm:text-xl mb-1 text-center"
          style={{ color: '#AD9E97' }}
        >
          {gameState?.current_round === 0
            ? t(
                'game_scan_starting_cards_title'
              )
            : t(
                'game_round_complete'
              ).replace(
                '{n}',
                gameState?.current_round
              )}
        </h3>

        <p className="text-slate-400 text-xs sm:text-sm mb-3 text-center">
          {gameState?.current_round === 0
            ? t(
                'game_scan_starting_cards_hint'
              )
            : t(
                'game_scan_round_items_hint'
              )}
        </p>

        {!meScanned ? (
          <button
            onClick={() =>
              setShowScanner(true)
            }
            className="w-full py-3 rounded-xl font-bold text-white mb-3"
            style={{
              background:
                'linear-gradient(135deg, #454D3E, #6D7162)'
            }}
          >
            <Camera
              size={16}
              className="inline mr-2"
            />
            {t('game_scan_card')}
          </button>
        ) : (
          <div
            className="w-full py-3 rounded-xl font-bold text-center text-sm mb-3"
            style={{
              background:
                'rgba(40,80,40,0.4)',
              border:
                '1px solid rgba(100,200,100,0.25)',
              color: '#a8c4a0'
            }}
          >
            ✓ {t('game_scan_card_done')}
          </div>
        )}

        <div
          className="rounded-xl overflow-hidden"
          style={{
            background:
              'rgba(109,113,98,0.08)',
            border:
              '1px solid rgba(109,113,98,0.2)'
          }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

              <p
                className="text-xs font-mono font-bold"
                style={{
                  color: '#6D7162'
                }}
              >
                {readyCount} /{' '}
                {totalPlayers}{' '}
                {t('game_players_scanned')}
              </p>
            </div>
          </div>

          {waitingFor.length > 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {waitingFor.map(
                (name, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{
                      background:
                        'rgba(80,60,50,0.5)',
                      color: '#AD9E97'
                    }}
                  >
                    ⏳ {name}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Phase B: READY GATE ───────────────────
  return (
    <div
      className="mb-2 glass-panel p-3 sm:p-4 rounded-2xl text-center"
      style={{
        border:
          '1px solid rgba(6,182,212,0.45)',
        boxShadow:
          '0 0 30px rgba(6,182,212,0.18)'
      }}
    >
      <div className="text-4xl sm:text-5xl mb-2 animate-zw-float">
        {isLastTransition ? '🏁' : '🚀'}
      </div>

      <h3
        className="font-black text-xl sm:text-2xl mb-1"
        style={{ color: '#06b6d4' }}
      >
        {isLastTransition
          ? t(
              'game_ready_for_game_over'
            )
          : t(
              'game_round_starting'
            ).replace(
              '{n}',
              nextRoundN
            )}
      </h3>

      <p className="text-slate-400 text-xs sm:text-sm mb-4">
        {t('game_round_starting_hint')}
      </p>

      {meReadyForNext ? (
        <div
          className="rounded-xl py-3 px-3"
          style={{
            background:
              'rgba(40,80,40,0.4)',
            border:
              '1px solid rgba(100,200,100,0.3)'
          }}
        >
          <p className="text-[var(--neon-green-glow)] font-bold text-sm mb-1">
            ✓ {t('game_youre_ready')}
          </p>

          <p className="text-xs text-slate-400">
            {readyCount}/{totalPlayers}{' '}
            {t('game_players_ready')}
            {waitingFor.length > 0 &&
              ` — ${t(
                'game_waiting_for'
              )} ${waitingFor.join(
                ', '
              )}`}
          </p>
        </div>
      ) : (
        <button
          onClick={handleNextRound}
          className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              'linear-gradient(135deg, #0891b2, #06b6d4)',
            boxShadow:
              '0 0 24px rgba(6,182,212,0.35)'
          }}
        >
          <CheckCircle2 size={22} />{' '}
          {t('game_im_ready')}
        </button>
      )}
    </div>
  );
})()}
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
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              {scanFeedback.status === 'success' && (() => {
                const ct = CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown;
                return (
                  <>
                    {ct.symbol ? (
                      <img src={ct.symbol} alt={ct.label} className="w-5 h-5 object-contain" />
                    ) : (
                      <Layers size={18} />
                    )}
                    {getCardLabel(scanFeedback.item?.type)} {t('game_scanned')}
                  </>
                );
              })()}
              {scanFeedback.status === 'error' && scanFeedback.message}
              {scanFeedback.status === 'scanning' && t('game_verifying')}
            </div>
          </div>
        )}

        <div className="border-2 border-[var(--neon-green)]/30 bg-[var(--neon-green)]/5 rounded-2xl p-3 sm:p-5">
          <h3 className="text-[10px] sm:text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5" style={{ color: '#58a551ff' }}>
            <Briefcase size={16} style={{ color: '#58a551ff' }} />
            {t('game_inventory')}
            <span className="ml-auto text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(19, 34, 21, 0.7)', color: 'var(--neon-light-green-glow)' }}>
              {inventory.length} {t('game_inventory_cards')}
            </span>
          </h3>
          {inventory.length === 0 ? (
            <p className="text-xs text-center py-3 font-mono" style={{ color: '#618d3bff' }}>
              {t('game_no_cards')}<br />{t('game_no_cards_hint')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {inventory.map((card, idx) => {
                const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedItem(card)}
                    className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border text-left w-full transition-all active:scale-[0.97] ${card.contaminated ? 'bg-rose-500/10 border-rose-500/30' : ct.bg}`}
                  >
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                      {ct.symbol ? (
                        <img src={ct.symbol} alt={ct.label} className="w-8 h-8 object-contain" />
                      ) : (
                        <Layers size={24} className={ct.color} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-xs sm:text-sm truncate ${ct.color}`}>{getCardLabel(card.type)}</p>
                      {card.contaminated && (
                        <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                          <Activity size={10} /> infected
                        </p>
                      )}
                      <p className="text-[10px] font-mono truncate" style={{ color: '#9b9b9bff' }}>{card.code}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
