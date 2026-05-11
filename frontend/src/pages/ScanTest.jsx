import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle2, AlertTriangle, Trash2, ScanLine } from 'lucide-react';

const KNOWN_CODES = new Set([
  "QRC-8F2K9L1M", "QRC-4X7P3N8V", "QRC-9B6T2R5Y", "QRC-1M8Z4K7Q", "QRC-7D3L9W2X",
  "QRC-5H1V8N4P", "QRC-2R7Y6F9K", "QRC-8J4Q1T3M", "QRC-6N9X2L5B", "QRC-3P7K8V1D",
  "QRC-9W2M4R6H", "QRC-1X5T7N8J", "QRC-4L9B2Q6Y", "QRC-7V3K1M8F", "QRC-2H6P9X4T",
  "QRC-8R1D5N7W", "QRC-5Q7L3V9K", "QRC-3T8M2Y6P", "QRC-9N4F1X7J", "QRC-6K2W8R5L",
  "QRC-1P9V4T3H", "QRC-7X5M2Q8D", "QRC-4R8N6L1Y", "QRC-2J3K9W7P", "QRC-8B6T1V4M",
  "QRC-5Y2L7Q9X", "QRC-3N8P4R6K", "QRC-9D1M5T7H", "QRC-6V4X2K8J", "QRC-1Q7W9L3F",
  "QRC-7P2N6Y8R", "QRC-4M9K1T5D", "QRC-2X8V3L7H", "QRC-8T5Q4N1J", "QRC-5R7B9M2W",
  "QRC-3L1Y6K8P", "QRC-9H4X7T2V", "QRC-6N8Q5P1D", "QRC-1V3M9R7K", "QRC-7K2T8L4Y",
  "QRC-4P6X1N9J", "QRC-2W7M5Q3H", "QRC-8D4R9V6L", "QRC-5J1T7K2P", "QRC-3X9N4B8F",
  "QRC-9Q6L2M5W", "QRC-6Y3P8T1D", "QRC-1R7V4K9H", "QRC-7N2X6Q5J", "QRC-4T8M1L3P",
  "QRC-2K5W9R7D", "QRC-8V1P4Y6N", "QRC-5M7Q2T8H", "QRC-5Q3T4K7D",
]);

const TEST_CARDS = [
  { label: 'Security Patch', symbol: '/icon-security-patch.png', color: 'text-[var(--neon-green-glow)]/70', bg: 'bg-[var(--neon-green-glow)]/10 border-[var(--neon-light-green)]' },
  { label: 'System Boost', symbol: '/icon-system-boost.png', color: 'text-[#eb9844]/80', bg: 'bg-[#eb9844]/20 border-[#f2cfab]' },
  { label: 'Firewall', symbol: '/icon-firewall.png', color: 'text-[var(--neon-cyan)]/70', bg: 'bg-[var(--neon-cyan-glow)]/20 border-[var(--neon-cyan)]' },
  { label: 'Security Layer', symbol: '/icon-security-layer.png', color: 'text-[#e2bdfe]/70', bg: 'bg-[#bd68fd]/20 border-[#e2bdfe]' },
  { label: 'Hacking Tool', symbol: '/icon-hacking-tool.png', color: 'text-[#b8708b]/90', bg: 'bg-[#a75373]/30 border-[#ddbbc8]' }
];

const READER_ID = 'qr-test-reader';

