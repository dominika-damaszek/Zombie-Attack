import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Shield, Skull, BookOpen, Users, ChevronLeft } from 'lucide-react';
import { API_URLS } from '../services/api';

const MODE_LABELS = {
  module_1: { label: 'Module 1: Trading',   emoji: '📘' },
  module_2: { label: 'Module 2: Zombies',   emoji: '⚠️' },
  module_3: { label: 'Module 3: Passwords', emoji: '🔒' },
  normal:   { label: 'Normal',              emoji: '🧟' },
};

const STATE_LABELS = {
  end_game:  'Finished',
  lobby:     'Lobby',
  round_active: 'In Progress',
  module_instructions: 'In Progress',
  module_between_rounds: 'In Progress',
};

export default function History() {
  const navigate = useNavigate();
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
          <p className="text-slate-400 font-mono animate-pulse">Loading history...</p>
        </div>
      </div>
    );
  }

  const teacherGames = data?.as_teacher || [];
  const studentGames = data?.as_student || [];
  const hasTeacher = teacherGames.length > 0;
  const hasStudent = studentGames.length > 0;

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
            Game History
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Your past Zombieware sessions</p>
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
              <Shield size={15} /> As Student
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
              <BookOpen size={15} /> As Teacher
            </button>
          )}
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-3">
          {studentGames.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-4">🧟</div>
              <p className="text-slate-400 font-semibold">No games played yet.</p>
              <p className="text-slate-600 text-sm mt-1">Join a session to start playing!</p>
              <button onClick={() => navigate('/join')} className="mt-5 btn-primary px-6 py-2.5 text-sm">Join a Game</button>
            </div>
          ) : (
            studentGames.map((game, i) => {
              const mode = MODE_LABELS[game.game_mode] || MODE_LABELS.normal;
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
                          Group {game.group_number} · {game.rounds_played > 0 ? `${game.rounds_played} round${game.rounds_played !== 1 ? 's' : ''}` : 'No rounds played'}
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
                          {game.role === 'zombie' ? '🧟 Zombie' : '🛡️ Survivor'}
                        </span>
                      )}
                      {finished && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          survived
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                        }`}>
                          {survived ? '✅ Survived' : '☣️ Infected'}
                        </span>
                      )}
                      {!finished && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700 text-slate-400">
                          {STATE_LABELS[game.game_state] || 'In Progress'}
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
              <p className="text-slate-400 font-semibold">No sessions hosted yet.</p>
              <p className="text-slate-600 text-sm mt-1">Create a session to start teaching!</p>
              <button onClick={() => navigate('/host')} className="mt-5 btn-primary px-6 py-2.5 text-sm">Host a Game</button>
            </div>
          ) : (
            teacherGames.map((session, i) => {
              const mode = MODE_LABELS[session.game_mode] || MODE_LABELS.normal;
              return (
                <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.emoji}</span>
                      <div>
                        <p className="font-bold text-white">{mode.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {session.num_groups} {session.num_groups === 1 ? 'group' : 'groups'} · {session.total_players} students
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      session.status === 'finished'
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      {session.status === 'finished' ? 'Finished' : 'Active'}
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
