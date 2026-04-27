import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';
import { API_URLS } from '../services/api';

const Auth = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const API_URL = API_URLS.AUTH;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await axios.post(`${API_URL}${endpoint}`, { username, pin });

      localStorage.setItem('token', response.data.access_token);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during authentication.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-500">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="flex mb-8 bg-slate-900/50 rounded-xl p-1">
          <button
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${isLogin ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${!isLogin ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register
          </button>
        </div>

        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/50 p-3 rounded-lg mb-6 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">PIN</label>
            <input
              type="password"
              className="input-field"
              placeholder="4-digit PIN"
              maxLength="4"
              pattern="\d{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center space-x-2 mt-4">
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            <span>{isLogin ? 'Login to Account' : 'Create Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
