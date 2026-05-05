import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Shield, Skull, ArrowRightLeft, Key, Target, SkipForward, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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

const CardPill = ({ emoji, label, color, bg, desc }) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl border ${bg}`}>
    <span className="text-2xl flex-shrink-0">{emoji}</span>
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
      color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-300',
      extra: t('rules_m1_detail'),
    },
    {
      id: 'module_2', emoji: '⚠️', label: t('mod2_label'), sublabel: t('mod2_sublabel'),
      desc: t('mod2_desc'), concepts: [t('mod2_c1'), t('mod2_c2')],
      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', badge: 'bg-orange-500/20 text-orange-300',
      extra: t('rules_m2_detail'),
    },
    {
      id: 'module_3', emoji: '🔒', label: t('mod3_label'), sublabel: t('mod3_sublabel'),
      desc: t('mod3_desc'), concepts: [t('mod3_c1'), t('mod3_c2')],
      color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', badge: 'bg-purple-500/20 text-purple-300',
      extra: t('rules_m3_detail'),
    },
    {
      id: 'normal', emoji: '🧟', label: t('host_normal_mode'), sublabel: t('rules_normal_sublabel'),
      desc: t('host_normal_desc'), concepts: ['Infection', 'Trading', 'Zero Trust'],
      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-300',
      extra: t('rules_normal_detail'),
    },
  ];

  const cardTypes = [
    { emoji: '💊', label: t('info_medicine'),  desc: t('info_medicine_desc'),  color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/25' },
    { emoji: '🍎', label: t('info_food'),      desc: t('info_food_desc'),      color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
    { emoji: '🔫', label: t('info_weapon'),    desc: t('info_weapon_desc'),    color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/25' },
    { emoji: '👕', label: t('info_clothing'),  desc: t('info_clothing_desc'),  color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/25' },
    { emoji: '🔧', label: t('info_tools'),     desc: t('info_tools_desc'),     color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/25' },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-semibold">{t('back')}</span>
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 mb-4">
          <BookOpen size={32} className="text-emerald-400" />
        </div>
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
          {t('rules_title')}
        </h1>
        <p className="text-slate-400 max-w-md mx-auto">{t('rules_subtitle')}</p>
      </div>

      <div className="space-y-4">
        <Section
          icon={<BookOpen size={18} className="text-cyan-400" />}
          title={t('rules_overview_title')}
          color="bg-cyan-500/15"
        >
          <p className="text-slate-300 leading-relaxed mb-3">{t('rules_overview_desc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { emoji: '📦', label: t('rules_step1_title'), desc: t('rules_step1_desc') },
              { emoji: '🤝', label: t('rules_step2_title'), desc: t('rules_step2_desc') },
              { emoji: '🏆', label: t('rules_step3_title'), desc: t('rules_step3_desc') },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                <div className="text-2xl mb-1">{s.emoji}</div>
                <p className="font-bold text-slate-200 text-sm">{s.label}</p>
                <p className="text-slate-500 text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={<ArrowRightLeft size={18} className="text-emerald-400" />}
          title={t('rules_trading_title')}
          color="bg-emerald-500/15"
        >
          <div className="space-y-3">
            {[
              t('rules_trading_1'),
              t('rules_trading_2'),
              t('rules_trading_3'),
              t('rules_trading_4'),
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">{i + 1}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={<Shield size={18} className="text-emerald-400" />}
          title={t('rules_roles_title')}
          color="bg-emerald-500/15"
        >
          <div className="space-y-3">
            <div className="rounded-xl p-4 border bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🛡️</span>
                <p className="font-black text-emerald-400 text-lg">{t('game_survivor')}</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{t('info_survivor_desc')}</p>
            </div>
            <div className="rounded-xl p-4 border bg-rose-500/10 border-rose-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🧟</span>
                <p className="font-black text-rose-400 text-lg">{t('game_zombie')}</p>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{t('info_zombie_desc')}</p>
            </div>
          </div>
        </Section>

        <Section
          icon={<Skull size={18} className="text-rose-400" />}
          title={t('rules_infection_title')}
          color="bg-rose-500/15"
        >
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('rules_infection_desc')}</p>
          <div className="flex gap-2 flex-col sm:flex-row">
            {[
              { emoji: '🤝', label: t('rules_infection_step1') },
              { emoji: '📱', label: t('rules_infection_step2') },
              { emoji: '🧟', label: t('rules_infection_step3') },
            ].map((s, i) => (
              <div key={i} className="flex-1 bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                <div className="text-xl mb-1">{s.emoji}</div>
                <p className="text-slate-300 text-xs leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={<Key size={18} className="text-amber-400" />}
          title={t('rules_password_title')}
          color="bg-amber-500/15"
        >
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('rules_password_desc')}</p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-300 font-bold text-sm mb-2">⚠️ {t('rules_password_warning_title')}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{t('rules_password_warning_desc')}</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">{t('rules_good_hints')}</p>
            {[t('slide_m3_5_h1'), t('slide_m3_5_h3')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-2">
                <span>✅</span>
                <p className="text-emerald-300 text-xs">{h}</p>
              </div>
            ))}
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mt-3">{t('rules_bad_hints')}</p>
            {[t('slide_m3_5_h2'), t('slide_m3_5_h4')].map((h, i) => (
              <div key={i} className="flex items-start gap-2 bg-rose-500/8 border border-rose-500/15 rounded-lg p-2">
                <span>❌</span>
                <p className="text-rose-300 text-xs">{h}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={<Target size={18} className="text-purple-400" />}
          title={t('rules_objectives_title')}
          color="bg-purple-500/15"
        >
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{t('info_objectives_desc')}</p>
          <p className="text-slate-300 text-sm leading-relaxed">{t('rules_objectives_detail')}</p>
        </Section>

        <Section
          icon={<SkipForward size={18} className="text-slate-400" />}
          title={t('info_skip_round')}
          color="bg-slate-700"
        >
          <p className="text-slate-300 text-sm leading-relaxed">{t('info_skip_round_desc')}</p>
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-amber-300 text-xs leading-relaxed">{t('rules_skip_warning')}</p>
          </div>
        </Section>

        <Section
          icon={<AlertTriangle size={18} className="text-yellow-400" />}
          title={t('game_card_types_title')}
          color="bg-yellow-500/15"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            {modules.map((mod, i) => (
              <div key={mod.id} className={`rounded-xl p-4 border ${mod.bg}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{mod.emoji}</span>
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
        <button
          onClick={() => navigate(-1)}
          className="btn-primary px-8 py-3"
        >
          {t('rules_got_it')} 🧟
        </button>
      </div>
    </div>
  );
}
