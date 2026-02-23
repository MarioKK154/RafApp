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
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'custom',
        start: '',
        end: '',
        description: '',
        location: '',
        attendees: [] 
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tasksRes, projectsRes, eventsRes] = await Promise.all([
                axiosInstance.get('/tasks/', { params: { limit: 1000 } }),
                axiosInstance.get('/projects/', { params: { limit: 1000 } }),
                axiosInstance.get('/events/', { params: { 
                    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
                    end: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1).toISOString()
                }})
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
        setFormData({
            title: evt.title.replace('[MTG] ', ''),
            event_type: props.type,
            start: evt.start ? new Date(evt.start).toLocaleString() : '',
            end: evt.end ? new Date(evt.end).toLocaleString() : '',
            description: props.description || '',
            location: props.location || '',
            attendees: props.attendees || [] 
        });
        setIsModalOpen(true);
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
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg text-white">
                        <CalendarDaysIcon className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic">
                        Deployment Hub
                    </h1>
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
                title="Operational Detail"
            >
                <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
                        <p className="text-xs font-bold text-gray-500 uppercase">
                            Read-Only Entry
                        </p>
                    </div>

                    <div>
                        <p className="modern-input bg-gray-50 dark:bg-gray-800 flex items-center h-12 px-4 font-bold text-gray-900 dark:text-white">
                            {formData.title}
                        </p>
                    </div>
                </div>
            </Modal>

            {/* ===== FULL DARK CALENDAR OVERRIDE ===== */}
            <style>{`
            .dark .fc {
              background-color: #111827 !important;
              color: #ffffff !important;
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