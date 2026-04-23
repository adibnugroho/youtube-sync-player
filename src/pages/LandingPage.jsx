import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Lock, Eye, EyeOff, Plus, LogIn } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';

const LandingPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomParam = searchParams.get('room');

  const [mode, setMode] = useState(roomParam ? 'join' : 'create'); // 'create' or 'join'
  const [roomIdInput, setRoomIdInput] = useState(roomParam || ''); // For join mode if no param

  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState(''); // Only used for create
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorObj, setErrorObj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (roomParam) {
      setMode('join');
      setRoomIdInput(roomParam);
    }
  }, [roomParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorObj('');

    const trimmedName = username.trim();
    if (!trimmedName) return;
    
    setIsLoading(true);

    try {
      if (mode === 'create') {
        const trimmedRoomName = roomName.trim();
        if (!trimmedRoomName || !password) {
           setErrorObj('Room name and password are required.');
           setIsLoading(false);
           return;
        }

        // Create Room logic
        // Format roomID: Room + sequence number (ex: Room-1234)
        const seqNum = Math.floor(1000 + Math.random() * 9000);
        const generatedRoomId = `Room-${seqNum}`;
        
        const roomRef = ref(db, `rooms/${generatedRoomId}`);
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
           setErrorObj('Room sequence collision. Please try creating again.');
           setIsLoading(false);
           return;
        }

        await set(ref(db, `rooms/${generatedRoomId}/metadata`), {
           name: trimmedRoomName,
           password: password,
           createdAt: Date.now()
        });

        localStorage.setItem(`ytq_username_${generatedRoomId}`, trimmedName);
        localStorage.setItem(`ytq_password_${generatedRoomId}`, password);
        navigate(`/room/${generatedRoomId}`);
        
      } else {
        // Join Room logic
        const targetRoomId = roomIdInput.trim();
        if (!targetRoomId) {
          setErrorObj('Room ID is required.');
          setIsLoading(false);
          return;
        }
        
        const roomRef = ref(db, `rooms/${targetRoomId}`);
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
           setErrorObj('Room not found! It may have expired or never existed.');
           setIsLoading(false);
           return;
        }
        
        const roomData = snapshot.val();
        if (!roomData.metadata) {
            // Support legacy rooms if any
            if (targetRoomId !== 'global-room') {
                setErrorObj('Invalid room format.');
                setIsLoading(false);
                return;
            } else if (password !== 'Ngewekuda') {
                setErrorObj('Incorrect password. Access denied.');
                setIsLoading(false);
                return;
            }
        } else {
            if (roomData.metadata.password !== password) {
                setErrorObj('Incorrect room password. Access denied.');
                setIsLoading(false);
                return;
            }
        }
        
        // Cek username bentrok
        const usersRef = ref(db, `rooms/${targetRoomId}/users`);
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
           const usersData = usersSnapshot.val();
           const isNameTaken = Object.values(usersData).some(
             (u) => u.username.toLowerCase() === trimmedName.toLowerCase()
           );

           if (isNameTaken) {
             setErrorObj(`Username "${trimmedName}" is already taken in this room.`);
             setIsLoading(false);
             return;
           }
        }

        localStorage.setItem(`ytq_username_${targetRoomId}`, trimmedName);
        localStorage.setItem(`ytq_password_${targetRoomId}`, password);
        navigate(`/room/${targetRoomId}`);
      }
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
        <div className="flex items-center justify-center mb-6 gap-3">
          <div className="w-12 h-12 bg-youtube-red rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.4)]">
            <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Youtube<span className="text-youtube-red"> Playlist Queue</span></h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('create'); setErrorObj(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'create' ? 'bg-yt-card shadow-sm text-yt-text' : 'text-yt-muted hover:text-yt-text'}`}
          >
            <Plus className="w-4 h-4" /> Create Room
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setErrorObj(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'join' ? 'bg-yt-card shadow-sm text-yt-text' : 'text-yt-muted hover:text-yt-text'}`}
          >
            <LogIn className="w-4 h-4" /> Join Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorObj && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium text-center">
              {errorObj}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-yt-muted mb-1.5 transition-colors duration-300">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 text-yt-text placeholder-yt-muted focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          {mode === 'create' ? (
            <div>
              <label className="block text-sm font-medium text-yt-muted mb-1.5 transition-colors duration-300">
                Room Name
              </label>
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Name your awesome room..."
                className="w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 text-yt-text placeholder-yt-muted focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all disabled:opacity-50"
                disabled={isLoading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-yt-muted mb-1.5 transition-colors duration-300">
                Room ID
              </label>
              <input
                type="text"
                required
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="e.g. Room-1234"
                readOnly={!!roomParam}
                className={`w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 text-yt-text placeholder-yt-muted focus:outline-none focus:ring-2 focus:ring-youtube-red focus:border-transparent transition-all disabled:opacity-50 ${roomParam ? 'opacity-70 bg-black/5 dark:bg-white/5 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-yt-muted mb-1.5 transition-colors duration-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> {mode === 'create' ? 'Set Room Password' : 'Room Password'}
            </label>
            <div className="relative">
              <input
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
            className="w-full bg-youtube-red hover:bg-red-600 disabled:bg-youtube-red/70 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_14px_rgba(255,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 mt-4"
          >
            {isLoading ? 'Processing...' : (mode === 'create' ? 'Create Room' : 'Join Room')} {!isLoading && (mode === 'create' ? <Plus className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage;
