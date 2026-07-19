import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProjectDrawings from '../components/ProjectDrawings';
import { 
    BriefcaseIcon, 
    MapPinIcon, 
    HashtagIcon, 
    FolderOpenIcon,
    MagnifyingGlassIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

function DrawingsPage() {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language === 'is';
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [drawingCounts, setDrawingCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchPageData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch active projects
            const projectsRes = await axiosInstance.get('/projects/');
            const rawProjects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
            // Filter out completed/archived projects for the central Ajour drawings list
            const activeProjects = rawProjects.filter(p => p.status !== 'Completed');
            setProjects(activeProjects);

            // 2. Fetch drawings count for each active project in parallel
            const counts = {};
            await Promise.all(
                activeProjects.map(async (p) => {
                    try {
                        const res = await axiosInstance.get(`/drawings/project/${p.id}`);
                        counts[p.id] = Array.isArray(res.data) ? res.data.length : 0;
                    } catch {
                        counts[p.id] = 0;
                    }
                })
            );
            setDrawingCounts(counts);
        } catch (error) {
            console.error('Failed to fetch drawings overview:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const filteredProjects = projects.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
            p.name?.toLowerCase().includes(query) ||
            p.address?.toLowerCase().includes(query) ||
            p.project_number?.toLowerCase().includes(query)
        );
    });

    if (selectedProjectId) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-300">
                <ProjectDrawings 
                    projectId={selectedProjectId} 
                    onBack={() => {
                        setSelectedProjectId(null);
                        fetchPageData(); // Refresh counts on return
                    }} 
                />
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner text={isIcelandic ? 'Hleður teikningaskrá...' : 'Loading drawings directory...'} size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header section */}
            <header className="mb-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <DocumentDuplicateIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                {isIcelandic ? 'Teikningamiðstöð' : 'Drawings Database'}
                            </h1>
                            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                {isIcelandic ? 'Ajour skrá yfir öll teikningasöfn og hönnunargögn.' : 'Ajour directory of all active project drawing catalogs.'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search and Filters */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isIcelandic ? 'Leita að verkefni eða heimilisfangi...' : 'Search by project name or address...'}
                        className="w-full h-12 pl-10 pr-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Ajour List */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-gray-700/30 border-b">
                            <tr>
                                <th className="py-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {isIcelandic ? 'Verkefnisnúmer' : 'Project Number'}
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {isIcelandic ? 'Verkheiti' : 'Project Name'}
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {isIcelandic ? 'Staðsetning' : 'Address'}
                                </th>
                                <th className="py-6 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                    {isIcelandic ? 'Fjöldi teikninga' : 'Drawings Count'}
                                </th>
                                <th className="py-6 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {isIcelandic ? 'Aðgerðir' : 'Actions'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {filteredProjects.length > 0 ? filteredProjects.map(project => (
                                <tr key={project.id} className="group hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors">
                                    <td className="py-6 px-8 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <HashtagIcon className="h-4 w-4 text-indigo-500" />
                                            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider text-xs">
                                                {project.project_number || `PROJ-${project.id}`}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                                <BriefcaseIcon className="h-4 w-4" />
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-xs">
                                                {project.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-6">
                                        <div className="flex items-center gap-2">
                                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                                {project.address || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-6 text-center">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-mono font-black text-[10px] rounded-lg border border-indigo-100 dark:border-indigo-950/30">
                                            {drawingCounts[project.id] ?? 0}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProjectId(project.id)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition"
                                        >
                                            <FolderOpenIcon className="h-4 w-4" />
                                            {isIcelandic ? 'Opna Skráasafn' : 'Open Directory'}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] italic">
                                        {isIcelandic ? 'Engin virk verkefni fundust.' : 'No active projects found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DrawingsPage;
