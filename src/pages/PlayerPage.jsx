import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push, remove, set, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import YoutubePlayer from '../components/YoutubePlayer';
import QueuePanel from '../components/QueuePanel';
import ThemeToggle from '../components/ThemeToggle';
import { Users, Play } from 'lucide-react';

const PlayerPage = () => {
  const navigate = useNavigate();
  // Menggunakan 1 Room yang statis untuk seluruh dunia (Global Room)
  const roomId = 'global-room';
  
  // Session ID yang unik untuk tiap tab
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  
  const [username, setUsername] = useState('');
  const [queue, setQueue] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [askingName, setAskingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Synchronized Player State
  const [remotePlayerState, setRemotePlayerState] = useState(null);

  // 1. Cek Username
  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    if (!savedName) {
      setAskingName(true);
    } else {
      setUsername(savedName);
      setAskingName(false);
    }
  }, []);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    localStorage.setItem('ytq_username', tempName.trim());
    setUsername(tempName.trim());
    setAskingName(false);
  };

  // 2. Setup Firebase Presence, Queue Sync, & Player State
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
          id,
          ...val
        }));
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

    // Listener Presence (menggunakan sessionId agar unik per tab)
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myUserRef, { username, joinedAt: Date.now() });
        onDisconnect(myUserRef).remove();
      }
    });

    // Listener Online Users Count & Ghost Room Cleanup
    const usersRef = ref(db, `rooms/${roomId}/users`);
    let roomOnDisconnectRef = null;

    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const count = Object.keys(snapshot.val()).length;
        setOnlineCount(count);

        if (count === 1) {
          roomOnDisconnectRef = onDisconnect(roomRef);
          roomOnDisconnectRef.remove();
        } else if (count > 1 && roomOnDisconnectRef) {
          roomOnDisconnectRef.cancel();
          roomOnDisconnectRef = null;
        }
      } else {
        setOnlineCount(0);
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
    push(queueRef, {
      videoId,
      sender: username,
      timestamp: Date.now()
    });
  };

  const handleRemoveVideo = (id) => {
    const itemRef = ref(db, `rooms/${roomId}/queue/${id}`);
    remove(itemRef);
  };

  const handleVideoEnd = () => {
    if (queue.length > 0) {
      handleRemoveVideo(queue[0].id);
    }
  };

  // Handles Local Play/Pause
  const handleLocalPlayerStateChange = (state, time) => {
    const stateRef = ref(db, `rooms/${roomId}/playerState`);
    set(stateRef, {
      state, // 1 = play, 2 = pause
      time,
      updatedBy: sessionId,
      timestamp: Date.now()
    });
  };

  if (askingName) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-yt-bg text-yt-text">
        <div className="bg-yt-card p-6 rounded-2xl w-full max-w-sm border border-yt-border text-center shadow-xl">
          <h2 className="text-xl font-bold mb-4">Siapa nama Anda?</h2>
          <form onSubmit={handleSaveName}>
            <input
              type="text"
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Masukkan nama panggilan..."
              className="w-full bg-yt-bg border border-yt-border rounded-xl px-4 py-3 mb-4 text-yt-text placeholder-yt-muted focus:outline-none focus:border-youtube-red"
            />
            <button type="submit" className="w-full bg-youtube-red hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors">
              Gabung Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentVideo = queue.length > 0 ? queue[0] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-yt-bg text-yt-text transition-colors duration-300">
      {/* Header */}
      <header className="h-16 border-b border-yt-border flex items-center justify-between px-6 shrink-0 bg-yt-bg/80 backdrop-blur-md z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-youtube-red rounded-full flex items-center justify-center cursor-pointer shadow-lg" onClick={() => navigate('/')}>
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Global Room</h1>
            <p className="text-xs text-yt-muted">Login sebagai: <span className="text-yt-text font-medium">{username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-youtube-red/10 border border-youtube-red/20 rounded-lg text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <Users className="w-4 h-4 text-youtube-red" />
            <span>{onlineCount} Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Left: Player */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {/* Background Glow */}
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
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
