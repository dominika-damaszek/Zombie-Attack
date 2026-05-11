import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Monitor } from 'lucide-react';
import { API_URLS } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const Home = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [serverStatus, setServerStatus] = useState('waking');

  const activeGame = (() => {
    try { return JSON.parse(localStorage.getItem('player_session') || 'null'); } catch { return null; }
  })();
  const hasActiveGame = !!(activeGame?.groupData?.group_id && activeGame?.playerData?.id);

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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] sm:min-h-[calc(100vh-73px)] text-center px-4 py-8 relative">
      <div className="flex flex-col items-center gap-5 mb-8 sm:mb-14">
        <div
          className="fixed inset-0 pointer-events-none z-[-1] opacity-70 bg-cover bg-center"
          style={{ backgroundImage: "url('/bgzombies1.png')" }}
        />
        <div>
          <h1 className="glitch-h1 text-4xl sm:text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-pink-400 tracking-tight leading-none mb-2">
            Zombieware
          </h1>
          <p className="text-base sm:text-lg font-bold text-purple-400 tracking-widest uppercase mb-6">
            {t('home_slogan')}
          </p>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto px-4">
            {t('home_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 w-full lg:flex-row max-w-xl">
        <button
          onClick={handleJoin}
          className="group flex-1 flex flex-col items-center justify-center gap-3 py-10 px-8 rounded-3xl text-2xl neon-btn transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]">
          <Users size={36} strokeWidth={2.5} />
          {t('home_join')}
          <span className="text-sm font-medium group-hover:font-bold -mt-1">Enter a classroom</span>
        </button>

        <button
          onClick={handleHost}
          className="group flex-1 flex flex-col items-center justify-center gap-3 py-10 px-8 rounded-3xl text-2xl neon-btn-alt transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Monitor size={36} strokeWidth={2.5} />
          {t('home_host')}
          <span className="text-sm font-medium text-[var(--neon-pink)]  group-hover:font-bold -mt-1">Create a class session</span>
        </button>
      </div>

      {!isAuthenticated && (
        <p className="mt-6 text-slate-500 text-sm">
          {t('home_login_required')}
        </p>
      )}

      <div className="my-8 flex items-center gap-2 text-xs">
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
      <div className="absolute bottom-[5%]  hidden lg:flex gap-10 flex-row w-[70%] justify-center">
        <div className="flex flex-row gap-3 items-center">
          <img src="/nrp1.png" alt="Players" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            {t('home_players')}
          </p>
        </div>
        <div className="flex flex-row gap-3 items-center">
          <img src="/time1.png" alt="Duration" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            {t('home_duration')}
          </p>
        </div>
        <div className="flex flex-row gap-3 items-center">
          <img src="/age1.png" alt="Age" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            {t('home_age')}
          </p>
        </div>
      </div>

      <div className="fixed right-[-10px] bottom-[30px] w-[100px] h-[100px] lg:w-[200px] lg:h-[200px] opacity-90 pointer-events-none">
        <img src="/uil1.png" alt="Lock" className="w-full h-full object-contain drop-shadow-[0px_0_20px_rgba(255,255,255,100)]" />
      </div>
    </div>

  );
};

export default Home;
