import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Shield, Skull, BookOpen, Users, ChevronLeft } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function History() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('student');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URLS.BASE}/auth/history?token=${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setTab(d.as_teacher?.length > 0 ? 'teacher' : 'student'); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-zw-float">📜</div>
          <p className="text-slate-400 font-mono animate-pulse">{t('history_loading')}</p>
        </div>
      </div>
    );
  }

  const teacherGames = data?.as_teacher || [];
  const studentGames = data?.as_student || [];
  const hasTeacher = teacherGames.length > 0;
  const hasStudent = studentGames.length > 0;

  const getModeLabel = (game_mode) => {
    const map = {
      module_1: { label: `${t('mod1_label')}: ${t('mod1_sublabel')}`, emoji: '📘' },
      module_2: { label: `${t('mod2_label')}: ${t('mod2_sublabel')}`, emoji: '⚠️' },
      module_3: { label: `${t('mod3_label')}: ${t('mod3_sublabel')}`, emoji: '🔒' },
      normal:   { label: t('host_normal_mode'), emoji: '🧟' },
    };
    return map[game_mode] || map.normal;
  };

  const getStateLabel = (state) => {
    const map = {
      end_game: t('history_finished'),
      lobby: 'Lobby',
      round_active: t('history_in_progress'),
      module_instructions: t('history_in_progress'),
      module_between_rounds: t('history_in_progress'),
    };
    return map[state] || t('history_in_progress');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-zw-fade">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            {t('history_title')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('history_subtitle')}</p>
        </div>
      </div>

      {(hasTeacher || hasStudent) && (
        <div className="flex gap-2 mb-6 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
          {hasStudent && (
            <button
              onClick={() => setTab('student')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'student'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield size={15} /> {t('history_as_student')}
            </button>
          )}
          {hasTeacher && (
            <button
              onClick={() => setTab('teacher')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                tab === 'teacher'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BookOpen size={15} /> {t('history_as_teacher')}
            </button>
          )}
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-3">
          {studentGames.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4">🧟</div>
              <p className="text-slate-400 font-semibold">{t('history_no_games')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('history_join_session')}</p>
              <button onClick={() => navigate('/join')} className="mt-5 btn-primary px-6 py-2.5 text-sm">{t('history_join_game')}</button>
            </div>
          ) : (
            studentGames.map((game, i) => {
              const mode = getModeLabel(game.game_mode);
              const survived = game.survived;
              const finished = game.game_state === 'end_game';
              return (
                <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <p className="font-bold text-white">{mode.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {t('history_group')} {game.group_number} · {game.rounds_played > 0 ? `${game.rounds_played} ${game.rounds_played !== 1 ? t('history_rounds_pl') : t('history_rounds')}` : t('history_no_rounds')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {game.role && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          game.role === 'zombie'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}>
                          {game.role === 'zombie' ? `🧟 ${t('game_zombie')}` : `🛡️ ${t('game_survivor')}`}
                        </span>
                      )}
                      {finished && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          survived
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                        }`}>
                          {survived ? `✅ ${t('end_survived')}` : `☣️ ${t('end_infected')}`}
                        </span>
                      )}
                      {!finished && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-400">
                          {getStateLabel(game.game_state)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'teacher' && (
        <div className="space-y-3">
          {teacherGames.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 font-semibold">{t('history_no_sessions')}</p>
              <p className="text-slate-600 text-sm mt-1">{t('history_create_session')}</p>
              <button onClick={() => navigate('/host')} className="mt-5 btn-primary px-6 py-2.5 text-sm">{t('history_host_game')}</button>
            </div>
          ) : (
            teacherGames.map((session, i) => {
              const mode = getModeLabel(session.game_mode);
              return (
                <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <p className="font-bold text-white">{mode.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {session.num_groups} {session.num_groups === 1 ? t('dash_group').toLowerCase() : `${t('dash_group').toLowerCase()}s`} · {session.total_players} {t('dash_students_label')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      session.status === 'finished'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      {session.status === 'finished' ? t('history_finished') : t('history_active')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
