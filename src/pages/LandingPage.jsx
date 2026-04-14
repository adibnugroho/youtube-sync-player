import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

const LandingPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorObj, setErrorObj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    if (savedName) {
      setUsername(savedName);
    }
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    setErrorObj('');

    const trimmedName = username.trim();
    if (!trimmedName) return;
    
    if (password !== 'Ngewekuda') {
      setErrorObj('Incorrect password. Access denied.');
      return;
    }
    
    setIsLoading(true);

    try {
      const usersRef = ref(db, 'rooms/global-room/users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const isNameTaken = Object.values(usersData).some(
          (u) => u.username.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isNameTaken) {
          setErrorObj(`Username "${trimmedName}" is already in the room. Please choose another name.`);
          setIsLoading(false);
          return;
        }
      } else {
        // PENGHANCURAN TOTAL: Jika tidak ada satupun user di ruangan (snapshot false),
        // reset sepenuhnya ruangan agar tidak ada queue dari hari kemarin.
        await import('firebase/database').then(({ remove }) => {
            return remove(ref(db, 'rooms/global-room'));
        });
      }

      localStorage.setItem('ytq_username', trimmedName);
      localStorage.setItem('ytq_password', password);
      navigate('/player');
    } catch (err) {
      console.error(err);
      setErrorObj('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-yt-bg text-yt-text transition-colors duration-300 min-h-screen">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-youtube-red/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md bg-yt-card/80 backdrop-blur-xl p-8 rounded-2xl border border-yt-border shadow-2xl transition-colors duration-300">
        <div className="flex items-center justify-center mb-8 gap-3">
          <div className="w-12 h-12 bg-youtube-red rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.4)]">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sync<span className="text-youtube-red">Play</span></h1>
        </div>
        
        <p className="text-center text-yt-muted mb-6 transition-colors duration-300">
          Watch YouTube together with friends in real-time, hassle-free.
        </p>

        <form onSubmit={handleJoin} className="space-y-5">
          {errorObj && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium text-center">
              {errorObj}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-yt-muted mb-2 transition-colors duration-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 text-yt-text placeholder-yt-muted focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-yt-muted mb-2 transition-colors duration-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Room Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorObj('');
                }}
                placeholder="Enter secret password..."
                className="w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 pr-12 text-yt-text placeholder-yt-muted focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all disabled:opacity-50"
                disabled={isLoading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-yt-muted hover:text-yt-text transition-colors p-1"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-youtube-red hover:bg-red-600 disabled:bg-youtube-red/70 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_14px_rgba(255,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 mt-2"
          >
            {isLoading ? 'Checking...' : 'Join Global Room'} {!isLoading && <Play className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage;
