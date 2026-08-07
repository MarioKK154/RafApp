import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { 
    BellIcon, 
    BellAlertIcon, 
    InboxStackIcon,
    ClockIcon,
    ArrowRightIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

function NotificationDropdown() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
    const bellRef = useRef(null);
    const panelRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get('/notifications/');
            const data = Array.isArray(res.data) ? res.data : [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Alert Sync Failure:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Compute panel position from the bell button's screen rect
    const openPanel = useCallback(() => {
        if (bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            // Position panel to the right of the bell on desktop, below on small screens
            const spaceRight = window.innerWidth - rect.right;
            if (spaceRight >= 400) {
                setPanelPos({ top: rect.top, left: rect.right + 12 });
            } else {
                setPanelPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 300) });
            }
        }
        setIsOpen(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (
                bellRef.current && !bellRef.current.contains(e.target) &&
                panelRef.current && !panelRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const markAsRead = async (id) => {
        try {
            await axiosInstance.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Mark notification read failed:', error);
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

    const handleNotificationClick = (note) => {
        markAsRead(note.id);
        setIsOpen(false);
        if (note.link) {
            navigate(note.link);
        }
    };

    const safeTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        try {
            return formatDistanceToNow(new Date(dateStr));
        } catch {
            return '';
        }
    };

    // Dropdown panel rendered via portal into document.body —
    // this completely escapes the sidebar's stacking context and overflow clipping.
    const dropdownPanel = isOpen ? ReactDOM.createPortal(
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                top: panelPos.top,
                left: panelPos.left,
                zIndex: 99999,
            }}
            className="w-80 md:w-96 bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left"
        >
            <header className="px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{t('deployment_alerts', { defaultValue: 'Notifications & Alerts' })}</h3>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{t('personnel_registry_sync', { defaultValue: 'System Activity' })}</p>
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={markAllRead}
                        className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                        title={t('clear_all_title', { defaultValue: 'Mark all as read' })}
                    >
                        <CheckBadgeIcon className="h-5 w-5 text-indigo-600" />
                    </button>
                )}
            </header>

            <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {notifications.map((note) => (
                            <div 
                                key={note.id} 
                                className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-150 ease-out cursor-pointer group ${!note.is_read ? 'bg-indigo-50/30 dark:bg-indigo-900/5' : ''}`}
                                onClick={() => handleNotificationClick(note)}
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
                                                {safeTimeAgo(note.created_at)} {t('time_ago', { defaultValue: 'ago' })}
                                            </div>
                                            {note.link && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                    {t('navigate_link', { defaultValue: 'View' })} <ArrowRightIcon className="h-3 w-3" />
                                                </span>
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
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">{t('sector_clear', { defaultValue: 'No Notifications' })}</h4>
                        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-2">{t('no_active_alerts', { defaultValue: 'You are all caught up.' })}</p>
                    </div>
                )}
            </div>

            <footer className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
                <Link 
                    to="/notifications" 
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em] transition"
                >
                    {t('view_full_history', { defaultValue: 'View All Notifications' })}
                </Link>
            </footer>
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative">
            <button 
                ref={bellRef}
                onClick={() => isOpen ? setIsOpen(false) : openPanel()}
                className={`relative p-2.5 rounded-xl border transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                    unreadCount > 0 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' 
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

            {dropdownPanel}
        </div>
    );
}

export default NotificationDropdown;