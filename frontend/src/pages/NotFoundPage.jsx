import React from 'react';
import { Link } from 'react-router-dom';
import { 
    SignalSlashIcon, 
    HomeIcon, 
    ChevronLeftIcon,
    ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

function NotFoundPage() {
    return (
        <div className="min-h-[80vh] flex flex-col justify-center items-center p-6 text-center animate-in fade-in zoom-in duration-500">
            {/* Visual Error Indicator */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                <div className="relative p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700">
                    <SignalSlashIcon className="h-20 w-20 text-indigo-600 dark:text-indigo-400" />
                </div>
                {/* Small floating warning badge */}
                <div className="absolute -top-2 -right-2 p-2 bg-orange-500 rounded-full shadow-lg border-4 border-gray-50 dark:border-gray-900">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                </div>
            </div>

            {/* Error Message */}
            <div className="max-w-md space-y-4">
                <header>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Error Protocol 404</span>
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white mt-2 tracking-tighter">
                        Endpoint Lost
                    </h1>
                </header>
                
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                    The technical registry could not locate the requested coordinate. 
                    The page may have been decommissioned or the path was incorrectly entered.
                </p>

                {/* Action Interface */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                    >
                        <HomeIcon className="h-5 w-5" />
                        Restore to Dashboard
                    </Link>
                    
                    <button
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                        Previous Station
                    </button>
                </div>
            </div>

            {/* Background Branding Decor */}
            <div className="fixed bottom-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none">
                <span className="text-[15vw] font-black uppercase tracking-tighter">RafApp</span>
            </div>
        </div>
    );
}

export default NotFoundPage;