export default function ScanTest() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [lastFlash, setLastFlash] = useState(null);
  const scannerRef = useRef(null);

  // Start scanner AFTER React has rendered the div into the DOM
  useEffect(() => {
    if (!scanning) return;

    let active = true;
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    const handleResult = (text) => {
      if (!active) return;
      let code = text.trim();
      try { const p = JSON.parse(text); code = p.code || p.id || text; } catch { }
      code = code.toUpperCase();
      const known = KNOWN_CODES.has(code);

      setResults(prev => {
        if (prev.find(r => r.code === code)) {
          setLastFlash({ code, duplicate: true });
          setTimeout(() => setLastFlash(null), 1500);
          return prev;
        }
        setLastFlash({ code, duplicate: false, known });
        setTimeout(() => setLastFlash(null), 1500);
        return [{ code, known, ts: Date.now() }, ...prev];
      });
    };

    const start = async () => {
      const config = { fps: 10, qrbox: { width: 260, height: 260 } };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) throw new Error('no cameras');
        const back = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
        await scanner.start(back.id, config, handleResult, () => { });
      } catch {
        try {
          await scanner.start({ facingMode: 'environment' }, config, handleResult, () => { });
        } catch {
          try {
            await scanner.start({ facingMode: 'user' }, config, handleResult, () => { });
          } catch {
            if (active) {
              setError('Camera access denied. Please tap Allow when the browser asks for camera permission, then try again.');
              setScanning(false);
            }
          }
        }
      }
    };

    start();

    return () => {
      active = false;
      scanner.stop().catch(() => { });
      scannerRef.current = null;
    };
  }, [scanning]);

  const validCount = results.filter(r => r.known).length;
  const invalidCount = results.filter(r => !r.known).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 relative overflow-hidden max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Scan cards
        </h1>
        <p className="text-slate-500 text-sm mt-1">Scan your physical cards to verify the camera is reading them correctly</p>
      </div>

      {/* Item legend */}
      <div className="glass-panel rounded-2xl p-4 mb-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-3">Possible Items</p>
        <div className="flex flex-wrap gap-6 gap-y-5 justify-center mb-7">
          {TEST_CARDS.map(item => (
            <span key={item.label} className={`shadow-[0_0_15px_currentColor] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${item.bg} ${item.color}`}>
              <img src={item.symbol} alt="" className="w-8 h-8 object-cover" /> {item.label}
            </span>
          ))}
        </div>
        <p className="text-slate-600 text-xs mt-3 italic">Item assignment pending — types will be mapped when cards arrive.</p>
      </div>

      {/* Scanner panel */}
      <div className="glass-panel rounded-3xl p-5 mb-5 w-[100%]">

        {/* The reader div must ALWAYS be in the DOM so Html5Qrcode can find it.
            We hide it visually when not scanning. */}
        <div
          id={READER_ID}
          className="w-full rounded-2xl overflow-hidden mb-4  p-5transition-all"
          style={{
            minHeight: scanning ? 280 : 0,
            maxHeight: scanning ? 500 : 0,
            border: scanning ? '2px solid rgba(52,211,153,0.3)' : 'none',
            overflow: 'hidden',
          }}
        />

        {!scanning && (
          <>
            {error && (
              <div className="p-4 rounded-xl text-sm mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400">{error}</div>
            )}
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <ScanLine size={48} className="mb-3 opacity-40" />
              <p className="text-sm">Camera is off</p>
            </div>
          </>
        )}

        {/* Flash feedback */}
        {lastFlash && (
          <div className={`text-center py-3 px-4 rounded-xl mb-3 font-semibold text-sm ${lastFlash.duplicate
            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
            : lastFlash.known
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}>
            {lastFlash.duplicate
              ? `⚠️ Already scanned: ${lastFlash.code}`
              : lastFlash.known
                ? `✅ Valid card: ${lastFlash.code}`
                : `❌ Unknown code: ${lastFlash.code}`}
          </div>
        )}

        {scanning ? (
          <button
            onClick={() => setScanning(false)}
            className="neon-btn-alt w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 bg-[var(--neon-cyan-glow)]/50 hover:bg-[var(--neon-cyan-glow)]/80 text-slate-200 transition-all"
          >
            <X size={18} /> Stop Camera
          </button>
        ) : (
          <button
            onClick={() => { setError(null); setScanning(true); }}
            className="w-full p-4 rounded-2xl font-black flex items-center justify-center gap-2 text-white transition-all text-lg neon-btn"
          >
            <Camera size={20} /> Start Camera
          </button>
        )}
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Scanned', value: results.length, color: 'text-white' },
            { label: 'Valid', value: validCount, color: 'text-emerald-400' },
            { label: 'Invalid', value: invalidCount, color: 'text-rose-400' },
          ].map(s => (
            <div key={s.label} className="flex-1 glass-panel rounded-2xl p-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Result list */}
      {results.length > 0 && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">Scanned Codes</p>
            <button
              onClick={() => setResults([])}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${r.known
                  ? 'bg-[var(--neon-green-glow)]/10 border-[var(--neon-green-glow)]/40'
                  : 'bg-[#d95959]/10 border-[#d95959]/60'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {r.known
                    ? <CheckCircle2 size={15} className="text-[var(--neon-green-glow)] flex-shrink-0" />
                    : <AlertTriangle size={15} className="text-[#d95959] flex-shrink-0" />}
                  <span className="font-mono text-sm font-bold text-white">{r.code}</span>
                </div>
                <span className={`text-xs font-semibold ${r.known ? 'text-[var(--neon-green-glow)]' : 'text-[#d95959]'}`}>
                  {r.known ? 'Valid' : 'Not found'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
