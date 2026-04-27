import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import HostGame from './pages/HostGame';
import Dashboard from './pages/Dashboard';
import JoinGame from './pages/JoinGame';
import WaitingRoom from './pages/WaitingRoom';
import GameScreen from './pages/GameScreen';
import Profile from './pages/Profile';
import EndGame from './pages/EndGame';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Restore auth & session state on mount (survives page refresh)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);

    const sessionId = localStorage.getItem('session_id');
    if (sessionId) setHasSession(true);
  }, []);

  // When HostGame creates a session it writes to localStorage;
  // this listener keeps hasSession in sync across the same tab.
  useEffect(() => {
    const syncSession = () => {
      setHasSession(!!localStorage.getItem('session_id'));
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-slate-900 selection:bg-emerald-500/30">
        <Sidebar
          isAuthenticated={isAuthenticated}
          hasSession={hasSession}
          setIsAuthenticated={setIsAuthenticated}
          setHasSession={setHasSession}
        />

        <main className="flex-1 overflow-y-auto relative p-6">
          <div className="max-w-6xl mx-auto h-full relative z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
              <Route
                path="/host"
                element={
                  isAuthenticated ? (
                    <HostGame setHasSession={setHasSession} />
                  ) : (
                    <Navigate to="/auth" />
                  )
                }
              />
              <Route
                path="/dashboard"
                element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
              />
              <Route
                path="/profile"
                element={
                  isAuthenticated ? (
                    <Profile setIsAuthenticated={setIsAuthenticated} setHasSession={setHasSession} />
                  ) : (
                    <Navigate to="/auth" />
                  )
                }
              />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/join/:code" element={<JoinGame />} />
              <Route path="/waiting" element={<WaitingRoom />} />
              <Route path="/game" element={<GameScreen />} />
              <Route path="/endgame" element={<EndGame />} />
              {/* Placeholders */}
              <Route path="/rules" element={<div className="glass-panel p-8"><h1>Rules (Coming Soon)</h1></div>} />
              <Route path="/about" element={<div className="glass-panel p-8"><h1>About (Coming Soon)</h1></div>} />
            </Routes>
          </div>

          {/* Subtle background decoration */}
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
        </main>
      </div>
    </Router>
  );
}

export default App;
