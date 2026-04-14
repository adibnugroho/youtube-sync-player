import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push, remove, set, update, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import YoutubePlayer from '../components/YoutubePlayer';
import QueuePanel from '../components/QueuePanel';
import ThemeToggle from '../components/ThemeToggle';
import { Users, Copy, Check, Play, LogOut, Home } from 'lucide-react';

const PlayerPage = () => {
  const navigate = useNavigate();
  const roomId = 'global-room';
  
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  
  const [username, setUsername] = useState('');
  const [queue, setQueue] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  
  const [remotePlayerState, setRemotePlayerState] = useState(null);

  // 1. Cek Login (Jika belum, lempar ke Index)
  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    if (!savedName) {
      navigate('/');
    } else {
      setUsername(savedName);
    }
  }, [navigate]);

  // 2. Setup Firebase
  useEffect(() => {
    if (!username) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    const playerStateRef = ref(db, `rooms/${roomId}/playerState`);
    const myUserRef = ref(db, `rooms/${roomId}/users/${sessionId}`);
    const connectedRef = ref(db, '.info/connected');

    // Listener Queue
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queueArray = Object.entries(data).map(([id, val]) => ({
          id, ...val
        }));
        queueArray.sort((a, b) => (a.orderIndex || a.timestamp) - (b.orderIndex || b.timestamp));
        setQueue(queueArray);
      } else {
        setQueue([]);
      }
    });

    // Listener Player State
    const unsubPlayerState = onValue(playerStateRef, (snapshot) => {
      if (snapshot.exists()) {
        setRemotePlayerState(snapshot.val());
      }
    });

    // Listener Presence
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myUserRef, { username, joinedAt: Date.now() });
        onDisconnect(myUserRef).remove();
      }
    });

    // Listener Online Users Count & Data
    const usersRef = ref(db, `rooms/${roomId}/users`);
    let roomOnDisconnectRef = null;

    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        const count = Object.keys(usersObj).length;
        setOnlineCount(count);
        
        // Ambil nama-nama untuk tooltip
        const names = Object.values(usersObj).map((u) => u.username);
        setOnlineUsers(names);

        if (count === 1) {
          roomOnDisconnectRef = onDisconnect(roomRef);
          roomOnDisconnectRef.remove();
        } else if (count > 1 && roomOnDisconnectRef) {
          roomOnDisconnectRef.cancel();
          roomOnDisconnectRef = null;
        }
      } else {
        setOnlineCount(0);
        setOnlineUsers([]);
      }
    });

    return () => {
      unsubQueue();
      unsubConnected();
      unsubUsers();
      unsubPlayerState();
      remove(myUserRef);
    };
  }, [username, sessionId, roomId]);

  // Handlers
  const handleAddVideo = (videoId) => {
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    push(queueRef, { videoId, sender: username, timestamp: Date.now(), orderIndex: Date.now() });
  };

  const handleReorderQueue = (newQueueArray) => {
    const updates = {};
    const baseTime = Date.now();
    newQueueArray.forEach((item, index) => {
       updates[`rooms/${roomId}/queue/${item.id}/orderIndex`] = baseTime + index;
    });
    update(ref(db), updates);
  };

  const handleRemoveVideo = (id) => remove(ref(db, `rooms/${roomId}/queue/${id}`));

  const handleVideoEnd = () => {
    if (queue.length > 0) handleRemoveVideo(queue[0].id);
  };

  const handleLocalPlayerStateChange = (state, time) => {
    const stateRef = ref(db, `rooms/${roomId}/playerState`);
    set(stateRef, { state, time, updatedBy: sessionId, timestamp: Date.now() });
  };

  const handleCopyLink = () => {
    // Karena Global room, cukup copy URL root
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('ytq_username'); // Hapus sesi
    navigate('/');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  // Pastikan render tidak terjadi sebelum check login selesai
  if (!username) return null;

  const currentVideo = queue.length > 0 ? queue[0] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-yt-bg text-yt-text transition-colors duration-300">
      {/* Header */}
      <header className="h-16 border-b border-yt-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-yt-bg/80 backdrop-blur-md z-10 transition-colors">
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-full bg-youtube-red flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight">Global Room</h1>
            <p className="text-xs text-yt-muted">Login sebagai <span className="text-yt-text font-medium">{username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden lg:inline">{copied ? 'Tersalin!' : 'Copy Link'}</span>
          </button>

          <ThemeToggle />
          
          {/* Online Users with Tooltip */}
          <div 
            className="relative"
            onMouseEnter={() => setIsTooltipOpen(true)}
            onMouseLeave={() => setIsTooltipOpen(false)}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-youtube-red/10 border border-youtube-red/20 rounded-lg text-sm font-medium cursor-default">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <Users className="w-4 h-4 text-youtube-red" />
              <span>{onlineCount}</span>
            </div>

            {/* Tooltip Dropdown */}
            {isTooltipOpen && onlineUsers.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-yt-card border border-yt-border rounded-xl shadow-2xl p-2 z-50">
                <p className="text-xs font-semibold text-yt-muted mb-2 px-2 uppercase tracking-wider border-b border-yt-border pb-1">Orang di Room ({onlineCount})</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {onlineUsers.map((name, i) => (
                    <div key={i} className="px-2 py-1.5 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 truncate flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-yt-text uppercase shrink-0">
                          {name.charAt(0)}
                       </div>
                       {name} {name === username && <span className="text-xs text-youtube-red ml-auto">(Anda)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-yt-border mx-1"></div>

          {/* Navigation Controls */}
          <button 
            onClick={handleGoHome}
            title="Ke Beranda"
            className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-yt-muted hover:text-yt-text transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleLogout}
            title="Keluar Room"
            className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Keluar</span>
          </button>

        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Left: Player */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-video bg-youtube-red/5 rounded-[100%] blur-[100px] pointer-events-none"></div>
          
          <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center p-0 sm:p-4">
            <YoutubePlayer 
              currentVideo={currentVideo} 
              onVideoEnd={handleVideoEnd}
              remotePlayerState={remotePlayerState}
              onLocalStateChange={handleLocalPlayerStateChange}
              localSessionId={sessionId}
            />
          </div>
        </div>

        {/* Right: Queue Panel */}
        <div className="w-full lg:w-96 flex flex-col shrink-0 min-h-0 h-[400px] lg:h-auto">
          <QueuePanel 
            queue={queue}
            currentVideoId={currentVideo?.videoId}
            onAddVideo={handleAddVideo}
            onRemoveVideo={handleRemoveVideo}
            onSkipVideo={handleVideoEnd}
            onReorderQueue={handleReorderQueue}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
