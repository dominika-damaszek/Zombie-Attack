import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Skull, Play } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full"></div>
        <div className="bg-slate-800/80 p-8 rounded-[3rem] border border-slate-700 shadow-2xl relative">
          <Skull size={96} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
          Zombieware
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto font-medium">
          The ultimate classroom multiplayer game platform. Survive, thrive, and learn together.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8">
        <button 
          onClick={() => navigate('/join')}
          className="btn-primary flex items-center justify-center space-x-2 text-lg px-8 py-4"
        >
          <Play size={24} fill="currentColor" />
          <span>Join Game</span>
        </button>
        <button 
          onClick={() => navigate('/host')}
          className="btn-secondary flex items-center justify-center space-x-2 text-lg px-8 py-4"
        >
          <span>Host a Session</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
