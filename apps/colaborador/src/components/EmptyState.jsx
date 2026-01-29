import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Empty state component.
 */
export function EmptyState({
    icon: Icon = FileText,
    title = 'Nenhum item encontrado',
    description = 'Não há dados para exibir no momento.',
    action = null,
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm max-w-sm mb-4">{description}</p>
            {action}
        </div>
    );
}
