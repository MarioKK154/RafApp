import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    ClipboardDocumentCheckIcon, 
    PlusIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ExclamationTriangleIcon,
    PencilSquareIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const ProjectWorkOrders = ({ projectId, isManagement }) => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');
    
    const [workOrders, setWorkOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWoForSign, setSelectedWoForSign] = useState(null);
    const [signerName, setSignerName] = useState('');
    
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const [newWo, setNewWo] = useState({
        title: '',
        description: '',
        priority: 'Normal',
        location: '',
        scheduled_date: ''
    });

    const fetchWorkOrders = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/work-orders/?project_id=${projectId}`);
            setWorkOrders(res.data || []);
        } catch (err) {
            console.error('Failed to fetch work orders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchWorkOrders();
    }, [projectId]);

    const handleCreateWorkOrder = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/work-orders/', {
                ...newWo,
                project_id: projectId,
                scheduled_date: newWo.scheduled_date ? new Date(newWo.scheduled_date).toISOString() : null
            });
            toast.success(isIcelandic ? 'Verkbeiðni stofnuð!' : 'Work Order created!');
            setIsCreateOpen(false);
            setNewWo({ title: '', description: '', priority: 'Normal', location: '', scheduled_date: '' });
            fetchWorkOrders();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create work order.');
        }
    };

    const handleStatusToggle = async (wo) => {
        const nextStatus = wo.status === 'Completed' ? 'Open' : 'Completed';
        try {
            await axiosInstance.patch(`/work-orders/${wo.id}`, { status: nextStatus });
            toast.success(isIcelandic ? `Verkbeiðni merkt: ${nextStatus}` : `Work order updated: ${nextStatus}`);
            fetchWorkOrders();
        } catch (err) {
            toast.error('Failed to update status.');
        }
    };

    // Signature Canvas Drawing Handlers
    const startDrawing = (e) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = async () => {
        if (!canvasRef.current || !selectedWoForSign) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        try {
            await axiosInstance.patch(`/work-orders/${selectedWoForSign.id}`, {
                customer_signature_path: dataUrl,
                signed_by_name: signerName || (isIcelandic ? 'Tengiliður' : 'Client Representative'),
                status: 'Completed'
            });
            toast.success(isIcelandic ? 'Undirskrift vistuð og verkbeiðni lokið!' : 'Signature saved & Work Order completed!');
            setSelectedWoForSign(null);
            fetchWorkOrders();
        } catch (err) {
            toast.error('Failed to save signature.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/60 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60">
                <div>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                        {isIcelandic ? 'Verkbeiðnir & Vettvangsstýring' : 'Work Orders & Field Dispatch'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">
                        {isIcelandic 
                            ? 'Umsjón með útköllum, staðsetningum og rafrænum undirskriftum viðskiptavina.' 
                            : 'Manage dispatch calls, service orders, and client on-site digital signatures.'}
                    </p>
                </div>
                {isManagement && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/20 transform active:scale-95"
                    >
                        <PlusIcon className="h-4 w-4" /> {isIcelandic ? 'Ný verkbeiðni' : 'New Work Order'}
                    </button>
                )}
            </div>

            {/* Work Order Cards Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold animate-pulse">
                    {isIcelandic ? 'Sæki verkbeiðnir...' : 'Loading work orders...'}
                </div>
            ) : workOrders.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 space-y-3">
                    <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                        {isIcelandic ? 'Engar verkbeiðnir skráðar' : 'No Work Orders Registered'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workOrders.map((wo) => (
                        <div key={wo.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-6 space-y-4 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider mb-2 ${
                                        wo.priority === 'Emergency' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                    }`}>
                                        {wo.priority}
                                    </span>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white">{wo.title}</h4>
                                </div>
                                <button
                                    onClick={() => handleStatusToggle(wo)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                                        wo.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                >
                                    {wo.status}
                                </button>
                            </div>

                            {wo.description && <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{wo.description}</p>}
                            {wo.location && <p className="text-[10px] font-bold text-gray-400">📍 {wo.location}</p>}

                            {/* Customer Signature Status */}
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                                {wo.customer_signature_path ? (
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                        <CheckCircleIcon className="h-4 w-4" />
                                        <span>{isIcelandic ? `Undirskrifað af ${wo.signed_by_name || 'viðskiptavini'}` : `Signed by ${wo.signed_by_name || 'client'}`}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedWoForSign(wo)}
                                        className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] font-black uppercase tracking-wider"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                        {isIcelandic ? 'Rafræn undirskrift' : 'Sign On-Site'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Work Order Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'Stofna nýja verkbeiðni' : 'Create Work Order'}
                            </h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleCreateWorkOrder} className="space-y-3">
                            <input
                                type="text"
                                required
                                placeholder={isIcelandic ? 'Titill verkbeiðni*' : 'Work Order Title*'}
                                value={newWo.title}
                                onChange={(e) => setNewWo({...newWo, title: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <textarea
                                placeholder={isIcelandic ? 'Lýsing á útkalli / verki...' : 'Callout scope & details...'}
                                value={newWo.description}
                                onChange={(e) => setNewWo({...newWo, description: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                                rows="3"
                            ></textarea>
                            <input
                                type="text"
                                placeholder={isIcelandic ? 'Staðsetning / Herbergi' : 'Location / Room'}
                                value={newWo.location}
                                onChange={(e) => setNewWo({...newWo, location: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <select
                                value={newWo.priority}
                                onChange={(e) => setNewWo({...newWo, priority: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            >
                                <option value="Low">{isIcelandic ? 'Lágur forgangur' : 'Low Priority'}</option>
                                <option value="Normal">{isIcelandic ? 'Venjulegur forgangur' : 'Normal Priority'}</option>
                                <option value="High">{isIcelandic ? 'Hár forgangur' : 'High Priority'}</option>
                                <option value="Emergency">{isIcelandic ? '🚨 Bráðabreyting / Útkall' : '🚨 Emergency Callout'}</option>
                            </select>
                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                            >
                                {isIcelandic ? 'Staðfesta verkbeiðni' : 'Confirm Work Order'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Signature Canvas Modal */}
            {selectedWoForSign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'Rafræn undirskrift viðskiptavinar' : 'Client Digital Signature'}
                            </h3>
                            <button onClick={() => setSelectedWoForSign(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                        <input
                            type="text"
                            placeholder={isIcelandic ? 'Nafn tengiliðar / húseiganda' : 'Signer Full Name'}
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                        />
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-white p-2">
                            <canvas
                                ref={canvasRef}
                                width={360}
                                height={160}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-40 touch-none cursor-crosshair"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={clearSignature}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl"
                            >
                                {isIcelandic ? 'Hreinsa' : 'Clear'}
                            </button>
                            <button
                                type="button"
                                onClick={saveSignature}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-emerald-500/20"
                            >
                                {isIcelandic ? 'Vista & Ljúka' : 'Save & Finish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectWorkOrders;
