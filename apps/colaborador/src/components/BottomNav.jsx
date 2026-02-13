import React from 'react';
import { Home, Plane, Briefcase, Wallet, User } from 'lucide-react';

const BASE_NAV_ITEMS = [
  { key: 'home', label: 'Início', icon: Home },
  { key: 'trip', label: 'Viagem', icon: Plane },
  { key: 'work', label: 'Trabalho', icon: Briefcase },
  { key: 'finance', label: 'Financeiro', icon: Wallet },
  { key: 'profile', label: 'Perfil', icon: User },
];

export function BottomNav({ activeTab, onTabChange, extraItems = [] }) {
  const navItems = [...BASE_NAV_ITEMS, ...extraItems];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 overflow-x-auto">
      <div className="flex items-center h-16 min-w-max">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex flex-col items-center justify-center h-full transition-colors px-3 min-w-16 ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : ''}`} />
              <span className="text-xs mt-1 whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
