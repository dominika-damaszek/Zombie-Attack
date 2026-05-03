import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
import Home from './pages/Home';
import Auth from './pages/Auth';
import HostGame from './pages/HostGame';
import Dashboard from './pages/Dashboard';
import JoinGame from './pages/JoinGame';
import WaitingRoom from './pages/WaitingRoom';
import GameScreen from './pages/GameScreen';
import Profile from './pages/Profile';
import EndGame from './pages/EndGame';
import PreviewPage from './pages/PreviewPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) setHasSession(true);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      setHasSession(!!localStorage.getItem('session_id'));
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  const isFullScreenGame = window.location.pathname.startsWith('/game');
  const isPreview = window.location.pathname.startsWith('/preview');

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-transparent selection:bg-emerald-500/30">
        {!isFullScreenGame && !isPreview && (
          <TopNav
            isAuthenticated={isAuthenticated}
            hasSession={hasSession}
            setIsAuthenticated={setIsAuthenticated}
            setHasSession={setHasSession}
          />
        )}

        <main className="flex-1 overflow-y-auto relative flex flex-col">
          <div className="relative z-10 flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
              <Route path="/auth" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route
                path="/host"
                element={isAuthenticated ? <HostGame setHasSession={setHasSession} /> : <Navigate to="/auth" state={{ from: '/host' }} />}
              />
              <Route
                path="/dashboard"
                element={isAuthenticated ? <Dashboard setHasSession={setHasSession} /> : <Navigate to="/auth" />}
              />
              <Route
                path="/profile"
                element={isAuthenticated ? <Profile setIsAuthenticated={setIsAuthenticated} setHasSession={setHasSession} /> : <Navigate to="/auth" />}
              />
              <Route
                path="/join"
                element={isAuthenticated ? <JoinGame /> : <Navigate to="/auth" state={{ from: '/join' }} />}
              />
              <Route
                path="/join/:code"
                element={isAuthenticated ? <JoinGame /> : <Navigate to="/auth" state={{ from: '/join' }} />}
              />
              <Route path="/waiting" element={<WaitingRoom />} />
              <Route path="/game" element={<GameScreen />} />
              <Route path="/endgame" element={<EndGame />} />
            </Routes>
          </div>
          
          <div className="fixed top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="fixed bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

          {/* Floating Viruses */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <img src="/uiv1.png" alt="" className="absolute top-[10%] left-[10%] w-32 animate-float-slow" />
            <img src="/uiv1.png" alt="" className="absolute top-[60%] left-[80%] w-24 animate-float-medium" style={{ animationDelay: '2s' }} />
            <img src="/uiv1.png" alt="" className="absolute top-[30%] left-[50%] w-28 animate-float-fast" style={{ animationDelay: '4s' }} />
            <img src="/uiv1.png" alt="" className="absolute top-[80%] left-[20%] w-20 animate-float-slow" style={{ animationDelay: '6s' }} />
            <img src="/uiv1.png" alt="" className="absolute top-[15%] left-[85%] w-16 animate-float-medium" style={{ animationDelay: '1s' }} />
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
