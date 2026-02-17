import React from 'react';

/**
 * Loading spinner component.
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div
                className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
            />
        </div>
    );
}

/**
 * Full page loading state.
 */
export function LoadingPage({ message = 'Carregando...' }) {
    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{message}</p>
        </div>
    );
}
