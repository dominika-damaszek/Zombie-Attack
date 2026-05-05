import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Monitor } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const Home = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [serverStatus, setServerStatus] = useState('waking');

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        await fetch(`${API_URLS.BASE}/`, { method: 'GET' });
        if (!cancelled) setServerStatus('ready');
      } catch {
        if (!cancelled) setServerStatus('error');
      }
    };
    ping();
    return () => { cancelled = true; };
  }, []);

  const handleJoin = () => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: '/join' } });
    } else {
      navigate('/join');
    }
  };

  const handleHost = () => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: '/host' } });
    } else {
      navigate('/host');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] text-center px-4 py-8">
      <div className="flex flex-col items-center gap-5 mb-8 sm:mb-14">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full scale-150" />
          <img
            src="/zombie-logo.svg"
            alt="Zombieware"
            className="w-28 h-28 sm:w-48 sm:h-48 relative drop-shadow-[0_0_32px_rgba(52,211,153,0.4)]"
          />
        </div>
        <div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight leading-none mb-3">
            Zombieware
          </h1>
          <p className="text-slate-400 text-sm sm:text-lg max-w-md mx-auto">
            {t('home_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        <button
          onClick={handleJoin}
          className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-3 py-7 sm:py-10 px-6 sm:px-8 rounded-3xl font-black text-xl sm:text-2xl text-slate-900 bg-gradient-to-br from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-[0_0_40px_rgba(52,211,153,0.25)] hover:shadow-[0_0_60px_rgba(52,211,153,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Users size={36} strokeWidth={2.5} />
          {t('home_join')}
          <span className="text-sm font-medium text-slate-700 -mt-1">{t('home_join_sub')}</span>
        </button>

        <button
          onClick={handleHost}
          className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-3 py-7 sm:py-10 px-6 sm:px-8 rounded-3xl font-black text-xl sm:text-2xl text-slate-900 bg-gradient-to-br from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:shadow-[0_0_60px_rgba(6,182,212,0.35)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Monitor size={36} strokeWidth={2.5} />
          {t('home_host')}
          <span className="text-sm font-medium text-slate-700 -mt-1">{t('home_host_sub')}</span>
        </button>
      </div>

      {!isAuthenticated && (
        <p className="mt-6 text-slate-500 text-sm">
          {t('home_login_required')}
        </p>
      )}

      <div className="mt-8 flex items-center gap-2 text-xs">
        {serverStatus === 'waking' && (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-slate-500">{t('home_server_waking')}</span>
          </>
        )}
        {serverStatus === 'ready' && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-600">{t('home_server_ready')}</span>
          </>
        )}
        {serverStatus === 'error' && (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-500">{t('home_server_error')}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
