import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Select from 'react-select'; // Standardized multi-select for personnel
import { 
    CalendarDaysIcon, 
    PlusIcon, 
    ClockIcon, 
    MapPinIcon, 
    DocumentTextIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    ArrowPathIcon,
    UserGroupIcon,
    TagIcon
} from '@heroicons/react/24/outline';

function CalendarPage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userOptions, setUserOptions] = useState([]);
    
    // Modal & Telemetry Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'custom', // 'meeting', 'task', 'custom'
        start: '',
        end: '',
        description: '',
        location: '',
        attendee_ids: []
    });

    /**
     * Protocol: Fetch Metadata & Events
     */
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Concurrent sync: Task registry, Project registry, Global Events, and Personnel list
            const [tasksRes, projectsRes, eventsRes, usersRes] = await Promise.all([
                axiosInstance.get('/tasks/', { params: { limit: 1000 } }),
                axiosInstance.get('/projects/', { params: { limit: 1000 } }),
                axiosInstance.get('/events/', { params: { 
                    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
                    end: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1).toISOString()
                }}),
                axiosInstance.get('/users/', { params: { limit: 1000 } })
            ]);

            // Logic: Map Personnel for Meeting Registry
            setUserOptions(usersRes.data.map(u => ({ value: u.id, label: u.full_name || u.email })));

            // Logic: Map Tasks
            const taskEvents = tasksRes.data
                .filter(task => task.due_date)
                .map(task => ({
                    id: `task-${task.id}`,
                    title: `[TASK] ${task.title}`,
                    start: task.due_date,
                    backgroundColor: '#4f46e5',
                    extendedProps: { type: 'task', description: task.description }
                }));

            // Logic: Map Projects
            const projectEvents = projectsRes.data
                .filter(proj => proj.start_date)
                .map(proj => ({
                    id: `proj-${proj.id}`,
                    title: `[PROJ] ${proj.name}`,
                    start: proj.start_date,
                    end: proj.end_date,
                    backgroundColor: '#10b981',
                    extendedProps: { type: 'project', description: proj.description }
                }));

            // Logic: Map Calendar Events
            const customEvents = eventsRes.data.map(evt => ({
                id: evt.id.toString(),
                title: evt.event_type === 'meeting' ? `[MTG] ${evt.title}` : evt.title,
                start: evt.start_time,
                end: evt.end_time,
                backgroundColor: evt.event_type === 'meeting' ? '#f59e0b' : '#6b7280',
                extendedProps: { ...evt, type: 'event' }
            }));

            setEvents([...taskEvents, ...projectEvents, ...customEvents]);
        } catch (err) {
            toast.error(t('sync_error'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Interaction Protocol: Initiation via Date Click
     */
    const handleDateClick = (arg) => {
        const dateStr = arg.dateStr;
        // Check if dateStr contains time or just date
        const hasTime = dateStr.includes('T');
        
        setFormData({
            title: '',
            event_type: 'custom',
            start: hasTime ? dateStr.slice(0, 16) : `${dateStr}T09:00`,
            end: hasTime ? dateStr.slice(0, 16) : `${dateStr}T17:00`,
            description: '',
            location: '',
            attendee_ids: []
        });
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    /**
     * Protocol: Commit to Registry
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                event_type: formData.event_type,
                start_time: new Date(formData.start).toISOString(),
                end_time: new Date(formData.end).toISOString(),
                description: formData.description,
                location: formData.location,
                attendee_ids: formData.attendee_ids.map(a => a.value)
            };

            await axiosInstance.post('/events/', payload);
            toast.success(t('event_created'));
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Creation Failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingSpinner text={t('syncing')} size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg text-white">
                            <CalendarDaysIcon className="h-6 w-6" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">
                            {t('calendar')}
                        </h1>
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Operational Deployment Map</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-4 px-6 h-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-[9px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Tasks</div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Projects</div>
                        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span> Meetings</div>
                    </div>
                </div>
            </header>

            <section className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    locale={i18n.language === 'is' ? 'is' : 'en-gb'}
                    events={events}
                    dateClick={handleDateClick}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }}
                    height="auto"
                />
            </section>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('register_event')}>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Event Type Protocol */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Sequence Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['custom', 'meeting', 'task'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, event_type: type }))}
                                    className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        formData.event_type === type 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('title')}</label>
                        <input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="modern-input" placeholder="Identifier..." />
                    </div>

                    {/* Conditional Metadata: Time vs End Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                {formData.event_type === 'meeting' ? 'Start Time' : 'Start Date'}
                            </label>
                            <input 
                                type={formData.event_type === 'meeting' ? "datetime-local" : "date"} 
                                name="start" 
                                required 
                                value={formData.event_type === 'meeting' ? formData.start : formData.start.split('T')[0]} 
                                onChange={handleInputChange} 
                                className="modern-input text-xs font-bold" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                {formData.event_type === 'meeting' ? 'End Time' : 'End Date'}
                            </label>
                            <input 
                                type={formData.event_type === 'meeting' ? "datetime-local" : "date"} 
                                name="end" 
                                required 
                                value={formData.event_type === 'meeting' ? formData.end : formData.end.split('T')[0]} 
                                onChange={handleInputChange} 
                                className="modern-input text-xs font-bold" 
                            />
                        </div>
                    </div>

                    {/* Personnel Registry (Meetings Only) */}
                    {formData.event_type === 'meeting' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                <UserGroupIcon className="h-3 w-3" /> Personnel Registry
                            </label>
                            <Select
                                isMulti
                                options={userOptions}
                                value={formData.attendee_ids}
                                onChange={(selected) => setFormData(p => ({ ...p, attendee_ids: selected }))}
                                className="modern-select-container"
                                classNamePrefix="react-select"
                                placeholder="Select Attendees..."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('registry_notes')}</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="modern-input h-auto py-3 text-sm" placeholder="Context..."></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 h-12 text-[10px] font-black uppercase text-gray-400">Abort</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-10 h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg transition transform active:scale-95 flex items-center gap-2"
                        >
                            {isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4 stroke-[3px]" />}
                            Commit Sequence
                        </button>
                    </div>
                </form>
            </Modal>

            <style>{`
                .fc { --fc-border-color: #f3f4f6; --fc-button-bg-color: #4f46e5; --fc-button-border-color: #4f46e5; }
                .dark .fc { --fc-border-color: #374151; }
                .fc .fc-toolbar-title { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
                .fc .fc-button { border-radius: 12px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
                .fc-event { border-radius: 6px; padding: 2px 4px; font-weight: 800; font-size: 9px; border: none; text-transform: uppercase; cursor: pointer; }
            `}</style>
        </div>
    );
}

export default CalendarPage;