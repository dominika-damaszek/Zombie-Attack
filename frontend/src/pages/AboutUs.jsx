import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, GraduationCap, Skull, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TEAM = [
  { name: 'Amalia',    emoji: '🛡️', role: 'Survivor', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  { name: 'Maria',     emoji: '🧟', role: 'Zombie',   color: 'text-rose-400',    bg: 'bg-rose-500/10    border-rose-500/25' },
  { name: 'Lara',      emoji: '🔑', role: 'Keyholder',color: 'text-amber-400',   bg: 'bg-amber-500/10   border-amber-500/25' },
  { name: 'Laura Lee', emoji: '⚔️', role: 'Fighter',  color: 'text-orange-400',  bg: 'bg-orange-500/10  border-orange-500/25' },
  { name: 'Vivian',    emoji: '📡', role: 'Hacker',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10    border-cyan-500/25' },
];

export default function AboutUs() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-semibold">{t('back')}</span>
      </button>

      <div className="text-center mb-10">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
          <img src="/zombie-logo.svg" alt="Zombieware" className="w-20 h-20 relative drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]" />
        </div>
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
          {t('about_title')}
        </h1>
        <p className="text-slate-400 max-w-md mx-auto">{t('about_subtitle')}</p>
      </div>

      <div className="glass-panel rounded-3xl p-6 mb-5 border border-slate-700/50 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 mb-4">
          <GraduationCap size={24} className="text-cyan-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-3">{t('about_project_title')}</h2>
        <p className="text-slate-300 leading-relaxed mb-4">{t('about_project_desc')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <div className="flex items-center justify-center gap-2 bg-slate-800/70 px-4 py-2.5 rounded-xl border border-slate-700">
            <Star size={14} className="text-amber-400" />
            <span className="text-slate-300 text-sm font-semibold">{t('about_course')}</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-slate-800/70 px-4 py-2.5 rounded-xl border border-slate-700">
            <GraduationCap size={14} className="text-emerald-400" />
            <span className="text-slate-300 text-sm font-semibold">{t('about_year')}</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 mb-5 border border-slate-700/50">
        <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
          <Heart size={20} className="text-rose-400" /> {t('about_team_title')}
        </h2>
        <p className="text-slate-400 text-sm mb-5">{t('about_team_desc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEAM.map((member) => (
            <div key={member.name} className={`flex items-center gap-4 p-4 rounded-2xl border ${member.bg}`}>
              <span className="text-3xl">{member.emoji}</span>
              <div>
                <p className="font-black text-white text-lg">{member.name}</p>
                <p className={`text-sm font-semibold ${member.color}`}>{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 mb-5 border border-slate-700/50">
        <h2 className="text-xl font-black text-white mb-3 flex items-center gap-2">
          <Skull size={20} className="text-emerald-400" /> {t('about_game_title')}
        </h2>
        <p className="text-slate-300 leading-relaxed mb-3">{t('about_game_desc1')}</p>
        <p className="text-slate-300 leading-relaxed">{t('about_game_desc2')}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { emoji: '🔒', label: t('about_theme1') },
            { emoji: '🤝', label: t('about_theme2') },
            { emoji: '🧠', label: t('about_theme3') },
          ].map(item => (
            <div key={item.label} className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <p className="text-slate-300 text-xs font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 text-slate-600 text-sm">
        <span>{t('about_footer')}</span>
      </div>
    </div>
  );
}
