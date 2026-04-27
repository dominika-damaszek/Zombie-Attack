import { useEffect, useRef, useCallback } from 'react';

// Tone frequencies (Hz) for Web Audio SFX
const SFX = {
  scan_success: [440, 550, 660],
  infected:     [220, 180, 140],
  role_reveal:  [330, 440, 550, 660],
  button_click: [600],
};

export function useAudio() {
  const ctxRef = useRef(null);
  const enabledRef = useRef(
    localStorage.getItem('zw_audio') !== 'off'
  );

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const playSFX = useCallback((name) => {
    if (!enabledRef.current) return;
    const freqs = SFX[name];
    if (!freqs) return;
    try {
      const ctx = getCtx();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch (e) { /* silently ignore */ }
  }, [getCtx]);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    localStorage.setItem('zw_audio', enabledRef.current ? 'on' : 'off');
    return enabledRef.current;
  }, []);

  const isEnabled = () => enabledRef.current;

  return { playSFX, toggle, isEnabled };
}
