import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';

const JoinGame = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState(code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!joinCode || joinCode.length < 1) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth', { state: { from: '/join' } });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URLS.PLAYER}/join?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: joinCode })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid code or room not found');
      }
      const data = await response.json();
      localStorage.setItem('player_session', JSON.stringify({
        groupData: data,
        playerData: { id: data.player_id }
      }));
      navigate('/waiting', {
        state: { groupData: data, playerData: { id: data.player_id } }
      });
    } catch (err) {
      setError(err.message || 'Failed to join room');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) handleJoin();
  }, [code]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
      <div className="w-full max-w-sm">
        <BackButton to="/" />
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black text-white mb-2">Join a Class</h2>
          <p className="text-slate-400">Enter the room code provided by your teacher</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          {error && (
            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/30 p-3 rounded-2xl mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-3 text-center uppercase tracking-wider">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl px-4 py-5 text-center text-4xl font-mono tracking-[0.5em] text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || joinCode.length < 1}
              className="w-full py-4 rounded-2xl font-black text-xl text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <><Loader2 size={22} className="animate-spin" /> Joining...</>
              ) : (
                <><LogIn size={22} /> Join</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;
