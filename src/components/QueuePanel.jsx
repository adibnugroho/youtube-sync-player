import React, { useState } from 'react';
import { Plus, Link, Trash2, ListVideo, SkipForward, GripVertical, ArrowUp, ArrowDown, StepForward, Play } from 'lucide-react';

const extractVideoID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const QueuePanel = ({ queue, currentVideoId, onAddVideo, onRemoveVideo, onSkipVideo, onReorderQueue }) => {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const videoId = extractVideoID(urlInput);
    if (!videoId) {
      setError('Link YouTube tdk valid. Gunakan format youtube.com/watch?v=... atau youtu.be/...');
      return;
    }

    setIsFetchingInfo(true);
    let title = '';
    try {
      // Bypass API Key using public oEmbed endpoint
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        title = data.title;
      }
    } catch (err) {
      console.warn("Gagal menarik judul YouTube (oEmbed diblokir atau limit)", err);
    }
    setIsFetchingInfo(false);

    onAddVideo(videoId, title);
    setUrlInput('');
    setError('');
  };

  const handleDragStart = (e, index) => {
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedIdx(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx || targetIdx === 0) {
      setDraggedIdx(null);
      return;
    }

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIdx, 1);
    newQueue.splice(targetIdx, 0, draggedItem);

    if (onReorderQueue) onReorderQueue(newQueue);
    setDraggedIdx(null);
  };

  const handleMoveUp = (index) => {
    if (index <= 1) return; // Cannot bump the playing video (0)
    const newQueue = [...queue];
    const temp = newQueue[index - 1];
    newQueue[index - 1] = newQueue[index];
    newQueue[index] = temp;
    if (onReorderQueue) onReorderQueue(newQueue);
  };

  const handleMoveDown = (index) => {
    if (index === 0 || index === queue.length - 1) return;
    const newQueue = [...queue];
    const temp = newQueue[index + 1];
    newQueue[index + 1] = newQueue[index];
    newQueue[index] = temp;
    if (onReorderQueue) onReorderQueue(newQueue);
  };

  const handlePlayNext = (index) => {
    if (index <= 1) return; // Already playing next
    const newQueue = [...queue];
    const item = newQueue.splice(index, 1)[0];
    newQueue.splice(1, 0, item); // Sisipkan tepat sesudah index 0
    if (onReorderQueue) onReorderQueue(newQueue);
  };

  const handlePlayNow = (index) => {
    if (index === 0) return;
    const newQueue = [...queue];
    const item = newQueue.splice(index, 1)[0]; // Cabut dari urutan awal
    newQueue.splice(0, 1, item); // Ganti index 0 dengan item ini (yang lama terhapus)
    if (onReorderQueue) onReorderQueue(newQueue);
  };

  return (
    <div className="flex flex-col h-full bg-yt-card rounded-2xl border border-yt-border overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-yt-border bg-black/5 dark:bg-white/5 flex items-center gap-3">
        <div className="p-2 bg-youtube-red/10 rounded-lg">
          <ListVideo className="w-5 h-5 text-youtube-red" />
        </div>
        <h2 className="text-lg font-semibold tracking-wide text-yt-text flex-1">Antrean Video</h2>
        
        {queue.length > 0 && (
          <button 
            onClick={onSkipVideo}
            title="Lewati Video (Skip)"
            className="bg-black/10 dark:bg-white/10 hover:bg-youtube-red hover:text-white dark:hover:bg-youtube-red px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Skip</span>
          </button>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
        {queue.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-yt-muted opacity-50 p-6 text-center transition-colors">
            <ListVideo className="w-12 h-12 mb-3" strokeWidth={1} />
            <p>Belum ada video di antrean.</p>
            <p className="text-sm mt-1">Tambahkan link di bawah.</p>
          </div>
        ) : (
          queue.map((item, index) => {
            const isPlaying = item.videoId === currentVideoId && index === 0;
            const isDraggable = !isPlaying;
            return (
              <div 
                key={item.id} 
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex gap-2 p-2 rounded-xl transition-all group ${isPlaying ? 'bg-youtube-red/10 border-youtube-red/20 border' : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {/* Drag Handle Indicator */}
                <div className={`flex flex-col items-center justify-center text-yt-muted ${!isDraggable ? 'hidden' : 'opacity-40 group-hover:opacity-100 hover:text-yt-text'}`}>
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="w-24 sm:w-28 aspect-video bg-black rounded-lg overflow-hidden shrink-0 relative">
                  <img 
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-youtube-red/20 flex items-center justify-center">
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold bg-youtube-red text-white px-2 py-0.5 rounded-sm shadow-lg pointer-events-none">Diputar</span>
                    </div>
                  )}
                  {/* Tag Index Nomor */}
                  {!isPlaying && (
                     <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-mono pointer-events-none">
                        #{index}
                     </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center flex-1 min-w-0 pr-1">
                  <p className="text-sm font-medium line-clamp-2 text-yt-text" title={item.title || item.videoId}>
                    {item.title || `Video ID: ${item.videoId}`}
                  </p>
                  <p className="text-xs text-yt-muted mt-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center pt-px text-[9px] uppercase font-bold text-yt-text">
                      {item.sender.charAt(0)}
                    </span>
                    {item.sender}
                  </p>
                </div>

                {/* Quick Action Columns */}
                {isDraggable && (
                   <div className="hidden group-hover:flex flex-col items-center justify-center gap-1 px-1 animate-in fade-in duration-200">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                       disabled={index === 1}
                       className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent text-yt-muted transition-colors" title="Geser ke Atas"
                     ><ArrowUp className="w-3.5 h-3.5" /></button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                       disabled={index === queue.length - 1}
                       className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent text-yt-muted transition-colors" title="Geser ke Bawah"
                     ><ArrowDown className="w-3.5 h-3.5" /></button>
                   </div>
                )}

                <div className="hidden group-hover:flex flex-col justify-center items-center gap-1 border-l border-yt-border/50 pl-2 animate-in fade-in duration-200">
                  {isDraggable && (
                     <>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handlePlayNow(index); }}
                         className="p-1 px-2 w-full bg-youtube-red hover:bg-red-600 text-white rounded transition-colors flex items-center justify-center gap-1 shadow-sm"
                         title="Mainkan Sekarang (Menimpa video saat ini)"
                       >
                         <Play className="w-3 h-3" fill="currentColor" />
                         <span className="text-[9px] uppercase font-bold">Play</span>
                       </button>
                       {index > 1 && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handlePlayNext(index); }}
                           className="p-1 px-2 w-full bg-youtube-red/10 hover:bg-youtube-red text-youtube-red hover:text-white rounded transition-colors flex items-center justify-center gap-1"
                           title="Mainkan Selanjutnya (Pindah ke Antrean #1)"
                         >
                           <StepForward className="w-3 h-3" />
                           <span className="text-[9px] uppercase font-bold hidden xl:inline">Next</span>
                         </button>
                       )}
                     </>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveVideo(item.id); }}
                    className="p-1.5 mt-1 hover:bg-red-500/10 rounded-lg text-yt-muted hover:text-red-500 transition-colors w-full flex justify-center"
                    title="Hapus dari antrean"
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
      <div className="p-4 bg-black/5 dark:bg-black/30 border-t border-yt-border transition-colors">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yt-muted">
                <Link className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setError(''); }}
                placeholder="Tempel link YouTube..."
                className="w-full bg-yt-bg border border-yt-border rounded-xl py-2.5 pl-9 pr-4 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:ring-1 focus:ring-youtube-red focus:border-youtube-red transition-all disabled:opacity-50"
                disabled={isFetchingInfo}
              />
            </div>
            <button
              type="submit"
              disabled={!urlInput.trim() || isFetchingInfo}
              className="bg-youtube-red hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-youtube-red text-white p-2.5 rounded-xl shadow-lg transition-colors shrink-0"
            >
              <Plus className={`w-5 h-5 ${isFetchingInfo ? 'animate-spin opacity-50' : ''}`} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueuePanel;
