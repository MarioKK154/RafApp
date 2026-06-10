import React from 'react';

function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div
            className="flex flex-col items-center justify-center flex-1 min-h-[50vh] gap-5"
            style={{ color: 'var(--text-muted)' }}
        >
            <div className="relative">
                {/* Outer ring */}
                <div
                    className="h-12 w-12 rounded-full animate-spin"
                    style={{
                        border: '2.5px solid var(--border)',
                        borderTopColor: 'var(--brand)',
                    }}
                />
                {/* Inner dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                            background: 'var(--brand)',
                            animation: 'pulseSoft 1.5s ease-in-out infinite',
                        }}
                    />
                </div>
            </div>
            <p
                className="text-[9px] font-black uppercase tracking-[0.3em]"
                style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}
            >
                {text}
            </p>
        </div>
    );
}

export default LoadingSpinner;