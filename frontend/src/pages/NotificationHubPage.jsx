import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    BellIcon,
    BellAlertIcon, 
    ClockIcon, 
    ArrowRightIcon, 
    CheckBadgeIcon,
    InboxStackIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';

function NotificationHubPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/notifications/');
            setNotifications(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Notifications unavailable.');
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const markRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await axiosInstance.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch (error) {
            console.error('Failed to mark notification read:', error);
            toast.error('Update failed.');
        }
    };

    const markAllRead = async () => {
        try {
            await axiosInstance.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast.success("All notifications marked as read.");
        } catch (error) {
            console.error('Failed to mark all read:', error);
            toast.error('Clear failed.');
        }
    };

    const handleCardClick = (note) => {
        if (!note.is_read) {
            markRead(note.id);
        }
        if (note.link) {
            navigate(note.link);
        }
    };

    if (isLoading) {
        return <LoadingSpinner text={t('loading_notifications')} size="lg" />;
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1600px] animate-in fade-in duration-500">
            <PageHeader
                icon={BellIcon}
                title={t('notifications', { defaultValue: 'Notification Control Hub' })}
                subtitle={t('notifications_subtitle', { defaultValue: 'System Telemetry, Work Alerts & Dispatch Messages' })}
                stats={[
                    { label: `${unreadCount} ${t('unread', { defaultValue: 'Unread' })}`, dotColor: unreadCount > 0 ? 'bg-indigo-400 animate-pulse' : 'bg-gray-400' },
                    { label: `${notifications.length} ${t('total', { defaultValue: 'Total' })}`, icon: <InboxStackIcon className="h-4 w-4 text-blue-300" /> },
                ]}
                actions={
                    unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow"
                        >
                            <CheckBadgeIcon className="h-4 w-4" /> {t('mark_all_as_read', { defaultValue: 'Mark All Read' })}
                        </button>
                    )
                }
            />

            <div className="space-y-4">
                {notifications.length > 0 ? notifications.map((note) => (
                    <div 
                        key={note.id} 
                        onClick={() => handleCardClick(note)}
                        className={`group p-6 rounded-[2rem] border transition-all duration-300 flex items-center gap-6 cursor-pointer ${
                            !note.is_read 
                            ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-900 shadow-xl shadow-indigo-100/20 hover:border-indigo-400' 
                            : 'bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                    >
                        <div className={`p-4 rounded-2xl ${!note.is_read ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            <BellAlertIcon className="h-6 w-6 stroke-[2.5px]" />
                        </div>

                        <div className="flex-grow min-w-0">
                            <p className={`text-sm mb-2 ${!note.is_read ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-500'}`}>
                                {note.message}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <ClockIcon className="h-3.5 w-3.5" /> 
                                    {(() => { 
                                        try { 
                                            return format(new Date(note.created_at), 'PPP p'); 
                                        } catch { 
                                            return note.created_at || '—'; 
                                        } 
                                    })()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!note.is_read && (
                                <button 
                                    onClick={(e) => markRead(note.id, e)}
                                    className="h-10 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                    Dismiss
                                </button>
                            )}
                            {note.link && (
                                <div className="h-10 w-10 flex items-center justify-center bg-gray-900 dark:bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                                    <ArrowRightIcon className="h-4 w-4 stroke-[3px]" />
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-40 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <InboxStackIcon className="h-16 w-16 text-gray-200 dark:text-gray-600 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_notifications', { defaultValue: 'No notifications found' })}</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">{t('caught_up', { defaultValue: 'All operations and alerts are caught up.' })}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationHubPage;