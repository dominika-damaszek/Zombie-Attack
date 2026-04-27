import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Skull } from 'lucide-react';

// Decode the JWT payload without a library (it's base64)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const Profile = ({ setIsAuthenticated, setHasSession }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const decoded = token ? decodeToken(token) : null;
  const username = decoded?.sub || decoded?.username || 'Unknown Agent';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('session_data');
    setIsAuthenticated(false);
    if (setHasSession) setHasSession(false);
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-500">
      <div className="relative max-w-sm w-full px-4">
        {/* Glow */}
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-75 pointer-events-none" />

        <div className="relative glass-panel p-10 rounded-3xl border-t-4 border-emerald-500 text-center">
          {/* Avatar */}
          <div className="inline-flex items-center justify-center bg-emerald-500/20 rounded-full p-5 mb-6 border border-emerald-500/30">
            <UserCircle size={64} className="text-emerald-400" />
          </div>

          <p className="text-slate-400 text-xs uppercase tracking-[0.3em] mb-1 font-mono">Agent ID</p>
          <h2 className="text-4xl font-black text-slate-100 mb-1">{username}</h2>
          <p className="text-slate-500 text-sm mb-8 flex items-center justify-center gap-1">
            <Skull size={14} className="text-emerald-500" />
            Zombieware Field Operative
          </p>

          {/* Session status */}
          {localStorage.getItem('session_id') ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-6 text-left">
              <p className="text-emerald-400 text-xs uppercase tracking-widest font-mono mb-1">Active Session</p>
              <p className="text-slate-300 font-mono text-sm break-all">
                {localStorage.getItem('session_id')}
              </p>
              <button
                onClick={() => {
                  const data = JSON.parse(localStorage.getItem('session_data') || '{}');
                  navigate('/dashboard', { state: { session: data } });
                }}
                className="mt-3 text-emerald-400 text-sm hover:underline"
              >
                → View Session Dashboard
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-6 text-slate-500 text-sm">
              No active session. <br />
              <button onClick={() => navigate('/host')} className="text-emerald-400 hover:underline mt-1 block">
                Host a new session →
              </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold hover:bg-rose-500/20 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
