import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { ChatBubbleLeftRightIcon, PlusIcon, PaperAirplaneIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/outline';

function ChatPage() {
    const { t } = useTranslation();

    const { user } = useAuth();
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [users, setUsers] = useState([]);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // Fetch initial threads and users for DM in parallel
    useEffect(() => {
        const loadChatData = async () => {
            try {
                const [usersRes, threadsRes] = await Promise.all([
                    axiosInstance.get('/users/').catch(() => ({ data: [] })),
                    axiosInstance.get('/chat/threads').catch(() => ({ data: [] }))
                ]);
                
                const loadedUsers = usersRes.data || [];
                const loadedThreads = threadsRes.data || [];
                
                setUsers(loadedUsers);
                setThreads(loadedThreads);
                
                if (loadedThreads.length > 0 && !activeThread) {
                    selectThread(loadedThreads[0]);
                }
            } catch (err) {
                console.error("Failed to load chat data", err);
            }
        };
        loadChatData();
    }, []);

    // Connect to WebSocket when the component mounts
    useEffect(() => {
        if (!user || !user.id) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseURL = axiosInstance.defaults.baseURL || window.location.origin;
        const wsUrl = baseURL.replace(/^http/, 'ws') + '/chat/ws/';
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => console.log("WebSocket connected for chat");
        
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'new_message') {
                    setMessages(prev => {
                        if (prev.find(m => m.id === data.message_id)) return prev;
                        return [...prev, {
                            id: data.message_id,
                            thread_id: data.thread_id,
                            content: data.content,
                            author_id: data.author_id,
                            created_at: new Date().toISOString()
                        }];
                    });
                }
            } catch (err) {
                console.error("Failed to parse WS message", err);
            }
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [user]);

    // Scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchThreads = async () => {
        try {
            const res = await axiosInstance.get('/chat/threads');
            setThreads(res.data);
            if (res.data.length > 0 && !activeThread) {
                selectThread(res.data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch threads", err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axiosInstance.get('/users/');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const selectThread = async (thread) => {
        setActiveThread(thread);
        try {
            const res = await axiosInstance.get(`/chat/threads/${thread.id}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch messages for thread", err);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeThread) return;

        try {
            const res = await axiosInstance.post('/chat/messages', {
                thread_id: activeThread.id,
                content: newMessage
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const startNewThread = async (targetUserId) => {
        try {
            const res = await axiosInstance.post('/chat/threads', {
                participant_ids: [targetUserId],
                is_group: false
            });
            setShowNewThreadModal(false);
            await fetchThreads();
            selectThread(res.data);
        } catch (err) {
            console.error("Failed to start new thread", err);
        }
    };

    const getOtherUser = (thread) => {
        if (!thread || thread.is_group) return null;
        const currentUserId = String(user?.id);

        // 1. Search in thread.participants
        if (thread.participants && Array.isArray(thread.participants)) {
            const otherP = thread.participants.find(p => String(p.user_id) !== currentUserId);
            if (otherP) {
                if (otherP.user && (otherP.user.full_name || otherP.user.email)) {
                    return otherP.user;
                }
                if (otherP.user_id) {
                    const foundInUsers = users.find(u => String(u.id) === String(otherP.user_id));
                    if (foundInUsers) return foundInUsers;
                }
            }
        }

        // 2. Search in thread.messages
        if (messages && Array.isArray(messages)) {
            const otherMsg = messages.find(m => m.thread_id === thread.id && String(m.author_id) !== currentUserId);
            if (otherMsg) {
                if (otherMsg.author && (otherMsg.author.full_name || otherMsg.author.email)) {
                    return otherMsg.author;
                }
                if (otherMsg.author_id) {
                    const foundInUsers = users.find(u => String(u.id) === String(otherMsg.author_id));
                    if (foundInUsers) return foundInUsers;
                }
            }
        }

        // 3. Fallback: match other user in workspace if system has 2 users
        if (users && users.length > 0) {
            const otherInUsers = users.find(u => String(u.id) !== currentUserId);
            if (otherInUsers) return otherInUsers;
        }

        return null;
    };

    const getThreadName = (thread) => {
        if (!thread) return "";
        if (thread.is_group && thread.name) return thread.name;
        const otherUser = getOtherUser(thread);
        if (otherUser) {
            return otherUser.full_name || otherUser.email || `User #${otherUser.id}`;
        }
        return thread.name || `Direct Message`;
    };

    const getThreadSubtitle = (thread) => {
        if (!thread) return "";
        if (thread.is_group) return "Group Channel";
        const otherUser = getOtherUser(thread);
        if (otherUser) {
            return otherUser.email || (otherUser.role ? `Role: ${otherUser.role}` : "Direct Message");
        }
        return "Direct Message";
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1600px] h-[calc(100vh-5rem)] flex flex-col animate-in fade-in duration-500">
            <PageHeader
                icon={ChatBubbleLeftRightIcon}
                title={t('messages', { defaultValue: 'Team Communication & Live Chat' })}
                subtitle={t('chat_subtitle', { defaultValue: 'Real-time Project Dispatch, Direct Messaging & Field Channels' })}
                stats={[
                    { label: `${threads.length} ${t('channels', { defaultValue: 'Channels' })}`, dotColor: 'bg-green-400 animate-pulse' },
                ]}
                actions={
                    <button 
                        onClick={() => setShowNewThreadModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/30 transform active:scale-95 cursor-pointer"
                    >
                        <PlusIcon className="h-5 w-5" /> {t('new_chat', { defaultValue: 'Start New Chat' })}
                    </button>
                }
            />

            <div className="flex-1 flex overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl">
                {/* Left Sidebar: Threads */}
                <div className="w-1/3 max-w-sm border-r border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Conversations</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/50">
                        {threads.map(thread => {
                            const otherUser = getOtherUser(thread);
                            const initial = thread.is_group ? null : (otherUser?.full_name?.charAt(0) || otherUser?.email?.charAt(0));
                            return (
                                <div 
                                    key={thread.id} 
                                    onClick={() => selectThread(thread)}
                                    className={`p-4 cursor-pointer transition-all ${activeThread?.id === thread.id ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-400' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                            {thread.is_group ? <UserGroupIcon className="h-5 w-5" /> : (initial ? <span className="uppercase text-xs font-black">{initial}</span> : <UserIcon className="h-5 w-5" />)}
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <h3 className="font-bold text-xs text-gray-900 dark:text-white truncate">{getThreadName(thread)}</h3>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{getThreadSubtitle(thread)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Chat Window */}
                <div className="flex-1 flex flex-col bg-gray-50/30 dark:bg-gray-950/30 relative">
                    {activeThread ? (
                        <>
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs shrink-0">
                                    {activeThread.is_group ? <UserGroupIcon className="h-5 w-5" /> : (getOtherUser(activeThread)?.full_name?.charAt(0) || <UserIcon className="h-5 w-5" />)}
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{getThreadName(activeThread)}</h2>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{getThreadSubtitle(activeThread)}</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                                {messages.map(msg => {
                                    const isMe = msg.author_id === user.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                                                {!isMe && msg.author && (
                                                    <div className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-wider">{msg.author.full_name || msg.author.email}</div>
                                                )}
                                                <div className="text-xs leading-relaxed">{msg.content}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
                                <form onSubmit={sendMessage} className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                    <button type="submit" className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider hover:from-indigo-600 hover:to-blue-700 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer">
                                        <span>Send</span>
                                        <PaperAirplaneIcon className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                            <ChatBubbleLeftRightIcon className="h-12 w-12 mb-3 opacity-30" />
                            <p className="text-xs font-black uppercase tracking-widest">Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for New DM */}
            {showNewThreadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl w-[420px] border border-gray-100 dark:border-gray-800">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4">Start New Conversation</h2>
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-6 pr-1 custom-scrollbar">
                            {users.filter(u => u.id !== user.id).map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => startNewThread(u.id)}
                                    className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition flex items-center justify-between group"
                                >
                                    <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{u.full_name || u.email}</span>
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">Message &rarr;</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowNewThreadModal(false)}
                            className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatPage;
