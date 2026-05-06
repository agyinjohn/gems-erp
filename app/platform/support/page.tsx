'use client';
import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { MessageCircle, Send, CheckCircle, Clock, Building2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';

interface Conversation {
  id: string;
  tenant_id: { id: string; business_name: string; email: string };
  subject: string;
  status: 'open' | 'resolved';
  last_message_at: string;
  unread_admin: number;
}

interface Message {
  id: string;
  sender_id: { name: string; role: string };
  sender_role: 'tenant' | 'admin';
  message: string;
  createdAt: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function SupportPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<Conversation | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    loadConversations();
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_admin');
    socket.on('new_tenant_message', () => loadConversations());
    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/admin/conversations');
      setConvs(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const selectConv = async (conv: Conversation) => {
    setSelected(conv);
    setMsgLoading(true);
    if (socketRef.current) {
      if (selectedRef.current) socketRef.current.emit('leave_conversation', selectedRef.current.id);
      socketRef.current.emit('join_conversation', conv.id);
    }
    try {
      const res = await api.get(`/chat/messages/${conv.id}`);
      setMessages(res.data.data);
      setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread_admin: 0 } : c));
    } finally {
      setMsgLoading(false);
    }
  };

  const send = async () => {
    if (!text.trim() || !selected) return;
    const body = text.trim();
    setText('');
    await api.post('/chat/messages', { conversation_id: selected.id, message: body });
  };

  const resolve = async (id: string) => {
    await api.patch(`/chat/conversations/${id}/resolve`);
    setConvs(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c));
    setSelected(prev => prev ? { ...prev, status: 'resolved' } : prev);
  };

  const fmt = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d: string) => {
    const date = new Date(d);
    if (date.toDateString() === new Date().toDateString()) return fmt(d);
    return date.toLocaleDateString('en-GH', { day: '2-digit', month: 'short' });
  };

  const openConvs = convs.filter(c => c.status === 'open');
  const resolvedConvs = convs.filter(c => c.status === 'resolved');

  return (
    <AppLayout title="Support Chat" subtitle="Respond to client messages" allowedRoles={['platform_admin']}>
      <div className="flex gap-4 h-[calc(100vh-160px)]">

        {/* Conversation list */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-800">Conversations</span>
            {openConvs.length > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{openConvs.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
            {!loading && convs.length === 0 && (
              <p className="text-center text-sm text-gray-400 pt-10">No conversations yet</p>
            )}
            {openConvs.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Open</p>
                {openConvs.map(c => (
                  <ConvItem key={c.id} conv={c} selected={selected?.id === c.id} onClick={() => selectConv(c)} fmtDate={fmtDate} />
                ))}
              </>
            )}
            {resolvedConvs.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Resolved</p>
                {resolvedConvs.map(c => (
                  <ConvItem key={c.id} conv={c} selected={selected?.id === c.id} onClick={() => selectConv(c)} fmtDate={fmtDate} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start replying</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{selected.tenant_id?.business_name}</p>
                    <p className="text-xs text-gray-400">{selected.tenant_id?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === 'open' ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" /> Open
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Resolved
                    </span>
                  )}
                  {selected.status === 'open' && (
                    <button
                      onClick={() => resolve(selected.id)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading && <div className="flex justify-center pt-8"><Spinner /></div>}
                {!msgLoading && messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 pt-8">No messages yet</p>
                )}
                {!msgLoading && messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.sender_role === 'admin'
                        ? 'bg-[#0D3B6E] text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {m.sender_role === 'tenant' && (
                        <p className="text-xs font-semibold text-blue-600 mb-0.5">{m.sender_id?.name || 'Client'}</p>
                      )}
                      <p>{m.message}</p>
                      <p className={`text-xs mt-1 ${m.sender_role === 'admin' ? 'text-blue-200' : 'text-gray-400'}`}>{fmt(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {selected.status === 'open' && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                  <input
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400"
                    placeholder="Type your reply…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim()}
                    className="h-10 px-4 bg-[#0D3B6E] disabled:opacity-40 text-white rounded-xl flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ConvItem({ conv, selected, onClick, fmtDate }: {
  conv: Conversation; selected: boolean; onClick: () => void; fmtDate: (d: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{conv.tenant_id?.business_name || 'Unknown'}</p>
          <p className="text-xs text-gray-400 truncate">{conv.subject}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400">{fmtDate(conv.last_message_at)}</span>
          {conv.unread_admin > 0 && (
            <span className="w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{conv.unread_admin}</span>
          )}
        </div>
      </div>
    </button>
  );
}
