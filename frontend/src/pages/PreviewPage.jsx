import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, Shield, Skull, Package, Camera, Target, CheckCircle2 } from 'lucide-react';

const CARD_TYPES = {
  remedio:     { emoji: '💊', label: 'Medicine',  color: 'text-rose-400',    bg: 'bg-rose-500/20 border-rose-500/30' },
  comida:      { emoji: '🍎', label: 'Food',      color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  arma:        { emoji: '🔫', label: 'Weapon',    color: 'text-orange-400',  bg: 'bg-orange-500/20 border-orange-500/30' },
  roupa:       { emoji: '👕', label: 'Clothing',  color: 'text-blue-400',    bg: 'bg-blue-500/20 border-blue-500/30' },
  ferramentas: { emoji: '🔧', label: 'Tools',     color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/30' },
};

const SLIDES = [
  { emoji: '🌐', title: 'Welcome to Zombieware', text: 'You are about to experience a simulation of how data moves through a network. Each player is a node — connected, vulnerable, and important.' },
  { emoji: '🃏', title: 'Your Physical Cards',   text: 'Each of you has 4 physical item cards. These represent files and data packets being shared across the network.' },
  { emoji: '🤝', title: 'How to Trade',          text: 'Walk around the room and exchange one card with another player per round. Face to face — just like peer-to-peer file sharing.' },
  { emoji: '🎯', title: 'Your Objectives',       text: 'You have 3 secret objectives — 3 card types you must collect. Trade strategically to complete all 3 goals!' },
  { emoji: '📱', title: 'Scanning Cards',        text: 'At the end of each round, scan every card in your hand. This logs the data transfer on the network. Do NOT scan during trading!' },
  { emoji: '✅', title: 'Ready to Start!',       text: 'You will now scan your 4 starting cards to register them on the network. When you\'re done reading, press "I\'m Ready!" below.' },
];

const MOCK_INVENTORY = [
  { code: 'ZW-MED-01',  type: 'remedio',     contaminated: false },
  { code: 'ZW-FOOD-03', type: 'comida',      contaminated: false },
  { code: 'ZW-ARM-02',  type: 'arma',        contaminated: true  },
  { code: 'ZW-CLO-07',  type: 'roupa',       contaminated: false },
];

const MOCK_OBJECTIVES = ['comida', 'arma', 'ferramentas'];

const SCENES = [
  { id: 'instructions',    label: '📘 Instructions',       desc: 'Full-screen instruction slides before game starts' },
  { id: 'initial_scan',    label: '📱 Initial Scan',        desc: 'Players scan their 4 starting cards' },
  { id: 'game_survivor',   label: '🛡️ Game — Survivor',    desc: 'Main game dashboard for a survivor player' },
  { id: 'game_zombie',     label: '🧟 Game — Zombie',       desc: 'Main game dashboard for a zombie player' },
  { id: 'trading_phase',   label: '🤝 Trading Phase',       desc: 'Round active — no scanning allowed, trading in progress' },
  { id: 'between_rounds',  label: '📡 Between Rounds',      desc: 'End-of-round scan phase' },
];

function InstructionsPreview() {
  const [slide, setSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const isLast = slide === SLIDES.length - 1;
  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center gap-2 mb-10">
          {SLIDES.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${slide === i ? 'bg-cyan-400 w-8' : slide > i ? 'bg-slate-600 w-4' : 'bg-slate-800 w-4'}`} />
          ))}
        </div>
        <div className="text-center">
          <div className="text-8xl mb-8">{SLIDES[slide].emoji}</div>
          <h2 className="text-3xl font-black text-white mb-5">{SLIDES[slide].title}</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-12 max-w-md mx-auto">{SLIDES[slide].text}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSlide(i => Math.max(0, i - 1))} disabled={slide === 0}
            className={`flex items-center gap-1 py-4 px-5 rounded-2xl font-bold text-sm ${slide === 0 ? 'opacity-20 cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-slate-800 text-slate-300'}`}>
            <ChevronLeft size={20} /> Back
          </button>
          {isLast ? (
            <button onClick={() => setReady(true)} disabled={ready}
              className="flex-1 py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
              <CheckCircle2 size={22} />{ready ? "Waiting for others..." : "I'm Ready!"}
            </button>
          ) : (
            <button onClick={() => setSlide(i => Math.min(SLIDES.length - 1, i + 1))}
              className="flex-1 py-4 rounded-2xl font-black text-lg text-slate-900 flex items-center justify-center gap-2"
              style={{ background: '#a8c4a0' }}>
              Next <ChevronRight size={22} />
            </button>
          )}
        </div>
        <p className="text-center text-slate-700 text-xs mt-4">Press Space or → to advance</p>
      </div>
    </div>
  );
}

function InitialScanPreview() {
  const [count, setCount] = useState(2);
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-3xl font-black text-white mb-2">Scan Your Cards</h2>
          <p className="text-slate-400">Scan all 4 physical cards to register them on the network</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-300 font-bold">Progress</span>
            <span className="font-black text-xl text-white">{count}/4</span>
          </div>
          <div className="flex gap-2 mb-5">
            {[0,1,2,3].map(i => (
              <div key={i} className={`flex-1 h-3 rounded-full ${i < count ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {MOCK_INVENTORY.slice(0, count).map((card, idx) => {
              const ct = CARD_TYPES[card.type];
              return (
                <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm ${ct.bg}`}>
                  <span className="text-xl">{ct.emoji}</span>
                  <span className={`font-semibold ${ct.color}`}>{ct.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setCount(c => Math.max(0, c - 1))} className="flex-1 py-3 rounded-xl font-bold bg-slate-700 text-slate-300 text-sm">- Remove</button>
            <button onClick={() => setCount(c => Math.min(4, c + 1))} disabled={count >= 4}
              className="flex-1 py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#454D3E,#6D7162)' }}>
              <Camera size={18} /> Scan {count + 1}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameDashPreview({ role }) {
  const isZombie = role === 'zombie';
  const statusColor = isZombie ? '#d97559' : '#a8c4a0';
  const statusEmoji = isZombie ? '🧟' : '🛡️';
  const statusLabel = isZombie ? 'Zombie' : 'Survivor';
  const inventory = isZombie
    ? MOCK_INVENTORY.map(c => ({ ...c, contaminated: true }))
    : MOCK_INVENTORY.slice(0, 3);
  const objectives = MOCK_OBJECTIVES;
  const otherZombies = ['alice', 'bob'];

  return (
    <div className="max-w-lg mx-auto py-4 px-3 pb-20">
      {/* Role */}
      <div className="rounded-2xl p-5 mb-3 flex items-center justify-between"
           style={{ background: `rgba(${isZombie ? '80,30,20' : '30,50,35'},0.6)`, border: `2px solid ${statusColor}33` }}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{statusEmoji}</span>
          <div>
            <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: '#6D7162' }}>Your Role</p>
            <p className="text-3xl font-black uppercase" style={{ color: statusColor }}>{statusLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono mb-1" style={{ color: '#6D7162' }}>Round</p>
          <p className="text-3xl font-black text-white">2</p>
          <p className="text-xs font-mono" style={{ color: '#6D7162' }}>of 3</p>
        </div>
      </div>

      {/* Password */}
      {!isZombie && (
        <div className="rounded-2xl p-4 mb-3 flex items-center gap-3" style={{ background: 'rgba(40,55,40,0.4)', border: '1px solid rgba(168,196,160,0.25)' }}>
          <Shield size={20} style={{ color: '#a8c4a0' }} />
          <div>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#a8c4a0' }}>Secret Password</p>
            <p className="text-2xl font-black tracking-widest font-mono" style={{ color: '#a8c4a0' }}>VAULT</p>
          </div>
        </div>
      )}

      {/* Objectives */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(42,38,34,0.6)', border: '1px solid rgba(109,113,98,0.3)' }}>
        <p className="text-xs uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5" style={{ color: '#6D7162' }}>
          <Target size={12} /> Your Objectives
        </p>
        <div className="space-y-2">
          {objectives.map((type, idx) => {
            const ct = CARD_TYPES[type] || { emoji: '📦', label: type, color: 'text-slate-400', bg: '' };
            const owned = inventory.some(c => c.type === type);
            return (
              <div key={idx} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${owned ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-800/40'}`}>
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

      {/* Zombie network */}
      {isZombie && (
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(80,30,20,0.4)', border: '1px solid rgba(121,88,70,0.3)' }}>
          <p className="text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1" style={{ color: '#795846' }}>
            <Skull size={12} /> Zombie Network
          </p>
          <div className="space-y-1.5">
            {otherZombies.map(z => (
              <div key={z} className="flex items-center gap-2 text-sm" style={{ color: '#d97559' }}>
                <span>🧟</span><span className="font-semibold">{z}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan button */}
      <button className="w-full py-5 rounded-2xl font-black text-white text-xl flex items-center justify-center gap-3 mb-3"
        style={{ background: isZombie ? 'linear-gradient(135deg,#795846,#d97559)' : 'linear-gradient(135deg,#454D3E,#6D7162)' }}>
        <Camera size={28} /> SCAN ITEM
      </button>

      {/* Inventory */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#AD9E97' }}>
          <Package size={18} style={{ color: '#795846' }} />
          Inventory
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(56,44,37,0.7)', color: '#6D7162' }}>{inventory.length} cards</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {inventory.map((card, idx) => {
            const ct = CARD_TYPES[card.type] || { emoji: '📦', label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' };
            return (
              <div key={idx} className={`flex items-center gap-2 p-3 rounded-xl border ${card.contaminated ? 'bg-rose-500/10 border-rose-500/30' : ct.bg}`}>
                <span className="text-2xl">{ct.emoji}</span>
                <div>
                  <p className={`font-bold text-sm ${ct.color}`}>{ct.label}</p>
                  {card.contaminated && <p className="text-xs text-rose-400">☣️ infected</p>}
                  <p className="text-xs font-mono" style={{ color: '#454D3E' }}>{card.code}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TradingPhasePreview() {
  return (
    <div className="max-w-lg mx-auto py-4 px-3">
      <div className="rounded-2xl p-5 mb-3 flex items-center justify-between"
           style={{ background: 'rgba(30,50,35,0.6)', border: '2px solid rgba(168,196,160,0.2)' }}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">🛡️</span>
          <div>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#6D7162' }}>Your Role</p>
            <p className="text-3xl font-black text-emerald-400">Survivor</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono mb-1" style={{ color: '#6D7162' }}>Round</p>
          <p className="text-3xl font-black text-white">1</p>
          <p className="text-xs font-mono" style={{ color: '#6D7162' }}>of 3</p>
        </div>
      </div>
      <div className="text-center p-6 mb-3 rounded-2xl" style={{ border: '2px dashed rgba(109,113,98,0.4)', background: 'rgba(56,44,37,0.4)' }}>
        <div className="text-4xl mb-2">🤝</div>
        <p className="font-bold text-lg" style={{ color: '#AD9E97' }}>Go Trade Physical Cards!</p>
        <p className="text-slate-500 text-sm mb-4">Scanner is disabled until the round ends.</p>
        <div className="flex gap-2">
          <button className="flex-1 py-3 bg-emerald-600/80 text-white font-bold rounded-xl text-sm">Done Trading</button>
          <button className="flex-1 py-3 bg-amber-600/80 text-white font-bold rounded-xl text-sm">Skip Round (1×)</button>
        </div>
      </div>
    </div>
  );
}

function BetweenRoundsPreview() {
  return (
    <div className="max-w-lg mx-auto py-4 px-3">
      <div className="mb-3 glass-panel p-4 rounded-2xl text-center">
        <h3 className="font-black text-xl mb-1" style={{ color: '#AD9E97' }}>Round 1 Complete!</h3>
        <p className="text-slate-400 text-sm mb-4">Scan all items you collected this round.</p>
        <button className="w-full py-3 rounded-xl font-bold text-white mb-2"
          style={{ background: 'linear-gradient(135deg,#454D3E,#6D7162)' }}>
          <Camera size={16} className="inline mr-2" />Scan Card
        </button>
        <button className="w-full py-3 rounded-xl font-bold text-slate-900" style={{ background: '#a8c4a0' }}>
          Ready for Round 2 →
        </button>
      </div>
    </div>
  );
}

const PreviewPage = () => {
  const [activeScene, setActiveScene] = useState(SCENES[0].id);
  const [menuOpen, setMenuOpen] = useState(true);

  const renderScene = () => {
    switch (activeScene) {
      case 'instructions':   return <InstructionsPreview />;
      case 'initial_scan':   return <InitialScanPreview />;
      case 'game_survivor':  return <GameDashPreview role="survivor" />;
      case 'game_zombie':    return <GameDashPreview role="zombie" />;
      case 'trading_phase':  return <TradingPhasePreview />;
      case 'between_rounds': return <BetweenRoundsPreview />;
      default: return null;
    }
  };

  const isFullscreen = activeScene === 'instructions';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Preview bar */}
      {!isFullscreen && (
        <div className="sticky top-0 z-20 bg-slate-900/90 border-b border-slate-700/50 backdrop-blur px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase tracking-widest font-mono text-slate-500">Preview Mode</span>
            <div className="flex flex-wrap gap-2">
              {SCENES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScene(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeScene === s.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <button
          onClick={() => setActiveScene('game_survivor')}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-800/90 text-slate-300 border border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
        >
          ← Exit Fullscreen
        </button>
      )}

      <div className={isFullscreen ? '' : 'relative'}>
        {renderScene()}
      </div>

      {!isFullscreen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl px-4 py-2 text-center backdrop-blur">
            <p className="text-xs text-slate-500">{SCENES.find(s => s.id === activeScene)?.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPage;
