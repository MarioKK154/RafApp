import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    QrCodeIcon, 
    XMarkIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const BarcodeScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');

    const [simulatedBarcode, setSimulatedBarcode] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSimulateScan = (e) => {
        e.preventDefault();
        if (!simulatedBarcode.trim()) return;
        toast.success(isIcelandic ? `Strikamerki fundið: ${simulatedBarcode}` : `Barcode scanned: ${simulatedBarcode}`);
        if (onScanSuccess) onScanSuccess(simulatedBarcode.trim());
        setSimulatedBarcode('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/70 backdrop-blur-md p-4 flex items-center justify-center min-h-screen">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700 my-auto relative">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <QrCodeIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'Strikamerkjalestur (Barcode / QR Scanner)' : 'Barcode & QR Scanner'}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {isIcelandic ? 'Skannaðu EAN-13 strikamerki á rafmagnsbúnaði (Reykjafell / Rónning).' : 'Scan material EAN-13 barcodes on-site.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                {/* Simulated Camera View Finder */}
                <div className="relative aspect-square w-full bg-gray-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-indigo-500/50 shadow-inner">
                    <div className="absolute inset-8 border-2 border-dashed border-indigo-400/60 rounded-xl animate-pulse flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-gray-900/80 px-3 py-1 rounded-lg">
                            {isIcelandic ? 'Beindu myndavél að strikamerki' : 'Point Camera at Barcode'}
                        </span>
                    </div>
                    <QrCodeIcon className="h-20 w-20 text-indigo-400/20" />
                </div>

                {/* Manual Barcode Input Fallback */}
                <form onSubmit={handleSimulateScan} className="space-y-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={isIcelandic ? 'Sláðu inn eða skannaðu strikamerki (EAN-13)...' : 'Enter or scan barcode (EAN-13)...'}
                            value={simulatedBarcode}
                            onChange={(e) => setSimulatedBarcode(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-mono font-bold border-none"
                        />
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3.5 top-3.5" />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                    >
                        {isIcelandic ? 'Velja vöru úr vörulista' : 'Lookup Scanned Item'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;
