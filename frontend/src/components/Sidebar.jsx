import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Gamepad2, LogIn, LogOut, BookOpen, Info, LayoutDashboard, UserCircle } from 'lucide-react';

const Sidebar = ({ isAuthenticated, hasSession, setIsAuthenticated, setHasSession }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_data');
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
  };

  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/join', icon: <Users size={20} />, label: 'Join Game' },
    { to: '/host', icon: <Gamepad2 size={20} />, label: 'Host Game', requiresAuth: true },
    {
      to: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'Active Session',
      requiresAuth: true,
      requiresSession: true,
    },
    { to: '/profile', icon: <UserCircle size={20} />, label: 'Account', requiresAuth: true },
    { to: '/rules', icon: <BookOpen size={20} />, label: 'Rules' },
    { to: '/about', icon: <Info size={20} />, label: 'About' },
  ];

  return (
    <aside className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col justify-between relative z-20">
      <div>
        {/* Logo */}
        <div className="p-6 flex items-center space-x-3 border-b border-slate-700/50 mb-6">
          <img src="/zombie-logo.svg" alt="Logo" className="w-12 h-12 drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]" />
          <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Zombieware
          </h1>
        </div>

        <nav className="px-4 space-y-2">
          {navItems.map((item) => {
            if (item.requiresAuth && !isAuthenticated) return null;
            if (item.requiresSession && !hasSession) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom auth section */}
      <div className="p-4 border-t border-slate-700/50">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        ) : (
          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-500'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`
            }
          >
            <LogIn size={20} />
            <span>Login / Register</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
