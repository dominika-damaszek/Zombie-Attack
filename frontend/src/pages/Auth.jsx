import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { API_URLS } from '../services/api';
import BackButton from '../components/BackButton';
import { useLanguage } from '../contexts/LanguageContext';

const Auth = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4 relative overflow-hidden">
      <BackButton to="/" />
      <div className="w-full max-w-md z-20 relative">
        <img src="/uie1.png" alt="Danger" className="w-30 h-30 mx-auto mb-4 animate-slow-scale drop-shadow-[0px_0_10px_rgba(255,125,0,1)] mt-10" />

        <div className="text-center mb-8">
          <h2 className="text-4xl bg-clip-text mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Sign in with your username and PIN' : 'Register to start playing'}
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          <div className="flex mb-8 bg-[var(--dark-cyan)]/90 rounded-2xl p-1 gap-1">
            <button
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-sm ${isLogin ? 'bg-[var(--neon-cyan-glow)]/30 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              {t('auth_login_tab')}
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-sm ${!isLogin ? 'bg-[var(--neon-cyan-glow)]/30 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              {t('auth_register_tab')}
            </button>
          </div>

          {error && (
            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/30 p-3 rounded-xl mb-6 text-center text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-400 text-sm font-semibold mb-2">{t('auth_username')}</label>
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
              <label className="block text-slate-400 text-sm font-semibold mb-2">{t('auth_pin')}</label>
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
              className="neon-btn w-full flex items-center justify-center gap-2 py-4 text-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">{t('auth_please_wait')}</span>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? t('auth_sign_in') : t('auth_create_account')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="hidden lg:block absolute right-[-10%] xl:right-[1%] w-[650px] h-[750px] 2xl:w-[800px] 2xl:h-[850px] z-10 opacity-90 pointer-events-none">
        <img src="/maincharacer.png" alt="Main Character" className="w-full h-full object-contain drop-shadow-[20px_0_20px_rgba(190,120,255,0.4)]" />
      </div>
    </div>
  );
};

export default Auth;
