import React from 'react';
import { Home, Plane, Briefcase, Wallet, User } from 'lucide-react';

const NAV_ITEMS = [
    { key: 'home', label: 'Início', icon: Home },
    { key: 'trip', label: 'Viagem', icon: Plane },
    { key: 'work', label: 'Trabalho', icon: Briefcase },
    { key: 'finance', label: 'Financeiro', icon: Wallet },
    { key: 'profile', label: 'Perfil', icon: User },
];

/**
 * Bottom navigation for mobile app.
 */
export function BottomNav({ activeTab, onTabChange }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
            <div className="flex justify-around items-center h-16">
                {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => onTabChange(key)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : ''}`} />
                            <span className="text-xs mt-1">{label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
