import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Monitor } from 'lucide-react';

const Home = ({ isAuthenticated }) => {
  const navigate = useNavigate();

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
    <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 overflow-hidden w-full h-full">
      <div
        className="absolute inset-0 pointer-events-none z-[-1] opacity-70 bg-cover bg-center"
        style={{ backgroundImage: "url('/bgzombies1.png')" }}
      />
      <div className="flex flex-col items-center gap-6 mb-14">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full scale-150" />

        </div>
        <div>
          <h1 className="text-6xl md:text-7xl font-black mb-3" data-text="Zombieware">
            Zombieware
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            The classroom trading card game platform. Simple for teachers, fun for students.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg">
        <button
          onClick={handleJoin}
          className="group flex-1 flex flex-col items-center justify-center gap-3 py-10 px-8 rounded-3xl text-2xl neon-btn transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Users size={40} strokeWidth={2.5} />
          JOIN
          <span className="text-sm font-medium group-hover:text-black group-hover:font-bold -mt-1">Enter a classroom</span>
        </button>

        <button
          onClick={handleHost}
          className="group flex-1 flex flex-col items-center justify-center gap-3 py-10 px-8 rounded-3xl text-2xl neon-btn-alt transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <Monitor size={40} strokeWidth={2.5} />
          HOST
          <span className="text-sm font-medium text-[var(--neon-cyan)] group-hover:text-black  group-hover:font-bold -mt-1">Create a class session</span>
        </button>
      </div>

      {!isAuthenticated && (
        <p className="mt-8 text-slate-500">
          Login required to play.
        </p>
      )}
      <div className="absolute bottom-[5%]  hidden lg:flex gap-10 flex-row w-[70%] justify-center">
        <div className="flex flex-row gap-3 items-center">
          <img src="/nrp1.png" alt="Players" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            6-11 players
          </p>
        </div>
        <div className="flex flex-row gap-3 items-center">
          <img src="/time1.png" alt="Duration" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            15-20 minutes
          </p>
        </div>
        <div className="flex flex-row gap-3 items-center">
          <img src="/age1.png" alt="Age" className="w-[60px] h-[60px] object-contain drop-shadow-[0px_0_10px_rgba(255,255,255,0.3)]" />
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            14+ years old
          </p>
        </div>
      </div>

      <div className="fixed left-[-10px] bottom-[30px] w-[200px] h-[200px] opacity-90 pointer-events-none">
        <img src="/uil1.png" alt="Lock" className="w-full h-full object-contain drop-shadow-[0px_0_20px_rgba(255,255,255,100)]" />
      </div>
    </div>
  );
};

export default Home;
