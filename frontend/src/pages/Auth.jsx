import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';

const Auth = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await fetch(`${API_URLS.AUTH}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Authentication failed.');
      }
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setIsAuthenticated(true);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">
      <div className="w-full max-w-md">
        <BackButton to="/" />
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Sign in with your username and PIN' : 'Register to start playing'}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          <div className="flex mb-8 bg-slate-900/50 rounded-2xl p-1 gap-1">
            <button
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-sm ${isLogin ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-sm ${!isLogin ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/30 p-3 rounded-xl mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-2">Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. teacher_john"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-2">PIN (4 digits)</label>
              <input
                type="password"
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="••••"
                maxLength="4"
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
