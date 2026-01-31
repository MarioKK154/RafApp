import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal'; // Switched to your standardized Modal
import { 
    CalendarIcon, 
    MapPinIcon, 
    UserGroupIcon, 
    ClockIcon, 
    PlusIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

// Setup the localizer for date-fns
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function CalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [viewRange, setViewRange] = useState({ 
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) 
    });

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newEventData, setNewEventData] = useState({
        title: '',
        description: '',
        start: null,
        end: null,
        location: '',
        attendee_ids: [],
    });

    const isSuperuser = user?.is_superuser;
    const canManageEvents = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    // Fetch users for attendee dropdown
    useEffect(() => {
        axiosInstance.get('/users/', { params: { limit: 1000 } })
            .then(response => setUsers(response.data.filter(u => u.is_active)))
            .catch(() => toast.error("Could not load personnel for invite list."));
    }, []);

    // Fetch events for current view
    const fetchEvents = useCallback(async (range) => {
        if (!range?.start || !range?.end) return;
        setIsLoading(true);
        try {
            const response = await axiosInstance.get('/events/', {
                params: {
                    start: range.start.toISOString(),
                    end: range.end.toISOString(),
                }
            });
            const formattedEvents = response.data.map(event => ({
                ...event,
                start: new Date(event.start_time),
                end: new Date(event.end_time),
            }));
            setEvents(formattedEvents);
        } catch (err) {
            toast.error('Failed to synchronize schedule.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents(viewRange);
    }, [viewRange, fetchEvents]);

    const handleRangeChange = (range) => {
        let start, end;
        if (Array.isArray(range)) {
            start = range[0];
            end = range[range.length - 1];
        } else {
            start = range.start;
            end = range.end;
        }
        setViewRange({ start, end });
    };

    const handleSelectSlot = ({ start, end }) => {
        if (!canManageEvents) return;
        setNewEventData({
            title: '', 
            description: '', 
            start, 
            end, 
            location: '', 
            attendee_ids: [user.id]
        });
        setIsModalOpen(true);
    };

    const handleAttendeeChange = (selectedOptions) => {
        const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
        setNewEventData(prev => ({ ...prev, attendee_ids: ids }));
    };

    const handleCreateEvent = async () => {
        if (!newEventData.title.trim()) {
            toast.warn("Event title is required.");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            ...newEventData,
            start_time: newEventData.start.toISOString(),
            end_time: newEventData.end.toISOString(),
        };
        delete payload.start;
        delete payload.end;

        try {
            await axiosInstance.post('/events/', payload);
            toast.success('Schedule updated successfully!');
            setIsModalOpen(false);
            fetchEvents(viewRange);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to register event.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const userOptions = useMemo(() => users.map(u => ({ 
        value: u.id, 
        label: `${u.full_name || u.email} (${u.role.replace('_', ' ')})` 
    })), [users]);

    const selectedAttendeeOptions = useMemo(() => 
        newEventData.attendee_ids.map(id => userOptions.find(opt => opt.value === id)).filter(Boolean),
        [newEventData.attendee_ids, userOptions]
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <CalendarIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Global Schedule</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Master calendar across all tenants" : `Site deployments for ${user?.tenant?.name}`}
                    </p>
                </div>
            </header>

            {/* Calendar Container */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
                <div className="h-[75vh]">
                    {isLoading && <div className="absolute inset-0 z-10 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>}
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        onRangeChange={handleRangeChange}
                        selectable={canManageEvents}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={(e) => toast.info(`Viewing event: ${e.title}`)}
                        className="dark:text-white"
                        eventPropGetter={() => ({
                            style: {
                                backgroundColor: '#4f46e5',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '2px 6px'
                            }
                        })}
                    />
                </div>
            </div>

            {/* Event Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleCreateEvent}
                title="Schedule Project Deployment"
                confirmText={isSubmitting ? "Syncing..." : "Commit to Schedule"}
            >
                <div className="space-y-5 py-2">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex gap-3 items-start border border-indigo-100 dark:border-indigo-800">
                        <ClockIcon className="h-5 w-5 text-indigo-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Selected Window</p>
                            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                                {newEventData.start?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} 
                                <span className="mx-2 text-indigo-300">→</span>
                                {newEventData.end?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Event Title*</label>
                        <input 
                            type="text" 
                            name="title" 
                            value={newEventData.title} 
                            onChange={handleNewEventChange} 
                            placeholder="e.g., On-site Electrical Installation"
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Attendees & Resources</label>
                        <Select
                            isMulti
                            options={userOptions}
                            value={selectedAttendeeOptions}
                            onChange={handleAttendeeChange}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            placeholder="Assign personnel..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Location</label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    name="location" 
                                    value={newEventData.location} 
                                    onChange={handleNewEventChange} 
                                    placeholder="Site Address"
                                    className="pl-9 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest italic">Optional Notes</label>
                            <div className="relative">
                                <InformationCircleIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    name="description" 
                                    value={newEventData.description} 
                                    onChange={handleNewEventChange} 
                                    placeholder="Access codes, etc."
                                    className="pl-9 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default CalendarPage;