import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

const LandingPage = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    if (savedName) {
      setUsername(savedName);
    }
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    // Simpan ke localstorage
    localStorage.setItem('ytq_username', username.trim());
    
    // Generate Room ID unik (8 karakter alphanumeric)
    const roomId = Math.random().toString(36).substring(2, 10);
    navigate(`/player/${roomId}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Background Ornament */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-youtube-red/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="z-10 w-full max-w-md bg-youtube-card/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-center mb-8 gap-3">
          <div className="w-12 h-12 bg-youtube-red rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.4)]">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sync<span className="text-youtube-red">Play</span></h1>
        </div>
        
        <p className="text-center text-youtube-muted mb-8">
          Nonton YouTube bareng teman secara real-time tanpa ribet.
        </p>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-youtube-muted mb-2">
              Nama Pengguna
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan nama panggilanmu..."
              className="w-full bg-youtube-dark/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-youtube-red hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_14px_rgba(255,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2"
          >
            Membuat Room <Play className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage;
