import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../firebase';

const REACTIONS = ['👍', '❤️', '😂', '😲'];

const ChatPanel = ({ roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const chatRef = ref(db, `rooms/${roomId}/chat`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        // Sorter by timestamp ascending
        msgArray.sort((a, b) => a.timestamp - b.timestamp);
        // Only keep last 200 messages locally to prevent lag
        setMessages(msgArray.slice(-200));
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (textOverride = null) => {
    const textToSend = textOverride !== null ? textOverride : inputText.trim();
    if (!textToSend) return;

    const chatRef = ref(db, `rooms/${roomId}/chat`);
    push(chatRef, {
      sender: username,
      text: textToSend,
      timestamp: Date.now()
    });

    if (textOverride === null) {
      setInputText('');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-yt-card border border-yt-border rounded-2xl overflow-hidden transition-colors duration-300">
      
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative bg-black/5 dark:bg-black/20">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-yt-muted opacity-50 p-6 text-center">
            <MessageSquare className="w-10 h-10 mb-3" strokeWidth={1.5} />
            <p className="text-sm">No messages yet. Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender === username;
            const isConsecutive = idx > 0 && messages[idx-1].sender === msg.sender && (msg.timestamp - messages[idx-1].timestamp < 60000);

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutive ? 'mt-1' : 'mt-3'}`}>
                {!isConsecutive && (
                  <span className="text-[10px] text-yt-muted ml-1 mr-1 mb-0.5 font-medium flex items-center gap-1.5">
                    {isMe ? 'You' : msg.sender} • {formatTime(msg.timestamp)}
                  </span>
                )}
                
                <div className={`px-3 py-2 rounded-2xl max-w-[85%] break-words text-sm shadow-sm ${
                    isMe 
                      ? 'bg-youtube-red text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-white/10 text-yt-text rounded-tl-sm border border-yt-border dark:border-transparent'
                  }`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-yt-card border-t border-yt-border z-10 transition-colors flex flex-col gap-2 shrink-0">
        
        {/* Emoji Reactions Tray */}
        <div className="flex gap-2 mb-1 px-1">
          {REACTIONS.map((emoji) => (
            <button 
              key={emoji}
              onClick={() => handleSendMessage(emoji)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 hover:scale-110 transition-transform text-base shadow-sm"
              title="Quick Reaction"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-yt-bg border border-yt-border rounded-xl px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:ring-1 focus:ring-youtube-red transition-all" 
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()} 
            className="w-10 h-10 flex items-center justify-center bg-youtube-red hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-youtube-red text-white rounded-xl shadow-md transition-colors shrink-0"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
