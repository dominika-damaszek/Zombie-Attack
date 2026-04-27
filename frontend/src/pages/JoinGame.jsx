import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn } from 'lucide-react';
import { API_URLS } from '../services/api';

const JoinGame = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState(code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!joinCode) return;

    const token = localStorage.getItem('token');
    if (!token) {
      // Must be logged in to join
      alert("You must be logged in to join a game!");
      navigate('/auth');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(
        `${API_URLS.PLAYER}/join?token=${token}`,
        { join_code: joinCode }
      );
      
      // Save to localStorage so it survives page refresh
      localStorage.setItem('player_session', JSON.stringify({
        groupData: response.data,
        playerData: { id: response.data.player_id }
      }));

      // Navigate to waiting room with group data and player id
      navigate('/waiting', { 
        state: { 
          groupData: response.data,
          playerData: { id: response.data.player_id }
        } 
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to join group');
      setLoading(false);
    }
  };

  // Auto-join if code is present in URL
  useEffect(() => {
    if (code) {
      handleJoin();
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-500">
      <div className="glass-panel w-full max-w-md p-8 text-center border-t-4 border-emerald-500">
        <h2 className="text-3xl font-black text-slate-100 mb-2">Join Assignment</h2>
        <p className="text-slate-400 font-medium mb-8">Enter your 6-character mission code below to deploy into your group.</p>
        
        {error && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/50 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <input 
            type="text" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl px-4 py-4 text-center text-4xl font-mono tracking-[0.5em] text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-emerald-500/50 shadow-inner"
            required
          />
          
          <button 
            type="submit" 
            disabled={loading || joinCode.length < 1}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-4 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={24} />
            <span className="text-xl">{loading ? 'Verifying...' : 'Deploy'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGame;
