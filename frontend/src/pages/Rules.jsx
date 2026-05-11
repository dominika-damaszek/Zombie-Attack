import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft, BookOpen, Shield, Skull, ArrowRightLeft, Key, Target, SkipForward, AlertTriangle, ChevronDown, ChevronUp, Dice1Icon, Dice2Icon, Dice3Icon, DnaIcon, SkullIcon, PinIcon, DiamondIcon, GemIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import BackButton from '../components/BackButton';

const Section = ({ icon, title, color, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700/50">

      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
          <span className="font-black text-white text-base">{title}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-700/40 pt-4">{children}</div>}
    </div>
  );
};

const CardPill = ({ symbol, label, color, bg, desc, glow }) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl border ${bg} ${glow}`}>
    <img className="flex-shrink-0 w-12 h-12 object-cover" src={symbol} alt={label} />
    <div>
      <p className={`font-bold text-sm ${color}`}>{label}</p>
      {desc && <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>}
    </div>
  </div>
);

export default function Rules() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const modules = [
    {
      id: 'module_1', emoji: '📘', label: t('mod1_label'), sublabel: t('mod1_sublabel'),
      desc: t('mod1_desc'), concepts: [t('mod1_c1'), t('mod1_c2')],
      color: 'text-[var(--neon-green-glow)]', bg: 'bg-[var(--neon-green-glow)]/10 border-[var(--neon-green-glow)]/30',
      badge: 'bg-[var(--neon-green-glow)]/20 text-[var(--neon-green-glow)]',
      extra: t('rules_m1_detail'),
    },
    {
      id: 'module_2', emoji: '⚠️', label: t('mod2_label'), sublabel: t('mod2_sublabel'),
      desc: t('mod2_desc'), concepts: [t('mod2_c1'), t('mod2_c2')],
      color: 'text-[var(--neon-cyan)]', bg: 'bg-[var(--neon-cyan-glow)]/20 border-[var(--neon-cyan-glow)]',
      badge: 'bg-[var(--neon-cyan-glow)]/50 text-[var(--neon-cyan)]',
      extra: t('rules_m2_detail'),
    },
    {
      id: 'module_3', emoji: '🔒', label: t('mod3_label'), sublabel: t('mod3_sublabel'),
      desc: t('mod3_desc'), concepts: [t('mod3_c1'), t('mod3_c2')],
      color: 'text-[var(--neon-pink)]', bg: 'bg-[var(--neon-pink-glow)]/20 border-[var(--neon-pink-glow)]/70',
      badge: 'bg-[var(--neon-pink-glow)]/50 text-[var(--neon-pink)]',
      extra: t('rules_m3_detail'),
    },
    {
      id: 'normal', emoji: '🧟', label: t('host_normal_mode'), sublabel: t('rules_normal_sublabel'),
      desc: t('host_normal_desc'), concepts: ['Infection', 'Trading', 'Zero Trust'],
      color: 'text-[#e97f7fff]', bg: 'bg-[#d95959]/10 border-[#d95959]/60', badge: 'bg-[#d95959]/40 text-[#e97f7fff]',
      extra: t('rules_normal_detail'),
    },
  ];

  const cardTypes = [
    { label: 'Security Patch', symbol: '/icon-security-patch.png', desc: t('info_medicine_desc'), color: 'text-[var(--neon-green-glow)]/70', bg: 'bg-[var(--neon-green-glow)]/10 border-[var(--neon-green)]', glow: 'shadow-[0_0_15px_var(--neon-green)]' },
    { label: 'System Boost', symbol: '/icon-system-boost.png', desc: t('info_food_desc'), color: 'text-[#eb9844]/80', bg: 'bg-[#eb9844]/20 border-[#f2cfab]', glow: 'shadow-[0_0_15px_#eb9844]' },
    { label: 'Firewall', symbol: '/icon-firewall.png', desc: t('info_weapon_desc'), color: 'text-[var(--neon-cyan)]/70', bg: 'bg-[var(--neon-cyan-glow)]/20 border-[var(--neon-cyan)]', glow: 'shadow-[0_0_15px_var(--neon-cyan)]' },
    { label: 'Security Layer', symbol: '/icon-security-layer.png', desc: t('info_clothing_desc'), color: 'text-[#e2bdfe]/70', bg: 'bg-[#bd68fd]/20 border-[#e2bdfe]', glow: 'shadow-[0_0_15px_#e2bdfe]' },
    { label: 'Hacking Tool', symbol: '/icon-hacking-tool.png', desc: t('info_tools_desc'), color: 'text-[#b8708b]/90', bg: 'bg-[#a75373]/30 border-[#ddbbc8]', glow: 'shadow-[0_0_15px_#b8708b]' },
  ];

  return (
    <div className="max-w-2xl mx-auto py-20 px-4 animate-zw-fade mb-20">
      <BackButton />

      <div className="text-center mb-8">

        <h1 className="flex justify-center items-center gap-2 text-4xl font-black bg-clip-text mb-2">
          <BookOpen size={32} className="text-[var(--neon-light-green-glow)]" />{t('rules_title')}
        </h1>
        <p className="text-slate-400 max-w-md mx-auto mb-6">{t('rules_subtitle')}</p>

        <div className="bg-[var(--neon-cyan-glow)]/10 border border-[var(--neon-cyan)]/30 rounded-xl p-4 max-w-md mx-auto text-left">
          <p className="text-[var(--neon-cyan)] font-bold mb-2 flex items-center gap-2">
            <Users size={18} />
            Group Size & Decks
          </p>
          <p className="text-slate-300 text-sm mb-3">
            The game can be played by <strong>6+ players</strong>. A new deck of cards is required for each group of 6–11 players.
          </p>
          <div className="space-y-1">
            <p className="text-slate-400 text-xs flex items-center justify-between"><span>6–11 players</span> <span className="text-white font-bold">1 deck</span></p>
            <p className="text-slate-400 text-xs flex items-center justify-between"><span>12–22 players</span> <span className="text-white font-bold">2 decks</span></p>
            <p className="text-slate-400 text-xs flex items-center justify-between"><span>23–33 players</span> <span className="text-white font-bold">3 decks</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Section icon={<Dice3Icon size={18} className="text-[var(--neon-pink)]" />} title={t('rules_overview_title')} color="bg-[var(--neon-pink-glow)]/40">
          <p className="text-slate-300 leading-relaxed mb-3">{t('rules_overview_desc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[{ emoji: '📦', label: t('rules_step1_title'), desc: t('rules_step1_desc') },
            { emoji: '🤝', label: t('rules_step2_title'), desc: t('rules_step2_desc') },
            { emoji: '🏆', label: t('rules_step3_title'), desc: t('rules_step3_desc') }].map(s => (
              <div key={s.label} className="btn-primary rounded-xl p-3 border text-center text-[var(--neon-pink)]">
                <p className="font-bold text-slate-200 text-sm">{s.label}</p>
                <p className="text-[var(--neon-pink)] text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<ArrowRightLeft size={18} className="text-[var(--neon-green-glow)]" />} title={t('rules_trading_title')} color="bg-[var(--neon-green-glow)]/25">
          <div className="space-y-3">
            {[t('rules_trading_1'), t('rules_trading_2'), t('rules_trading_3'), t('rules_trading_4')].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--neon-green-glow)]/20 text-[var(--neon-green-glow)] flex items-center justify-center text-xs font-black">{i + 1}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<DnaIcon size={18} className="text-[var(--neon-cyan-glow)]" />} title={t('rules_roles_title')} color="bg-[var(--neon-cyan-glow)]/30">
          <div className="space-y-3">
            <div className="rounded-xl p-4 mb-5 border bg-[var(--neon-green)]/10 border-[var(--neon-green-glow)] shadow-[0_0_20px_var(--neon-green-glow)]/50">
              <div className="flex items-center gap-3 mb-2">
                <p className="font-black text-[var(--neon-green-glow)] text-lg">{t('game_survivor')}</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{t('info_survivor_desc')}</p>
            </div>
            <div className="rounded-xl p-4 border bg-[#d95959]/15 border-[#d95959] shadow-[0_0_20px_#ff6666]/50">
              <div className="flex items-center gap-3 mb-2">
                <p className="font-black text-[#d95959] text-lg">{t('game_zombie')}</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{t('info_zombie_desc')}</p>
            </div>
          </div>
        </Section>

        <Section icon={<SkullIcon size={18} className="text-[#d95959]" />} title={t('rules_infection_title')} color="bg-[#d95959]/15">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('rules_infection_desc')}</p>
          <div className="flex gap-2 flex-col sm:flex-row mb-4">
            {[{ emoji: '🤝', label: t('rules_infection_step1') },
            { emoji: '📱', label: t('rules_infection_step2') },
            { emoji: '🧟', label: t('rules_infection_step3') }].map((s, i) => (
              <div key={i} className="flex-1 bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40 btn-primary">
                <p className="text-xs leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-[var(--neon-pink-glow)]/10 border border-[var(--neon-pink)]/20 rounded-xl p-3">
            <p className="text-[var(--neon-pink)] text-xs font-bold mb-1">☠️ {t('rules_report_zombie_title')}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{t('rules_report_zombie_desc')}</p>
          </div>
        </Section>

        <Section icon={<Key size={18} className="text-[var(--neon-cyan)]" />} title={t('rules_password_title')} color="bg-[var(--neon-cyan-glow)]/50">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('rules_password_desc')}</p>
          <div className="bg-[var(--neon-cyan-glow)]/20 border border-[var(--neon-cyan)]/20 rounded-xl p-4 mb-3">
            <p className="text-[var(--neon-cyan)]/80 font-bold text-sm mb-2">{t('rules_password_warning_title')}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{t('rules_password_warning_desc')}</p>
          </div>
          <div className="bg-[#d95959]/10 border border-[#d95959]/30 rounded-xl p-3">
            <p className="text-[#d95959] text-xs font-bold mb-1">🧟 {t('rules_password_zombie_hint_title')}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{t('rules_password_zombie_hint_desc')}</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Examples</p>

            <p className="text-slate-300 text-sm leading-relaxed">{t('slide_m3_5_pw1')}</p>

            {[t('slide_m3_5_h1')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-[var(--neon-green-glow)]/10 border border-[var(--neon-green-glow)]/50 rounded-lg p-2">
                <p className="text-[var(--neon-green-glow)]/80 text-xs">{h}</p>
              </div>
            ))}
            {[t('slide_m3_5_h2')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#d95959]/10 border border-[#d95959]/40 rounded-lg p-2">
                <p className="text-[#d95959] text-xs">{h}</p>
              </div>
            ))}
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-3">OR</p>
            <p className="text-slate-300 text-sm leading-relaxed">{t('slide_m3_5_pw2')}</p>

            {[t('slide_m3_5_h3')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-[var(--neon-green-glow)]/10 border border-[var(--neon-green-glow)]/50 rounded-lg p-2">
                <p className="text-[var(--neon-green-glow)]/80 text-xs">{h}</p>
              </div>
            ))}
            {[t('slide_m3_5_h4')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#d95959]/10 border border-[#d95959]/40 rounded-lg p-2">
                <p className="text-[#d95959] text-xs">{h}</p>
              </div>
            ))}

          </div>
        </Section>

        <Section icon={<PinIcon size={18} className="text-purple-400" />} title={t('rules_objectives_title')} color="bg-purple-500/15">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('info_objectives_desc')}</p>
          <p className="text-slate-300 text-sm leading-relaxed">{t('rules_objectives_detail')}</p>
        </Section>

        <Section icon={<SkipForward size={18} className="text-slate-400" />} title={t('info_skip_round')} color="bg-slate-700">
          <p className="text-slate-300 text-sm leading-relaxed">{t('info_skip_round_desc')}</p>
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-amber-300 text-xs leading-relaxed">{t('rules_skip_warning')}</p>
          </div>
        </Section>

        <Section icon={<GemIcon size={18} className="text-[var(--neon-green-glow)]" />} title={t('game_card_types_title')} color="bg-[var(--neon-green-glow)]/15">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 gap-y-5">
            {cardTypes.map(c => (
              <CardPill key={c.label} {...c} />
            ))}
          </div>
        </Section>

        <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-slate-700">📚</span>
              <span className="font-black text-white text-base">{t('rules_modules_title')}</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-slate-400 text-sm mb-4">{t('rules_modules_desc')}</p>
            {modules.map(mod => (
              <div key={mod.id} className={`rounded-xl p-4 border ${mod.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className={`font-black ${mod.color}`}>{mod.label}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mod.badge}`}>{mod.sublabel}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{mod.extra}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {mod.concepts.map(c => (
                        <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mod.badge}`}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button onClick={() => navigate(-1)} className="neon-btn px-8 py-3">
          {t('rules_got_it')}
        </button>
      </div>
    </div>
  );
}
