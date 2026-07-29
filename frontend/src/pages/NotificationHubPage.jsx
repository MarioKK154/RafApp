import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    BellIcon,
    BellAlertIcon, 
    ClockIcon, 
    ArrowRightIcon, 
    CheckBadgeIcon,
    InboxStackIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';

function NotificationHubPage() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/notifications/?unread_only=false');
            setNotifications(res.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Notifications unavailable.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const markRead = async (id) => {
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
            />

            <div className="space-y-4">
                {notifications.length > 0 ? notifications.map((note) => (
                    <div 
                        key={note.id} 
                        className={`group p-6 rounded-[2rem] border transition-all duration-300 flex items-center gap-6 ${
                            !note.is_read 
                            ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-900 shadow-xl shadow-indigo-100/20' 
                            : 'bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
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
                                <span className="flex items-center gap-1.5"><ClockIcon className="h-3.5 w-3.5" /> {(() => { try { return format(new Date(note.created_at), 'PPP p'); } catch { return '—'; } })()}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {!note.is_read && (
                                <button 
                                    onClick={() => markRead(note.id)}
                                    className="h-10 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                    Dismiss
                                </button>
                            )}
                            {note.link && (
                                <Link 
                                    to={note.link}
                                    className="h-10 w-10 flex items-center justify-center bg-gray-900 dark:bg-indigo-600 text-white rounded-xl hover:scale-105 transition-transform"
                                >
                                    <ArrowRightIcon className="h-4 w-4 stroke-[3px]" />
                                </Link>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-40 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <InboxStackIcon className="h-16 w-16 text-gray-200 dark:text-gray-600 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_notifications')}</h3>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationHubPage;