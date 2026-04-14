import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, push, remove, set, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import YoutubePlayer from '../components/YoutubePlayer';
import QueuePanel from '../components/QueuePanel';
import { Users, Copy, Check, Play } from 'lucide-react';

const PlayerPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [queue, setQueue] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [askingName, setAskingName] = useState(false);
  const [tempName, setTempName] = useState('');

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

  // 2. Setup Firebase Presence & Queue Sync
  useEffect(() => {
    if (!username || !roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    const myUserRef = ref(db, `rooms/${roomId}/users/${username}`);
    const connectedRef = ref(db, '.info/connected');

    // Listener Queue
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array
        const queueArray = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        }));
        setQueue(queueArray);
      } else {
        setQueue([]);
      }
    });

    // Listener Presence
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myUserRef, true);
        onDisconnect(myUserRef).remove();
      }
    });

    // Listener Online Users Count
    const usersRef = ref(db, `rooms/${roomId}/users`);
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setOnlineCount(Object.keys(snapshot.val()).length);
      } else {
        setOnlineCount(0);
      }
    });

    return () => {
      unsubQueue();
      unsubConnected();
      unsubUsers();
      remove(myUserRef);
    };
  }, [roomId, username]);

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
    // When video ends, we pop the first item from the queue
    if (queue.length > 0) {
      handleRemoveVideo(queue[0].id);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (askingName) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-youtube-card p-6 rounded-2xl w-full max-w-sm border border-white/10 text-center">
          <h2 className="text-xl font-bold mb-4">Siapa nama Anda?</h2>
          <form onSubmit={handleSaveName}>
            <input
              type="text"
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Masukkan nama panggilan..."
              className="w-full bg-youtube-dark border border-white/10 rounded-xl px-4 py-3 mb-4 text-white placeholder-white/30 focus:outline-none focus:border-youtube-red"
            />
            <button type="submit" className="w-full bg-youtube-red hover:bg-red-600 font-semibold py-3 rounded-xl transition-colors">
              Gabung Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentVideo = queue.length > 0 ? queue[0] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-youtube-dark/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-youtube-red rounded-full flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Room: <span className="opacity-80 font-mono text-sm bg-white/10 px-2 py-0.5 rounded ml-1">{roomId}</span></h1>
            <p className="text-xs text-youtube-muted">Login sebagai: <span className="text-white/80 font-medium">{username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Tersalin!' : 'Copy Link'}
          </button>
          
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
          
          <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center p-4">
            <YoutubePlayer 
              currentVideo={currentVideo} 
              onVideoEnd={handleVideoEnd}
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
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
