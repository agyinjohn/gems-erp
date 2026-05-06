'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Minus } from 'lucide-react';
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

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#0D3B6E] hover:bg-[#1A5294] text-white rounded-full shadow-xl flex items-center justify-center transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-[#0D3B6E] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
