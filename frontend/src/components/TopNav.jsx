import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, LayoutDashboard, History, Menu, X, BookOpen, Users, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TopNav = ({ isAuthenticated, hasSession, setIsAuthenticated, setHasSession }) => {
  const navigate = useNavigate();
  const { t, lang, cycleLanguage, LABELS } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_data');
    localStorage.removeItem('player_session');
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate('/');
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const navTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const menuItems = [
    {
      icon: <BookOpen size={18} className="text-emerald-400" />,
      label: t('nav_rules'),
      sublabel: t('nav_rules_sub'),
      path: '/rules',
      color: 'hover:bg-emerald-500/10',
    },
    {
      icon: <Users size={18} className="text-cyan-400" />,
      label: t('nav_about'),
      sublabel: t('nav_about_sub'),
      path: '/about',
      color: 'hover:bg-cyan-500/10',
    },
  ];

  return (
    <header className="w-full flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 z-30 relative">
      <div className="flex items-center gap-1 sm:gap-2" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50"
                 style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(71,85,105,0.5)', backdropFilter: 'blur(20px)' }}>
              <div className="px-4 py-3 border-b border-slate-700/50">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t('nav_menu')}</p>
              </div>

              <div className="py-2 px-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navTo(item.path)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-all ${item.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg bg-slate-800">{item.icon}</span>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{item.label}</p>
                        <p className="text-slate-500 text-xs">{item.sublabel}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-700/50 py-2 px-2">
                {isAuthenticated && hasSession && (
                  <button
                    onClick={() => navTo('/dashboard')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-500/10 transition-all"
                  >
                    <LayoutDashboard size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-300">{t('nav_dashboard')}</span>
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    onClick={() => navTo('/history')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/50 transition-all"
                  >
                    <History size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-300">{t('nav_history')}</span>
                  </button>
                )}
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut size={16} className="text-rose-400" />
                    <span className="text-sm font-semibold text-rose-400">{t('nav_logout')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navTo('/auth')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-500/10 transition-all"
                  >
                    <LogIn size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">{t('nav_login')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/zombie-logo.svg" alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
          <span className="text-lg sm:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
            Zombieware
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {isAuthenticated && hasSession && (
          <button
            onClick={() => navigate('/dashboard')}
            className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 sm:px-4 py-2 rounded-xl transition-all border border-emerald-500/20"
          >
            <LayoutDashboard size={16} />
            <span>{t('nav_dashboard')}</span>
          </button>
        )}
        {isAuthenticated && (
          <button
            onClick={() => navigate('/history')}
            className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 sm:px-4 py-2 rounded-xl transition-all border border-slate-700"
          >
            <History size={16} />
            <span>{t('nav_history')}</span>
          </button>
        )}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 sm:px-4 py-2 rounded-xl transition-all border border-slate-700"
          >
            <LogOut size={16} />
            <span>{t('nav_logout')}</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-1 sm:gap-2 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 px-3 sm:px-5 py-2 rounded-xl transition-all shadow-md"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">{t('nav_login')}</span>
          </button>
        )}
        <button
          onClick={cycleLanguage}
          className="flex items-center justify-center text-xs font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-2 rounded-xl transition-all border border-slate-700 min-w-[42px]"
          title="Change language"
        >
          {LABELS[lang]}
        </button>
      </div>
    </header>
  );
};

export default TopNav;
