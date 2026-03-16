import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useTranslation } from 'react-i18next';
import { 
    ClipboardDocumentCheckIcon, 
    ClockIcon, 
    ArchiveBoxIcon, 
    PlusIcon,
    ChevronRightIcon 
} from '@heroicons/react/24/outline';

function ProjectTasks({ projectId, canCreateTask = false }) {
    const { t } = useTranslation();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        axiosInstance.get(`/tasks/?project_id=${projectId}&limit=10`)
            .then(res => {
                setTasks(Array.isArray(res.data) ? res.data : []);
            })
            .catch(error => console.error('Task Registry Sync Error:', error))
            .finally(() => setLoading(false));
    }, [projectId]);

    const getStatusIndicator = (status) => {
        switch (status) {
            case 'Done':
            case 'Completed': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'In Progress': return 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]';
            case 'Blocked': return 'bg-red-500 animate-pulse';
            default: return 'bg-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="p-12 space-y-4">
                {[1, 2, 3].map(n => (
                    <div key={n} className="h-16 w-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <header className="flex justify-between items-center mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <ClipboardDocumentCheckIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('tasks')}</h2>
                </div>
                {canCreateTask && (
                    <Link 
                        to={`/tasks/new?project_id=${projectId}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" /> {t('new_task')}
                    </Link>
                )}
            </header>

            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {tasks.length > 0 ? tasks.map(task => (
                    <Link 
                        key={task.id} 
                        to={`/tasks/${task.id}`}
                        className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className={`w-1.5 h-10 rounded-full transition-transform group-hover:scale-y-110 ${getStatusIndicator(task.status)}`} />
                            <div>
                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {task.title}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                        {task.status}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 italic">
                                        Lead: {task.assignee?.full_name || t('unassigned')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-300 group-hover:text-indigo-400 transition-colors relative z-10">
                            <ClockIcon className="h-4 w-4 stroke-[2px]" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'TBD'}
                            </span>
                            <ChevronRightIcon className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                )) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <ArchiveBoxIcon className="h-10 w-10 text-gray-100 dark:text-gray-800 mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">
                            {t('project_tasks_empty')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectTasks;