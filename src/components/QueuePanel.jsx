import React, { useState } from 'react';
import { Plus, Link, Trash2, GripVertical, ListVideo } from 'lucide-react';

const extractVideoID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const QueuePanel = ({ queue, currentVideoId, onAddVideo, onRemoveVideo }) => {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const videoId = extractVideoID(urlInput);
    if (!videoId) {
      setError('Link YouTube tidak valid. Gunakan format youtube.com/watch?v=... atau youtu.be/...');
      return;
    }

    onAddVideo(videoId);
    setUrlInput('');
    setError('');
  };

  return (
    <div className="flex flex-col h-full bg-youtube-card rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex items-center gap-3">
        <div className="p-2 bg-youtube-red/10 rounded-lg">
          <ListVideo className="w-5 h-5 text-youtube-red" />
        </div>
        <h2 className="text-lg font-semibold tracking-wide">Antrean Video</h2>
        <div className="ml-auto bg-white/10 text-xs px-2 py-1 rounded-full font-medium">
          {queue.length} video
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
        {queue.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-youtube-muted opacity-50 p-6 text-center">
            <ListVideo className="w-12 h-12 mb-3" strokeWidth={1} />
            <p>Belum ada video di antrean.</p>
            <p className="text-sm mt-1">Tambahkan link di bawah.</p>
          </div>
        ) : (
          queue.map((item, index) => {
            const isPlaying = item.videoId === currentVideoId && index === 0;
            return (
              <div 
                key={item.id} 
                className={`flex gap-3 p-3 rounded-xl transition-all group ${isPlaying ? 'bg-youtube-red/10 border-youtube-red/20 border' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="w-32 aspect-video bg-black rounded-lg overflow-hidden shrink-0 relative">
                  <img 
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover opacity-80"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-youtube-red/20 flex items-center justify-center">
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-youtube-red text-white px-2 py-0.5 rounded-sm shadow-lg">Sedang Diputar</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 text-white/90">
                    Video ID: {item.videoId}
                  </p>
                  <p className="text-xs text-youtube-muted mt-1.5 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center pt-px text-[9px] uppercase font-bold text-white/70">
                      {item.sender.charAt(0)}
                    </span>
                    {item.sender}
                  </p>
                </div>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onRemoveVideo(item.id)}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/30 border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {error && <p className="text-xs text-red-400 font-medium px-1">{error}</p>}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                <Link className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setError(''); }}
                placeholder="Tempel link YouTube..."
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-youtube-red focus:border-youtube-red transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!urlInput.trim()}
              className="bg-youtube-red hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-youtube-red text-white p-2.5 rounded-xl shadow-lg transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueuePanel;
