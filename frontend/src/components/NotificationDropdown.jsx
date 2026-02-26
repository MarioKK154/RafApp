import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { 
    BellIcon, 
    BellAlertIcon, 
    InboxStackIcon,
    ClockIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

function NotificationDropdown() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get('/notifications/');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Alert Sync Failure:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axiosInstance.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Mark notification read failed:', error);
            toast.error("Registry update failed.");
        }
    };

    const markAllRead = async () => {
        try {
            await axiosInstance.put('/notifications/read-all');
            fetchNotifications();
            toast.success("All alerts cleared.");
        } catch (error) {
            console.error('Mark all read failed:', error);
            toast.error("Clear protocol failed.");
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl border transition-all duration-300 ${
                    unreadCount > 0 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-gray-600'
                }`}
            >
                {unreadCount > 0 ? (
                    <BellAlertIcon className="h-6 w-6 stroke-[2.5px] animate-pulse" />
                ) : (
                    <BellIcon className="h-6 w-6 stroke-[2px]" />
                )}
                
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                /* CHANGE: Changed 'right-0' to 'left-0' or use a fixed offset 
                   to prevent it from going into the sidebar. 
                   Increased z-index to 100.
                */
                <div className="absolute left-0 md:left-auto md:right-[-10rem] mt-4 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <header className="px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Deployment Alerts</h3>
                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Personnel Registry Sync</p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-indigo-600 transition-colors"
                                title="Clear All"
                            >
                                <CheckCheckIcon className="h-5 w-5" />
                            </button>
                        )}
                    </header>

                    <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                {notifications.map((note) => (
                                    <div 
                                        key={note.id} 
                                        className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${!note.is_read ? 'bg-indigo-50/30 dark:bg-indigo-900/5' : ''}`}
                                        onClick={() => markAsRead(note.id)}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!note.is_read ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-gray-300'}`} />
                                            <div className="flex-grow space-y-2">
                                                <p className={`text-xs leading-relaxed ${!note.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                                    {note.message}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                        <ClockIcon className="h-3 w-3" />
                                                        {formatDistanceToNow(new Date(note.created_at))} ago
                                                    </div>
                                                    {note.link && (
                                                        <Link 
                                                            to={note.link}
                                                            className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform"
                                                        >
                                                            Navigate <ArrowRightIcon className="h-3 w-3" />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                                <InboxStackIcon className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">Sector Clear</h4>
                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-2">No active deployment alerts pending</p>
                            </div>
                        )}
                    </div>

                    <footer className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
                        <Link 
                            to="/notifications" 
                            className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition"
                        >
                            View Full History Registry
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}

function CheckCheckIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25l1.5 1.5 5.25-7.5" />
        </svg>
    );
}

export default NotificationDropdown;