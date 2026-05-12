import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { API_URLS } from './services/api';
import TopNav from './components/TopNav';
import HelpButton from './components/HelpButton';
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
import History from './pages/History';
import ScanTest from './pages/ScanTest';
import Rules from './pages/Rules';
import AboutUs from './pages/AboutUs';

function SpaRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirect = sessionStorage.getItem('spa_redirect');
    if (redirect && redirect !== '/') {
      sessionStorage.removeItem('spa_redirect');
      navigate(redirect, { replace: true });
    }
  }, [navigate]);
  return null;
}

function AppContent({ isAuthenticated, hasSession, setIsAuthenticated, setHasSession }) {
  const location = useLocation();
  const isFullScreenGame = location.pathname.startsWith('/game');
  const isPreview = location.pathname.startsWith('/preview');

  return (
    <div className="flex flex-col min-h-screen bg-transparent selection:bg-emerald-500/30">
      {!isPreview && (
        <TopNav
          isAuthenticated={isAuthenticated}
          hasSession={hasSession}
          setIsAuthenticated={setIsAuthenticated}
          setHasSession={setHasSession}
        />
      )}

      <main className="flex-1 overflow-y-auto relative">
        <HelpButton />
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
            <Route path="/auth" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/about" element={<AboutUs />} />
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
              path="/history"
              element={isAuthenticated ? <History /> : <Navigate to="/auth" state={{ from: '/history' }} />}
            />
            <Route path="/scan-test" element={<ScanTest />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <div className="fixed top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none -z-0" />
        {/* Floating Viruses */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <img src="/uiv1.png" alt="" className="absolute top-[10%] left-[10%] w-16 sm:w-32 animate-float-slow" />
          <img src="/uiv1.png" alt="" className="absolute top-[60%] left-[80%] w-12 sm:w-24 animate-float-medium" style={{ animationDelay: '2s' }} />
          <img src="/uiv1.png" alt="" className="absolute top-[0%] left-[50%] w-14 sm:w-28 animate-float-fast" style={{ animationDelay: '4s' }} />
          <img src="/uiv1.png" alt="" className="absolute top-[80%] left-[20%] w-10 sm:w-20 animate-float-slow" style={{ animationDelay: '6s' }} />
          <img src="/uiv1.png" alt="" className="absolute top-[2%] left-[50%] w-8 sm:w-16 animate-float-medium" style={{ animationDelay: '1s' }} />
        </div>
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [hasSession, setHasSession] = useState(() => !!localStorage.getItem('session_id'));

  // Validate the stored token once on mount; if it's stale/invalid, log out.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setIsAuthenticated(false); return; }
    fetch(`${API_URLS.BASE}/auth/me?token=${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      });
  }, []);

  useEffect(() => {
    const syncSession = () => {
      setHasSession(!!localStorage.getItem('session_id'));
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <SpaRedirectHandler />
        <AppContent 
          isAuthenticated={isAuthenticated} 
          hasSession={hasSession} 
          setIsAuthenticated={setIsAuthenticated} 
          setHasSession={setHasSession} 
        />
      </Router>
    </LanguageProvider>
  );
}

export default App;
