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
import { useLanguage } from '../contexts/LanguageContext';

const CARD_TYPES = {
  security_patch:  { emoji: '🩹', label: 'Security Patch',  color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/30',     desc: 'A critical software fix that closes known vulnerabilities. Rare and highly valuable — every network needs it.' },
  system_boost:    { emoji: '⚡', label: 'System Boost',    color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/30', desc: 'Optimizes system performance and processing speed. Common but essential for keeping operations running smoothly.' },
  hacking_tool:    { emoji: '💻', label: 'Hacking Tool',    color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/30', desc: 'Offensive software used to probe and exploit systems. Powerful in the right hands — dangerous in the wrong ones.' },
  firewall:        { emoji: '🧱', label: 'Firewall',        color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/30',     desc: 'Blocks unauthorized access to your network. A solid defensive barrier that keeps threats from getting in.' },
  security_layer:  { emoji: '🔒', label: 'Security Layer',  color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30',desc: 'An additional encryption or access-control mechanism. Stacks with other defenses to make your system much harder to breach.' },
  unknown:         { emoji: '📦', label: 'Unknown',         color: 'text-slate-400',   bg: 'bg-slate-500/20 border-slate-500/30',   desc: 'Unidentified item. Scan it to reveal what type it is.' },
};

function getCardLabel(key) {
  return CARD_TYPES[key]?.label || 'Unknown';
}

function getModuleSlides(t) {
  return {
    module_1: [
      { type: 'story', emoji: '🌍', title: t('slide_m1_0_title'), text: t('slide_m1_0_text') },
      { type: 'info',  emoji: '📦', title: t('slide_m1_1_title'), text: t('slide_m1_1_text') },
      { type: 'info',  emoji: '🃏', title: t('slide_m1_2_title'), text: t('slide_m1_2_text') },
      { type: 'items', emoji: '🎴', title: t('slide_m1_3_title'), text: t('slide_m1_3_text') },
      { type: 'scan',  emoji: '📱', title: t('slide_m1_4_title'), text: t('slide_m1_4_text') },
      { type: 'objectives', emoji: '🎯', title: t('slide_m1_5_title'), text: t('slide_m1_5_text') },
      { type: 'final', emoji: '⏱️', title: t('slide_m1_6_title'), text: t('slide_m1_6_text') },
    ],
    module_2: [
      { type: 'story', emoji: '🧟', title: t('slide_m2_0_title'), text: t('slide_m2_0_text') },
      { type: 'info',  emoji: '🃏', title: t('slide_m2_1_title'), text: t('slide_m2_1_text') },
      { type: 'scan',  emoji: '📱', title: t('slide_m2_2_title'), text: t('slide_m2_2_text') },
      { type: 'info',  emoji: '☣️', title: t('slide_m2_3_title'), text: t('slide_m2_3_text') },
      { type: 'info',  emoji: '🦠', title: t('slide_m2_4_title'), text: t('slide_m2_4_text') },
      { type: 'role',  emoji: '🎭', title: t('slide_m2_5_title'), text: t('slide_m2_5_text') },
      { type: 'final', emoji: '⏭️', title: t('slide_m2_6_title'), text: t('slide_m2_6_text') },
    ],
    module_3: [
      { type: 'story', emoji: '🧠', title: t('slide_m3_0_title'), text: t('slide_m3_0_text') },
      { type: 'scan',  emoji: '🃏', title: t('slide_m3_1_title'), text: t('slide_m3_1_text') },
      { type: 'info',  emoji: '🎭', title: t('slide_m3_2_title'), text: t('slide_m3_2_text') },
      { type: 'info',  emoji: '🔑', title: t('slide_m3_3_title'), text: t('slide_m3_3_text') },
      { type: 'info',  emoji: '🤫', title: t('slide_m3_4_title'), text: t('slide_m3_4_text') },
      { type: 'hints', emoji: '💬', title: t('slide_m3_5_title'), lines: [
        { ok: true,  text: t('slide_m3_5_h1') },
        { ok: false, text: t('slide_m3_5_h2') },
        { ok: true,  text: t('slide_m3_5_h3') },
        { ok: false, text: t('slide_m3_5_h4') },
      ]},
      { type: 'final', emoji: '🧟', title: t('slide_m3_6_title'), text: t('slide_m3_6_text') },
    ],
  };
}

function getInfoSections(t) {
  return [
    { title: t('game_item_types_title'), items: Object.entries(CARD_TYPES).filter(([k]) => k !== 'unknown').map(([, ct]) => ({
      emoji: ct.emoji, label: ct.label, desc: ct.desc,
    }))},
    { title: t('game_roles_title'), items: [
      { emoji: '🛡️', label: t('game_survivor'),  desc: t('info_survivor_desc') },
      { emoji: '🧟', label: t('game_zombie'),    desc: t('info_zombie_desc') },
    ]},
    { title: t('game_mechanics_title'), items: [
      { emoji: '🔑', label: t('info_password'),   desc: t('info_password_desc') },
      { emoji: '🎯', label: t('info_objectives'), desc: t('info_objectives_desc') },
      { emoji: '⏭️', label: t('info_skip_round'), desc: t('info_skip_round_desc') },
    ]},
  ];
}

function getNormalSlides(t) {
  return [
    { type: 'story', emoji: '🌐', title: t('slide_n0_title'), text: t('slide_n0_text') },
    { type: 'info',  emoji: '🃏', title: t('slide_n1_title'), text: t('slide_n1_text') },
    { type: 'scan',  emoji: '📱', title: t('slide_n2_title'), text: t('slide_n2_text') },
    { type: 'info',  emoji: '🎯', title: t('slide_n3_title'), text: t('slide_n3_text') },
    { type: 'final', emoji: '⚡', title: t('slide_n4_title'), text: t('slide_n4_text') },
  ];
}

function RoleReveal({ role, secretWord, gameMode, onContinue, t }) {
  const isZombie = role === 'zombie';
  const cfg = isZombie
    ? { emoji: '🧟', label: t('game_zombie'),   color: '#d97559', border: 'rgba(217,117,89,0.5)', glow: 'rgba(217,117,89,0.3)', desc: t('game_zombie_desc') }
    : { emoji: '🛡️', label: t('game_survivor'), color: '#a8c4a0', border: 'rgba(168,196,160,0.5)', glow: 'rgba(168,196,160,0.25)', desc: t('game_survivor_desc') };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.97)' }}>
      <div className="relative text-center max-w-sm w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl" style={{ border: `2px solid ${cfg.border}` }}>
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-5 animate-zw-float">{cfg.emoji}</div>
          <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>{t('game_your_role')}</p>
          <h1 className="text-4xl sm:text-5xl font-black mb-3 sm:mb-4 uppercase" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
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
        <div className="text-5xl mb-3">🚫</div>
        <h3 className="text-xl font-black mb-2" style={{ color: '#d97559' }}>{t('game_card_taken_title')}</h3>
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

function InfectionAlert({ onDismiss, t }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(80,20,15,0.85)' }}>
      <div className="relative text-center max-w-xs w-full px-6">
        <div className="relative glass-panel p-8 rounded-3xl animate-zw-shake" style={{ border: '2px solid #d97559' }}>
          <div className="text-7xl mb-4 animate-bounce">🧟</div>
          <h2 className="text-4xl font-black mb-2" style={{ color: '#d97559' }}>{t('game_infected_title')}</h2>
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
    await scanner.start({ facingMode: { exact: 'environment' } }, config, handleResult, () => {});
    return true;
  } catch {
    try {
      await scanner.start({ facingMode: 'environment' }, config, handleResult, () => {});
      return true;
    } catch {
      // Fall back to explicit camera ID (useful for laptops / desktops)
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const back = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
          await scanner.start(back.id, config, handleResult, () => {});
          return true;
        }
      } catch { /* ignore */ }
      try {
        await scanner.start({ facingMode: 'user' }, config, handleResult, () => {});
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
        s.stop().catch(() => {});
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
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
      let result = text.trim();
      try { const parsed = JSON.parse(text); result = parsed.code || parsed.id || text; } catch {}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-zw-fade" style={{ background: 'rgba(26,22,18,0.92)' }}>
      <div className="relative rounded-3xl p-6 max-w-sm w-full mx-4" style={{ background: 'rgba(42,38,34,0.95)', border: '1px solid rgba(109,113,98,0.4)', backdropFilter: 'blur(20px)' }}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={24} /></button>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <Camera size={20} style={{ color: '#795846' }} /> {title}
        </h3>
        {hint && <p className="text-slate-500 text-sm mb-4">{hint}</p>}

        {needsPermission ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center text-center py-4 px-2">
              <div className="text-6xl mb-3">📷</div>
              <h4 className="text-lg font-black mb-2" style={{ color: '#AD9E97' }}>{t('scan_camera_needed')}</h4>
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
              <div className="text-center py-3 rounded-2xl" style={{ background: 'rgba(109,113,98,0.1)', border: '1px solid rgba(109,113,98,0.2)' }}>
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
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#AD9E97' }}>
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

function SlideContent({ slide, playerState, inventory, objectives, t }) {
  if (!slide) return null;
  const { type, emoji, title, text, lines } = slide;

  const cardLabel = (key) => getCardLabel(key);

  if (type === 'items') {
    return (
      <div className="text-center">
        <div className="text-5xl sm:text-7xl mb-4 sm:mb-6 animate-zw-float">{emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">{title}</h2>
        <p className="text-slate-400 mb-6">{text}</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
        <div className="text-5xl sm:text-7xl mb-4 sm:mb-6 animate-zw-float">{emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">{title}</h2>
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
                  <span className={`font-bold ${owned ? 'text-emerald-300' : 'text-slate-200'}`}>{getCardLabel(type)}</span>
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
      ? { emoji: '🧟', label: t('game_zombie'),   color: '#d97559', bg: 'rgba(80,30,20,0.6)', border: 'rgba(217,117,89,0.4)' }
      : { emoji: '🛡️', label: t('game_survivor'), color: '#a8c4a0', bg: 'rgba(30,50,35,0.6)', border: 'rgba(168,196,160,0.4)' };
    return (
      <div className="text-center">
        <div className="text-5xl sm:text-7xl mb-4 animate-zw-float">{cfg.emoji}</div>
        <p className="text-xs uppercase tracking-[0.3em] mb-1 font-mono" style={{ color: '#6D7162' }}>{t('game_your_role_is')}</p>
        <h2 className="text-4xl sm:text-5xl font-black mb-4 sm:mb-5 uppercase" style={{ color: cfg.color }}>{cfg.label}</h2>
        <div className="rounded-2xl p-4 mb-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <p className="text-slate-200 font-semibold text-lg">{text}</p>
        </div>
      </div>
    );
  }

  if (type === 'hints') {
    return (
      <div className="text-center">
        <div className="text-5xl sm:text-7xl mb-4 animate-zw-float">{emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-5">{title}</h2>
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
        <div className="text-6xl sm:text-8xl mb-5 sm:mb-8 animate-zw-float">{emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6" style={{ color: '#AD9E97' }}>{title}</h2>
        <div className="rounded-2xl p-6" style={{ background: 'rgba(56,44,37,0.4)', border: '1px solid rgba(109,113,98,0.2)' }}>
          {text.split('\n').map((line, i) => <p key={i} className="text-slate-300 text-base sm:text-lg leading-relaxed">{line}</p>)}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-6xl sm:text-8xl mb-5 sm:mb-8 animate-zw-float">{emoji}</div>
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-5">{title}</h2>
      <div className="space-y-1">
        {text.split('\n').map((line, i) => <p key={i} className="text-slate-300 text-base sm:text-lg leading-relaxed">{line}</p>)}
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

  let icon = '❓';
  let title = '';
  let body = '';
  let actions = [];

  if (gamePhase === 'module_instructions') {
    if (isScanSlide) {
      if (!scanDone) {
        icon = '📷';
        title = t('game_scan_starting_cards_title');
        body = t('wtd_body_scan_cards').replace('{n}', initialScanCount);
        actions = [{ label: `${t('game_scan_card_n')} ${initialScanCount + 1} ${t('game_of_4')}`, color: '#6D7162', onClick: () => { setOpen(false); onShowInitialScanner(); } }];
      } else {
        icon = '⏳';
        title = t('wtd_all_cards_scanned');
        body = t('wtd_body_all_scanned');
      }
    } else if (!meIsReady) {
      icon = '📖';
      title = isLast ? t('wtd_tap_ready') : t('wtd_read_and_next');
      body = isLast ? t('wtd_body_tap_ready') : t('wtd_body_read_next');
      actions = [{ label: isLast ? `${t('game_im_ready')} ✓` : `${t('game_next')} →`, color: '#a8c4a0', dark: true, onClick: () => { setOpen(false); onSlideReady(); } }];
    } else {
      icon = '✅';
      title = t('wtd_waiting_others');
      body = t('wtd_body_waiting');
    }
  } else if (gamePhase === 'round_active') {
    if (isModule) {
      if (!isDoneTrading) {
        icon = '🤝';
        title = t('wtd_go_trade');
        body = t('wtd_body_go_trade');
        actions = [
          { label: `${t('game_done_trading')} ✓`, color: '#4ade80', dark: true, onClick: () => { setOpen(false); onDoneTrading(); } },
          ...(!hasSkippedTrade ? [{ label: `${t('game_skip_round')} ${t('game_skip_once')}`, color: '#d97559', onClick: () => { setOpen(false); onSkipTrade(); } }] : []),
        ];
      } else {
        icon = '✅';
        title = t('wtd_done_trading_title');
        body = t('wtd_body_done_trading');
      }
    } else {
      icon = isZombie ? '🧟' : '📷';
      title = isZombie ? t('wtd_infect_others') : t('wtd_scan_card_title');
      body = isZombie ? t('wtd_body_zombie') : t('wtd_body_survivor');
      actions = [{ label: t('wtd_open_scanner'), color: '#6D7162', onClick: () => { setOpen(false); onOpenScanner(); } }];
    }
  } else if (gamePhase === 'module_between_rounds') {
    icon = '📦';
    title = t('wtd_scan_cards');
    body = t('wtd_body_between_rounds');
    actions = [{ label: t('wtd_open_scanner'), color: '#6D7162', onClick: () => { setOpen(false); onOpenScanner(); } }];
  } else {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ background: 'rgba(42,38,34,0.95)', border: '1px solid rgba(109,113,98,0.5)', color: '#AD9E97', backdropFilter: 'blur(12px)' }}
      >
        <span className="text-base leading-none">{icon}</span>
        {t('wtd_what_now')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(26,22,18,0.87)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'rgba(30,27,24,0.98)', border: '1px solid rgba(109,113,98,0.4)', backdropFilter: 'blur(24px)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(109,113,98,0.2)' }}>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{icon}</span>
                <h2 className="text-lg font-black" style={{ color: '#AD9E97' }}>{title}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">{body}</p>
              {actions.length > 0 && (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={a.onClick}
                      className="w-full py-3.5 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: a.color, color: a.dark ? '#0f1a0e' : '#fff' }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(109,113,98,0.15)', color: '#6D7162' }}>
                {t('wtd_got_it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const GameScreen = ({ mockData } = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { groupData, playerData } = location.state || (() => {
    try {
      const raw = localStorage.getItem('player_session');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  const [gameState, setGameState] = useState(mockData?.gameState || null);
  const [playerState, setPlayerState] = useState(mockData?.playerState || null);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showInitialScanner, setShowInitialScanner] = useState(false);
  const [showInfectionAlert, setShowInfectionAlert] = useState(false);
  const [cardTakenByPlayer, setCardTakenByPlayer] = useState(null);
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
      if (data.secret_word && me?.role !== 'zombie') {
        localStorage.setItem('active_secret_word', data.secret_word);
      } else if (!data.secret_word) {
        localStorage.removeItem('active_secret_word');
      }
      if (data.game_state === 'end_game') {
        localStorage.setItem('endgame_group_id', groupData.group_id);
        localStorage.removeItem('player_session');
        navigate('/endgame', { state: { groupId: groupData.group_id } });
      }
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
    if (lastMessage.type === 'ROUND_ENDED') {
      fetchState();
      // Auto-advance to next round after 5 s — no manual button needed
      setTimeout(async () => {
        try {
          await fetch(`${API_URLS.BASE}/api/game/${groupData?.group_id}/next_round`, { method: 'POST' });
        } catch (e) { console.error(e); }
      }, 5000);
    }
    if (lastMessage.type === 'GAME_ENDED') {
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
    } catch {
      setScanFeedback({ status: 'error', message: t('game_scan_failed') });
      setTimeout(() => setScanFeedback(null), 3000);
    }
  }, [groupData?.group_id, playerData?.id, playSFX, fetchState]);

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
      await fetch(`${API_URLS.BASE}/api/game/${groupData.group_id}/next_round`, { method: 'POST' });
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
        <div className="text-center"><div className="text-6xl mb-4 animate-zw-float">🧟</div>
          <p className="font-mono animate-pulse" style={{ color: '#6D7162' }}>{t('game_connecting')}</p></div>
      </div>
    );
  }

  const isZombie = playerState?.role === 'zombie';
  const gamePhase = gameState?.game_state || 'lobby';
  const gameMode = gameState?.game_mode || mockData?.gameState?.game_mode || 'module_1';
  const statusColor = isZombie ? '#d97559' : '#a8c4a0';
  const statusEmoji = isZombie ? '🧟' : '🛡️';
  const statusLabel = isZombie ? t('game_zombie') : t('game_survivor');
  const otherZombies = gameState?.players?.filter(p => p.is_infected && p.id !== playerData?.id) || [];

  if (gamePhase === 'module_instructions') {
    const isNormalMode = gameMode === 'normal';
    const MODULE_SLIDES = getModuleSlides(t);
    const slides = isNormalMode ? getNormalSlides(t) : (MODULE_SLIDES[gameMode] || MODULE_SLIDES.module_1);
    const slideIndex = isNormalMode
      ? (mockData ? 0 : localNormalSlideIndex)
      : (mockData ? 0 : (gameState?.instruction_slide ?? 0));
    const slide = slides[Math.min(slideIndex, slides.length - 1)];
    const isLast = slideIndex >= slides.length - 1;
    const isScanSlide = slide?.type === 'scan';
    const scanDone = initialScanCount >= 4;

    const readyCount = gameState?.ready_count ?? 0;
    const totalPlayers = gameState?.players?.length ?? 1;
    const notReady = gameState?.not_ready ?? [];

    const meIsReady = localSlideReady || (gameState?.players?.find(p => p.id === playerData?.id)?.is_ready ?? false);

    const handleNormalNext = () => {
      if (isLast) {
        setLocalSlideReady(true);
        handleSlideReady();
      } else {
        setLocalNormalSlideIndex(i => Math.min(i + 1, slides.length - 1));
      }
    };

    const handleNormalSkipAll = () => {
      setLocalNormalSlideIndex(slides.length - 1);
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
          onShowInitialScanner={() => setShowInitialScanner(true)}
          onSlideReady={handleSlideReady}
        />

        <div className="w-full max-w-lg">
          <div className="flex justify-center gap-1.5 mb-4 sm:mb-8">
            {slides.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${
                slideIndex === idx ? 'bg-cyan-400 w-8' :
                slideIndex > idx ? 'bg-slate-600 w-4' : 'bg-slate-800 w-4'
              }`} />
            ))}
          </div>

          <SlideContent
            slide={slide}
            playerState={playerState}
            inventory={inventory}
            objectives={objectives}
            t={t}
          />

          {isScanSlide && (
            <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-300 font-bold text-sm">{t('game_scanning_progress')}</span>
                <span className="font-black text-lg" style={{ color: scanDone ? '#a8c4a0' : '#AD9E97' }}>{initialScanCount}/4</span>
              </div>
              <div className="flex gap-2 mb-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`flex-1 h-2.5 rounded-full transition-all ${i < initialScanCount ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                ))}
              </div>

              {inventory.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {inventory.slice(0, 4).map((card, idx) => {
                    const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                    return (
                      <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border text-sm ${ct.bg}`}>
                        <span className="text-xl">{ct.emoji}</span>
                        <span className={`font-semibold ${ct.color}`}>{getCardLabel(card.type)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {scanFeedback && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 mb-3 ${scanFeedback.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : scanFeedback.status === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-300'}`}>
                  {scanFeedback.status === 'success' && <><Zap size={16} /> {(CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown).emoji} {t('game_scanned')}</>}
                  {scanFeedback.status === 'error' && <><AlertTriangle size={16} /> {scanFeedback.message}</>}
                  {scanFeedback.status === 'scanning' && <><Camera size={16} /> {t('game_verifying')}</>}
                </div>
              )}

              {scanDone ? (
                <div className="text-center py-2">
                  <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-emerald-400 font-black text-sm">{t('game_all_scanned')}</p>
                  <p className="text-slate-500 text-xs animate-pulse mt-0.5">{t('game_waiting_others_scan')}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowInitialScanner(true)}
                  className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg, #454D3E, #6D7162)' }}
                >
                  <Camera size={20} /> {t('game_scan_card_n')} {initialScanCount + 1} {t('game_of_4')}
                </button>
              )}
            </div>
          )}

          {!isScanSlide && (
            <div className="mt-8">
              {isNormalMode ? (
                meIsReady ? (
                  <div className="text-center py-4">
                    <CheckCircle2 size={28} className="text-cyan-400 mx-auto mb-2" />
                    <p className="text-cyan-400 font-bold">{t('game_youre_ready')}</p>
                    <p className="text-slate-500 text-xs mt-1 animate-pulse">{t('game_waiting_teacher_start')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleNormalNext}
                      className="w-full py-4 sm:py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={isLast
                        ? { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 0 30px rgba(6,182,212,0.25)', color: '#fff' }
                        : { background: '#a8c4a0', color: '#0f1a0e' }
                      }
                    >
                      {isLast ? <><CheckCircle2 size={22} /> {t('game_im_ready')}</> : <>{t('game_next')} <ChevronRight size={22} /></>}
                    </button>
                    {!isLast && (
                      <button
                        onClick={handleNormalSkipAll}
                        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: 'rgba(109,113,98,0.15)', color: '#6D7162' }}
                      >
                        {t('game_skip_all')}
                      </button>
                    )}
                  </div>
                )
              ) : (
                meIsReady ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle2 size={20} className="text-cyan-400" />
                      <span className="text-cyan-400 font-bold">{t('game_youre_ready')}</span>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.2)' }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Users size={14} style={{ color: '#6D7162' }} />
                        <span className="text-xs font-mono" style={{ color: '#6D7162' }}>
                          {readyCount}/{totalPlayers} {t('game_players_ready')}
                        </span>
                      </div>
                      {notReady.length > 0 && (
                        <p className="text-xs text-slate-600 text-center">
                          {t('game_waiting_for')} {notReady.join(', ')}…
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
                    className="w-full py-4 sm:py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={isLast
                      ? { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 0 30px rgba(6,182,212,0.25)', color: '#fff' }
                      : { background: '#a8c4a0', color: '#0f1a0e' }
                    }
                  >
                    {isLast ? <><CheckCircle2 size={22} /> {t('game_im_ready')}</> : <>{t('game_next')} <ChevronRight size={22} /></>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isTimeUp = gamePhase === 'round_active' && gameState?.round_end_time && (gameState.round_end_time - Math.floor(Date.now() / 1000)) <= 0;
  const isModule = gameMode?.startsWith('module');
  const isNormal = gameMode === 'normal';
  const showScanButton = !isModule || gamePhase !== 'round_active';

  return (
    <>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(26,22,18,0.87)' }} onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'rgba(30,27,24,0.99)', border: `2px solid ${(CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).bg.split(' ')[0].replace('bg-', 'rgba(').replace('/20', ',0.5)')}`, backdropFilter: 'blur(24px)' }} onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="text-6xl mb-3">{(CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).emoji}</div>
              <h2 className={`text-2xl font-black mb-1 ${(CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).color}`}>
                {getCardLabel(selectedItem.type)}
              </h2>
              <p className="text-xs font-mono mb-4" style={{ color: '#454D3E' }}>{selectedItem.code}</p>
              <div className="rounded-2xl p-4 mb-4 text-left" style={{ background: 'rgba(56,44,37,0.5)', border: '1px solid rgba(109,113,98,0.2)' }}>
                <p className="text-slate-300 text-sm leading-relaxed">{(CARD_TYPES[selectedItem.type] || CARD_TYPES.unknown).desc}</p>
              </div>
              {selectedItem.contaminated && (
                <div className="rounded-xl px-4 py-2 mb-4 text-sm font-bold text-rose-400 flex items-center justify-center gap-2" style={{ background: 'rgba(80,30,20,0.5)', border: '1px solid rgba(217,117,89,0.3)' }}>
                  {t('game_contaminated')}
                </div>
              )}
              <button onClick={() => setSelectedItem(null)} className="w-full py-3 rounded-2xl font-bold text-slate-300 transition-all" style={{ background: 'rgba(109,113,98,0.2)' }}>
                {t('game_close')}
              </button>
            </div>
          </div>
        </div>
      )}
      <AudioToggle toggle={toggle} isEnabled={isEnabled} />

      <WhatToDoNow
        gamePhase={gamePhase}
        isModule={isModule}
        isDoneTrading={isDoneTrading}
        hasSkippedTrade={hasSkippedTrade}
        isZombie={isZombie}
        initialScanCount={initialScanCount}
        onDoneTrading={handleDoneTrading}
        onSkipTrade={handleSkipTrade}
        onOpenScanner={() => setShowScanner(true)}
      />

      <button
        onClick={() => setShowInfoModal(true)}
        className="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(121,88,70,0.8)', border: '1px solid rgba(173,158,151,0.4)' }}
      >
        <HelpCircle size={22} style={{ color: '#AD9E97' }} />
      </button>

      <div className="max-w-lg mx-auto py-3 px-3 animate-zw-fade pb-24">

        <div className="rounded-2xl p-5 mb-3 flex items-center justify-between"
             style={{ background: `rgba(${isZombie ? '80,30,20' : '30,50,35'},0.6)`, border: `2px solid ${statusColor}33` }}>
          <div className="flex items-center gap-4">
            <span className="text-3xl sm:text-5xl">{statusEmoji}</span>
            <div>
              <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: '#6D7162' }}>{t('game_your_role')}</p>
              <p className="text-xl sm:text-3xl font-black uppercase" style={{ color: statusColor }}>{statusLabel}</p>
              {gameMode === 'module_1' && <p className="text-xs text-slate-500 mt-0.5">{t('game_module1_survivors_only')}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono mb-1" style={{ color: '#6D7162' }}>{t('game_round')}</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{gameState?.current_round || '-'}</p>
            <p className="text-xs font-mono" style={{ color: '#6D7162' }}>{t('game_of_3')}</p>
          </div>
        </div>

        {!isZombie && gameState?.secret_word && (
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ background: 'rgba(40,55,40,0.4)', border: '1px solid rgba(168,196,160,0.25)' }}>
            <Shield size={20} style={{ color: '#a8c4a0' }} />
            <div>
              <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{t('game_secret_password')}</p>
              <p className="text-lg sm:text-2xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>{gameState.secret_word}</p>
            </div>
          </div>
        )}

        {gameState?.round_end_time && gamePhase === 'round_active' && (
          <TimerBar endTime={gameState.round_end_time} label={t('game_round_timer')} />
        )}

        {objectives.length > 0 && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
            <p className="text-xs uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5" style={{ color: '#6D7162' }}>
              <Target size={12} /> {t('game_your_objectives')}
            </p>
            <div className="space-y-2">
              {objectives.map((type, idx) => {
                const ct = CARD_TYPES[type] || CARD_TYPES.unknown;
                const owned = inventory.some(c => c.type === type);
                return (
                  <div key={idx} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${owned ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-800/40'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{ct.emoji}</span>
                      <span className={`font-bold text-sm ${owned ? 'text-emerald-300' : 'text-slate-300'}`}>{getCardLabel(type)}</span>
                    </div>
                    {owned ? <CheckCircle2 size={18} className="text-emerald-400" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-600" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isZombie && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(80,30,20,0.4)', border: '1px solid rgba(121,88,70,0.3)' }}>
            <p className="text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1" style={{ color: '#795846' }}>
              <Skull size={12} /> {t('game_zombie_network')}
            </p>
            <p className="text-slate-400 text-xs mb-3">{t('game_zombie_network_desc')}</p>
            {otherZombies.length === 0 ? (
              <p className="text-slate-600 text-xs italic">{t('game_only_zombie')}</p>
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

        {isZombie && (
          <div className="rounded-2xl p-4 mb-3 text-sm text-slate-400" style={{ background: 'rgba(80,30,20,0.25)', border: '1px solid rgba(121,88,70,0.2)' }}>
            <p className="font-bold mb-1" style={{ color: '#d97559' }}>{t('game_zombie_objective')}</p>
            {t('game_zombie_objective_desc')}
          </div>
        )}

        {showScanButton ? (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-5 rounded-2xl font-black text-white text-xl flex items-center justify-center gap-3 mb-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isZombie ? 'linear-gradient(135deg, #795846, #d97559)' : 'linear-gradient(135deg, #454D3E, #6D7162)',
              boxShadow: `0 0 30px ${isZombie ? 'rgba(217,117,89,0.2)' : 'rgba(109,113,98,0.2)'}`,
            }}
          >
            <Camera size={28} /> {t('game_scan_card').toUpperCase()}
          </button>
        ) : (
          <div className="text-center p-6 mb-3 rounded-2xl" style={{ border: '2px dashed rgba(109,113,98,0.4)', background: 'rgba(56,44,37,0.4)' }}>
            <div className="text-4xl mb-2 animate-bounce">🤝</div>
            <p className="font-bold text-lg" style={{ color: '#AD9E97' }}>{t('game_go_trade')}</p>
            <p className="text-slate-500 text-sm mb-4">{t('game_scanner_disabled')}</p>
            {!isDoneTrading ? (
              <div className="flex gap-2">
                <button onClick={handleDoneTrading} className="flex-1 py-3 bg-emerald-600/80 text-white font-bold rounded-xl active:scale-95 transition-all text-sm">
                  {t('game_done_trading')}
                </button>
                <button
                  onClick={handleSkipTrade}
                  disabled={hasSkippedTrade}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all text-sm ${hasSkippedTrade ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-600/80 text-white active:scale-95'}`}
                >
                  {t('game_skip_round')} {hasSkippedTrade ? t('game_skip_used') : t('game_skip_once')}
                </button>
              </div>
            ) : (
              <p className="text-emerald-400 font-bold animate-pulse">{t('game_already_done')}</p>
            )}
            {isTimeUp && (
              <div className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-xs font-mono text-cyan-500">{t('game_time_up')}…</p>
              </div>
            )}
          </div>
        )}

        {isNormal && gamePhase === 'round_active' && (
          <div className="mb-3 rounded-2xl p-4" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
            <p className="text-xs uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5" style={{ color: '#6D7162' }}>
              {t('game_trading_label')}
            </p>
            {!isDoneTrading ? (
              <div className="flex gap-2">
                <button onClick={handleDoneTrading} className="flex-1 py-3 bg-emerald-600/80 text-white font-bold rounded-xl active:scale-95 transition-all text-sm">
                  {t('game_done_trading')}
                </button>
                <button
                  onClick={handleSkipTrade}
                  disabled={hasSkippedTrade}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all text-sm ${hasSkippedTrade ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-600/80 text-white active:scale-95'}`}
                >
                  {t('game_skip_round')} {hasSkippedTrade ? t('game_skip_used') : t('game_skip_once')}
                </button>
              </div>
            ) : (
              <p className="text-emerald-400 font-bold text-sm animate-pulse text-center">{t('game_already_done')}</p>
            )}
          </div>
        )}

        {gamePhase === 'module_between_rounds' && (
          <div className="mb-3 glass-panel p-4 rounded-2xl text-center">
            <h3 className="font-black text-xl mb-1" style={{ color: '#AD9E97' }}>
              {gameState?.current_round === 0 ? t('game_scan_starting_cards_title') : t('game_round_complete').replace('{n}', gameState?.current_round)}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {gameState?.current_round === 0 ? t('game_scan_starting_cards_hint') : t('game_scan_round_items_hint')}
            </p>
            <button onClick={() => setShowScanner(true)} className="w-full py-3 rounded-xl font-bold text-white mb-3" style={{ background: 'linear-gradient(135deg, #454D3E, #6D7162)' }}>
              <Camera size={16} className="inline mr-2" />{t('game_scan_card')}
            </button>
            <div className="flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'rgba(109,113,98,0.1)', border: '1px solid rgba(109,113,98,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-xs font-mono" style={{ color: '#6D7162' }}>
                {gameState?.current_round >= 3 ? t('game_ready_for_game_over') : t('game_ready_for_next_round')}…
              </p>
            </div>
          </div>
        )}

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
              {scanFeedback.status === 'success' && (() => { const ct = CARD_TYPES[scanFeedback.item?.type] || CARD_TYPES.unknown; return `${ct.emoji} ${getCardLabel(scanFeedback.item?.type)} ${t('game_scanned')}`; })()}
              {scanFeedback.status === 'error' && scanFeedback.message}
              {scanFeedback.status === 'scanning' && t('game_verifying')}
            </p>
          </div>
        )}

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
            <Package size={18} style={{ color: '#795846' }} />
            {t('game_inventory')}
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(56,44,37,0.7)', color: '#6D7162' }}>
              {inventory.length} {t('game_inventory_cards')}
            </span>
          </h3>
          {inventory.length === 0 ? (
            <p className="text-xs text-center py-4 font-mono" style={{ color: '#454D3E' }}>
              {t('game_no_cards')}<br />{t('game_no_cards_hint')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inventory.map((card, idx) => {
                const ct = CARD_TYPES[card.type] || CARD_TYPES.unknown;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedItem(card)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left w-full transition-all hover:scale-[1.02] active:scale-[0.98] ${card.contaminated ? 'bg-rose-500/10 border-rose-500/30' : ct.bg}`}
                  >
                    <span className="text-2xl">{ct.emoji}</span>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${ct.color}`}>{getCardLabel(card.type)}</p>
                      {card.contaminated && <p className="text-xs text-rose-400 font-mono">☣️ infected</p>}
                      <p className="text-xs font-mono truncate" style={{ color: '#454D3E' }}>{card.code}</p>
                    </div>
                  </button>
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
