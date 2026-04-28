import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, LogOut, LayoutDashboard, ChevronLeft } from 'lucide-react';

const TopNav = ({ isAuthenticated, hasSession, setIsAuthenticated, setHasSession }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isGamePage = ['/game', '/waiting', '/endgame'].some(p => location.pathname.startsWith(p));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_data');
    localStorage.removeItem('player_session');
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate('/');
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 z-30 relative">
      {/* Left side: back button + logo */}
      <div className="flex items-center gap-3">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition-all text-sm font-semibold mr-1"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/zombie-logo.svg" alt="Logo" className="w-9 h-9 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
            Zombieware
          </span>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {isAuthenticated && hasSession && !isGamePage && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition-all border border-emerald-500/20"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        )}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all border border-slate-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 px-5 py-2 rounded-xl transition-all shadow-md"
          >
            <LogIn size={16} />
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNav;
