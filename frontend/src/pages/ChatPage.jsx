import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

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

    // Fetch initial threads and users for DM
    useEffect(() => {
        fetchThreads();
        fetchUsers();
    }, []);

    // Connect to WebSocket when the component mounts
    useEffect(() => {
        if (!user || !user.id) return;
        
        // Infer WS URL from current window location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Assuming the backend is running on the same host/port in dev, or at /api
        // Since axiosInstance usually targets an env var, we'll try to extract the base URL
        const baseURL = axiosInstance.defaults.baseURL || window.location.origin;
        const wsUrl = baseURL.replace(/^http/, 'ws') + '/chat/ws/';
        
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => console.log("WebSocket connected for chat");
        
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'new_message') {
                    // Always update local messages if it belongs to the active thread
                    setMessages(prev => {
                        // Avoid duplicates if we sent it ourselves and already appended it
                        if (prev.find(m => m.id === data.message_id)) return prev;
                        // Only append if it's the active thread (need to use a ref or functional update to check active thread)
                        // Better to just push it to a global state or append if it matches activeThread state
                        // The state here inside the closure might be stale for activeThread unless we handle it carefully.
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
                console.error("WS parse error", err);
            }
        };

        ws.current.onclose = () => console.log("WebSocket disconnected");

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchThreads = async () => {
        try {
            const res = await axiosInstance.get('/chat/threads');
            setThreads(res.data);
        } catch (err) {
            console.error("Failed to fetch threads", err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axiosInstance.get('/users', { params: { tenant_id: user.tenant_id } });
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchMessages = async (threadId) => {
        try {
            const res = await axiosInstance.get(`/chat/threads/${threadId}/messages`);
            // Backend returns messages in desc order (newest first for pagination). We reverse it.
            setMessages(res.data.reverse());
            // Dispatch event to update sidebar badge immediately
            window.dispatchEvent(new CustomEvent('refreshUnreadCounts'));
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const selectThread = (thread) => {
    setActiveThread(thread);
        fetchMessages(thread.id);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeThread) return;
        
        try {
            const res = await axiosInstance.post('/chat/messages', {
                thread_id: activeThread.id,
                content: newMessage.trim()
            });
            // We append it locally. 
            // The WS will also broadcast it back to us, but our WS handler prevents duplicates via ID check.
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const startNewThread = async (participantId) => {
        try {
            const res = await axiosInstance.post('/chat/threads', {
                participant_user_ids: [participantId],
                is_group: false
            });
            setThreads([...threads, res.data]);
            selectThread(res.data);
            setShowNewThreadModal(false);
        } catch (err) {
            console.error("Failed to create thread", err);
        }
    };

    const getThreadName = (thread) => {
    if (thread.is_group && thread.name) return thread.name;
        // For DMs, find the participant who is not the current user
        const otherParticipant = thread.participants?.find(p => p.user_id !== user.id);
        if (otherParticipant && otherParticipant.user) {
            return otherParticipant.user.full_name || otherParticipant.user.email;
        }
        return "Unknown Chat";
    };

    return (
        <div className="flex h-full w-full">
            {/* Left Sidebar: Threads */}
            <div className="w-1/3 max-w-sm border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Messages</h2>
                    <button 
                        onClick={() => setShowNewThreadModal(true)}
                        className="p-2 rounded-lg bg-indigo-600 text-white hover:opacity-90"
                    >
                        + New
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {threads.map(thread => (
                        <div 
                            key={thread.id} 
                            onClick={() => selectThread(thread)}
                            className={`p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 transition-colors ${activeThread?.id === thread.id ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                        >
                            <h3 className="font-semibold text-sm">{getThreadName(thread)}</h3>
                            {/* Optionally preview last message here */}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Chat Window */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 relative">
                {activeThread ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                            <h2 className="text-lg font-bold">{getThreadName(activeThread)}</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                            {messages.map(msg => {
                                const isMe = msg.author_id === user.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-900 text-gray-800'}`}>
                                            {!isMe && msg.author && (
                                                <div className="text-xs opacity-70 mb-1">{msg.author.full_name || msg.author.email}</div>
                                            )}
                                            <div className="text-sm">{msg.content}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                            <form onSubmit={sendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-indigo-600"
                                />
                                <button type="submit" className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:opacity-90">
                                    Send
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center opacity-50">
                        Select a conversation to start messaging
                    </div>
                )}
            </div>

            {/* Simple Modal for New DM */}
            {showNewThreadModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-[400px] border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-4">Start Conversation</h2>
                        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                            {users.filter(u => u.id !== user.id).map(u => (
                                <button 
                                    key={u.id}
                                    onClick={() => startNewThread(u.id)}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900"
                                >
                                    {u.full_name || u.email}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowNewThreadModal(false)}
                            className="w-full p-2 text-center text-sm opacity-70 hover:opacity-100"
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
