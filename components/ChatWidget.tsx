'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Minus, Move } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Message {
  id: string;
  sender_id: { name: string; role: string };
  sender_role: 'tenant' | 'admin';
  message: string;
  createdAt: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Draggable state - only two positions allowed
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Calculate actual pixel position based on position state
  const getPixelPosition = (pos: 'bottom-right' | 'bottom-left', isOpen: boolean) => {
    const margin = 16;
    const buttonSize = 56;
    const windowWidth = 320;
    const windowHeight = 400;
    
    const width = isOpen ? windowWidth : buttonSize;
    const height = isOpen ? windowHeight : buttonSize;
    
    if (pos === 'bottom-right') {
      return {
        x: window.innerWidth - width - margin,
        y: window.innerHeight - height - margin
      };
    } else {
      return {
        x: margin,
        y: window.innerHeight - height - margin
      };
    }
  };

  // Get current pixel position
  const currentPixelPosition = getPixelPosition(position, open);
  
  // Use temp position while dragging, otherwise use calculated position
  const displayPosition = isDragging ? tempPosition : currentPixelPosition;

  // Load saved position from localStorage (only once on mount)
  useEffect(() => {
    const saved = localStorage.getItem('chat_widget_position');
    if (saved && (saved === 'bottom-right' || saved === 'bottom-left')) {
      setPosition(saved);
    } else {
      setPosition('bottom-right'); // Default
    }
  }, []);

  // Handle window resize - recalculate pixel positions
  useEffect(() => {
    const handleResize = () => {
      // Force re-render to recalculate positions
      setPosition(prev => prev);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  if (!user || user.role === 'platform_admin') return null;

  const initChat = async () => {
    if (convId) return;
    setLoading(true);
    try {
      const res = await api.get('/chat/conversation');
      const id = res.data.data.id;
      setConvId(id);
      const msgs = await api.get(`/chat/messages/${id}`);
      setMessages(msgs.data.data);
      if (!socketRef.current) {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socket.emit('join_conversation', id);
        socket.on('new_message', (msg: Message) => {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_role === 'admin') setUnread(n => n + 1);
        });
        socketRef.current = socket;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    setMinimized(false);
    setUnread(0);
    await initChat();
  };

  const handleClose = () => {
    setOpen(false);
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConvId(null);
  };

  const send = async () => {
    if (!text.trim() || !convId) return;
    const body = text.trim();
    setText('');
    await api.post('/chat/messages', { conversation_id: convId, message: body });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const fmt = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button[type="button"]') || 
        (e.target as HTMLElement).closest('.drag-handle') ||
        !open) {
      e.preventDefault();
      setIsDragging(true);
      setHasDragged(false);
      setTempPosition(currentPixelPosition);
      setDragStart({
        x: e.clientX - currentPixelPosition.x,
        y: e.clientY - currentPixelPosition.y
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!(e.target as HTMLElement).closest('button[type="button"]') || 
        (e.target as HTMLElement).closest('.drag-handle') ||
        !open) {
      const touch = e.touches[0];
      setIsDragging(true);
      setHasDragged(false);
      setTempPosition(currentPixelPosition);
      setDragStart({
        x: touch.clientX - currentPixelPosition.x,
        y: touch.clientY - currentPixelPosition.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    setHasDragged(true);
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setTempPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    setHasDragged(true);
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setTempPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (hasDragged) {
      // Determine which position is closer: bottom-left or bottom-right
      const screenCenter = window.innerWidth / 2;
      const newPosition = tempPosition.x < screenCenter ? 'bottom-left' : 'bottom-right';
      
      setPosition(newPosition);
      localStorage.setItem('chat_widget_position', newPosition);
    }
    setIsDragging(false);
    setHasDragged(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent) => handleMouseMove(e);
      const handleTouchMoveEvent = (e: TouchEvent) => handleTouchMove(e);
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMoveEvent);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, tempPosition, open]);

  if (!open) {
    return (
      <div
        ref={widgetRef}
        className={`fixed z-50 transition-all duration-300 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          left: `${displayPosition.x}px`,
          top: `${displayPosition.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <button
          onClick={(e) => {
            if (!hasDragged) {
              handleOpen();
            }
            setHasDragged(false);
          }}
          className="w-14 h-14 bg-[#0D3B6E] hover:bg-[#1A5294] text-white rounded-full shadow-xl flex items-center justify-center transition-colors relative"
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>
        
        {/* Position indicator while dragging */}
        {isDragging && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {tempPosition.x < window.innerWidth / 2 ? '← Bottom Left' : 'Bottom Right →'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={widgetRef}
      className={`fixed z-50 w-80 flex flex-col rounded-2xl overflow-hidden border border-gray-200 transition-all duration-300 ${
        isDragging ? 'shadow-2xl' : 'shadow-xl'
      }`}
      style={{
        left: `${displayPosition.x}px`,
        top: `${displayPosition.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Header */}
      <div className="bg-[#0D3B6E] text-white px-4 py-3 flex items-center justify-between drag-handle cursor-grab active:cursor-grabbing relative">
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-white/50" />
          <MessageCircle className="w-4 h-4" />
          <span className="font-semibold text-sm">Support Chat</span>
          <span className="w-2 h-2 bg-green-400 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMinimized(m => !m)} className="text-white/70 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Position indicator while dragging */}
        {isDragging && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {tempPosition.x < window.innerWidth / 2 ? '← Bottom Left' : 'Bottom Right →'}
          </div>
        )}
      </div>

      {!minimized && (
        <>
          <div className="bg-white p-3 overflow-y-auto h-72 space-y-2">
            {loading && (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 pt-8">Send a message to start chatting with support.</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_role === 'tenant' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  m.sender_role === 'tenant'
                    ? 'bg-[#0D3B6E] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.sender_role === 'admin' && (
                    <p className="text-xs font-semibold text-blue-600 mb-0.5">Support</p>
                  )}
                  <p>{m.message}</p>
                  <p className={`text-xs mt-1 ${m.sender_role === 'tenant' ? 'text-blue-200' : 'text-gray-400'}`}>{fmt(m.createdAt)}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-2">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
              placeholder="Type a message…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="w-8 h-8 bg-[#0D3B6E] disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
