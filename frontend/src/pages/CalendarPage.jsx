import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useTranslation } from 'react-i18next';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import Select from 'react-select';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

import { 
    CalendarDaysIcon, 
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function CalendarPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate(); 
    
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState(['task', 'project', 'meeting', 'custom']);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view'); // 'view' | 'create'
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'custom',
        start: '',
        end: '',
        description: '',
        location: '',
        attendeeIds: [],
    });

    const [users, setUsers] = useState([]);
    const userOptions = useMemo(
        () =>
            users.map((u) => ({
                value: u.id,
                label: u.full_name || u.email,
            })),
        [users]
    );

    const selectStyles = useMemo(
        () => ({
            control: (base, state) => ({
                ...base,
                borderRadius: '0.75rem',
                borderColor: state.isFocused ? '#4f46e5' : '#e5e7eb',
                boxShadow: state.isFocused ? '0 0 0 1px #4f46e5' : 'none',
                minHeight: '2.5rem',
                fontSize: '0.75rem',
            }),
            menu: (base) => ({
                ...base,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                fontSize: '0.75rem',
            }),
        }),
        []
    );

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tasksRes, projectsRes, eventsRes, usersRes] = await Promise.all([
                axiosInstance.get('/tasks/', { params: { limit: 1000 } }),
                axiosInstance.get('/projects/', { params: { limit: 1000 } }),
                axiosInstance.get('/events/', {
                    params: { 
                    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
                    end: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1).toISOString()
                    },
                }),
                axiosInstance.get('/users/', { params: { limit: 500 } }),
            ]);

            const taskEvents = tasksRes.data
                .filter(t => {
                    const s = t.status || '';
                    return t.due_date && s !== 'Done' && s !== 'Commissioned' && s !== 'Cancelled';
                })
                .map(task => ({
                    id: `task-${task.id}`,
                    title: `[TASK] ${task.title}`,
                    start: task.due_date,
                    backgroundColor: '#4f46e5',
                    extendedProps: { type: 'task', realId: task.id }
                }));

            const projectEvents = projectsRes.data
                .filter(p => {
                    const s = p.status || '';
                    return p.start_date && s !== 'Completed' && s !== 'Archived';
                })
                .map(proj => ({
                    id: `proj-${proj.id}`,
                    title: `[PROJ] ${proj.name}`,
                    start: proj.start_date,
                    end: proj.end_date,
                    backgroundColor: '#10b981',
                    extendedProps: { type: 'project', realId: proj.id }
                }));

            const customEvents = eventsRes.data.map(evt => ({
                id: evt.id.toString(),
                title: evt.event_type === 'meeting' ? `[MTG] ${evt.title}` : evt.title,
                start: evt.start_time,
                end: evt.end_time,
                backgroundColor: evt.event_type === 'meeting' ? '#f59e0b' : '#6b7280',
                extendedProps: { 
                    ...evt, 
                    type: evt.event_type || 'custom', 
                    realId: evt.id
                }
            }));

            setEvents([...taskEvents, ...projectEvents, ...customEvents]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        } catch (error) {
            // Surface a localized error while still logging details for debugging
            console.error('Calendar sync error:', error);
            toast.error(
                t('calendar_sync_failed', {
                    defaultValue: 'Failed to synchronize calendar.',
                })
            );
        } finally { 
            setIsLoading(false); 
        }
    }, [t]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleEventClick = (info) => {
        const props = info.event.extendedProps;

        if (props.type === 'task') { 
            navigate(`/tasks/${props.realId}`); 
            return; 
        }
        if (props.type === 'project') { 
            navigate(`/projects/${props.realId}`); 
            return; 
        }

        const evt = info.event;
        setModalMode('view');
        const attendeeIds = Array.isArray(props.attendees) ? props.attendees.map((a) => a.id) : (props.attendee_ids || []);
        setFormData({
            title: evt.title.replace(/^\[MTG\]\s*/, ''),
            event_type: props.type,
            start: evt.start ? new Date(evt.start).toISOString() : '',
            end: evt.end ? new Date(evt.end).toISOString() : '',
            description: props.description || '',
            location: props.location || '',
            attendeeIds: Array.isArray(attendeeIds) ? attendeeIds : [],
        });
        setIsModalOpen(true);
    };

    const handleDateClick = (arg) => {
        const start = arg.date;
        const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
        setModalMode('create');
        setFormData({
            title: '',
            event_type: 'custom',
            start: start.toISOString(),
            end: end.toISOString(),
            description: '',
            location: '',
            attendeeIds: [],
        });
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAttendeesChange = (selected) => {
        setFormData((prev) => ({
            ...prev,
            attendeeIds: (selected || []).map((opt) => opt.value),
        }));
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description || null,
                event_type: formData.event_type,
                start_time: new Date(formData.start).toISOString(),
                end_time: new Date(formData.end).toISOString(),
                location: formData.location || null,
                project_id: null,
                attendee_ids: formData.attendeeIds,
            };
            await axiosInstance.post('/events/', payload);
            toast.success(
                t('calendar_event_created', {
                    defaultValue: 'Calendar entry created.',
                })
            );
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Create event failed:', error);
            toast.error(
                t('calendar_event_create_failed', {
                    defaultValue: 'Failed to create calendar entry.',
                })
            );
        }
    };

    const toggleFilter = (filterId) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(f => f !== filterId)
                : [...prev, filterId]
        );
    };

    const filteredEvents = useMemo(() => {
        return events.filter(evt =>
            activeFilters.includes(evt.extendedProps.type)
        );
    }, [events, activeFilters]);

    if (isLoading)
        return (
            <LoadingSpinner
                text={t('calendar_syncing', {
                    defaultValue: 'Synchronizing calendar...',
                })}
                size="lg"
            />
        );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none text-white">
                        <CalendarDaysIcon className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white italic">
                        {t('calendar_title')}
                    </h1>
                </div>
                </div>
            </header>

            <section className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
                {/* Filter controls */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {[
                        { id: 'task', label: t('calendar_filter_tasks', { defaultValue: 'Tasks' }) },
                        { id: 'project', label: t('calendar_filter_projects', { defaultValue: 'Projects' }) },
                        { id: 'meeting', label: t('calendar_filter_meetings', { defaultValue: 'Meetings' }) },
                        { id: 'custom', label: t('calendar_filter_custom', { defaultValue: 'Custom' }) },
                    ].map((filter) => {
                        const isActive = activeFilters.includes(filter.id);
                        return (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => toggleFilter(filter.id)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    isActive
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:text-indigo-600'
                                }`}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                </div>

                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    locale={i18n.language === 'is' ? 'is' : 'en-gb'}
                    events={filteredEvents}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,listMonth'
                    }}
                    height="auto"
                />
            </section>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    modalMode === 'create'
                        ? t('calendar_new_entry', { defaultValue: 'New Calendar Entry' })
                        : t('calendar_entry_detail', { defaultValue: 'Operational Detail' })
                }
            >
                {modalMode === 'create' ? (
                    <form onSubmit={handleCreateEvent} className="space-y-5 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    {t('title', { defaultValue: 'Title' })}
                                </label>
                                <input
                                    name="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleFormChange}
                                    required
                                    className="modern-input h-10 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    {t('type', { defaultValue: 'Type' })}
                                </label>
                                <select
                                    name="event_type"
                                    value={formData.event_type}
                                    onChange={handleFormChange}
                                    className="modern-input h-10 text-xs font-bold uppercase"
                                >
                                    <option value="custom">{t('custom', { defaultValue: 'Custom' })}</option>
                                    <option value="meeting">{t('meeting', { defaultValue: 'Meeting' })}</option>
                                    <option value="task">{t('task', { defaultValue: 'Task' })}</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    {t('start', { defaultValue: 'Start' })}
                                </label>
                                <input
                                    type="datetime-local"
                                    name="start"
                                    value={formData.start ? formData.start.slice(0, 16) : ''}
                                    onChange={handleFormChange}
                                    className="modern-input h-10 text-xs"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                    {t('end', { defaultValue: 'End' })}
                                </label>
                                <input
                                    type="datetime-local"
                                    name="end"
                                    value={formData.end ? formData.end.slice(0, 16) : ''}
                                    onChange={handleFormChange}
                                    className="modern-input h-10 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                {t('location', { defaultValue: 'Location' })}
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleFormChange}
                                className="modern-input h-10 text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                {t('attendees', { defaultValue: 'Attendees' })}
                            </label>
                            <Select
                                isMulti
                                options={userOptions}
                                styles={selectStyles}
                                value={userOptions.filter((o) => formData.attendeeIds.includes(o.value))}
                                onChange={handleAttendeesChange}
                                placeholder={t('select_users', { defaultValue: 'Select people…' })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                                {t('description', { defaultValue: 'Details' })}
                            </label>
                            <textarea
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleFormChange}
                                className="modern-input text-xs py-2"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="h-10 px-4 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50"
                            >
                                {t('cancel', { defaultValue: 'Cancel' })}
                            </button>
                            <button
                                type="submit"
                                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700"
                            >
                                {t('save', { defaultValue: 'Save' })}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
                            <p className="text-xs font-bold text-gray-500 uppercase">
                                {t('read_only_entry', { defaultValue: 'Read-Only Entry' })}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {formData.title}
                            </p>
                            {formData.event_type && (
                                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                    {formData.event_type === 'meeting' ? t('meeting', { defaultValue: 'Meeting' }) : formData.event_type}
                                </p>
                            )}
                            {(formData.start || formData.end) && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {formData.start ? new Date(formData.start).toLocaleString(i18n.language === 'is' ? 'is-IS' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                    {formData.end ? ` → ${new Date(formData.end).toLocaleString(i18n.language === 'is' ? 'is-IS' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                                </p>
                            )}
                            {formData.location && (
                                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                    <span className="font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Location:</span> {formData.location}
                                </p>
                            )}
                            {formData.description && (
                                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                    {formData.description}
                                </p>
                            )}
                            {formData.attendeeIds && formData.attendeeIds.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                                        {t('attendees', { defaultValue: 'Attendees' })}
                                    </p>
                                    <ul className="text-[11px] text-gray-700 dark:text-gray-300 space-y-0.5">
                                        {userOptions.filter((o) => formData.attendeeIds.includes(o.value)).map((o) => (
                                            <li key={o.value}>{o.label}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ===== FULL DARK CALENDAR OVERRIDE ===== */}
            <style>{`
            .dark .fc {
              background-color: #111827 !important;
              color: #ffffff !important;
            }

            .fc-event,
            .fc-daygrid-event,
            .fc-timegrid-event {
              cursor: pointer;
            }

            .dark .fc-scrollgrid,
            .dark .fc-view-harness,
            .dark .fc-scroller {
              background-color: #111827 !important;
            }

            .dark .fc-col-header,
            .dark .fc-col-header-cell,
            .dark .fc-col-header-cell-cushion {
              background-color: #1f2937 !important;
              color: #ffffff !important;
              font-weight: 800 !important;
              text-transform: uppercase;
            }

            .dark .fc-daygrid-day,
            .dark .fc-timegrid-slot,
            .dark .fc-timegrid-col {
              background-color: #111827 !important;
            }

            .dark .fc-daygrid-day-number {
              color: #ffffff !important;
              font-weight: 700;
            }

            .dark .fc-theme-standard td,
            .dark .fc-theme-standard th,
            .dark .fc-scrollgrid,
            .dark .fc-scrollgrid td,
            .dark .fc-scrollgrid th {
              border: 1px solid rgba(255,255,255,0.25) !important;
            }

            .dark .fc-toolbar-title {
              color: #ffffff !important;
              font-weight: 900 !important;
            }

            .dark .fc-toolbar.fc-header-toolbar {
              background-color: #111827 !important;
              border-bottom: 1px solid rgba(255,255,255,0.1) !important;
            }

            .dark .fc-daygrid-day.fc-day-today {
              background-color: #4f46e5 !important;
            }

            .dark .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
              color: #f9fafb !important;
            }

            .dark .fc-button {
              background-color: #1f2937 !important;
              border: 1px solid #374151 !important;
              color: white !important;
              font-weight: 800 !important;
            }

            .dark .fc-button-active {
              background-color: #4f46e5 !important;
              border-color: #4f46e5 !important;
            }

            .dark .fc a {
              color: white !important;
              text-decoration: none !important;
            }
            `}</style>
        </div>
    );
}

export default CalendarPage;