import React from 'react';
import { Package, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';

/**
 * EquipmentView - Equipment and EPI list.
 */
export function EquipmentView({ equipment, onToggleStatus, onBack }) {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'embarcado':
                return 'bg-green-100 text-green-700';
            case 'pendente':
                return 'bg-yellow-100 text-yellow-700';
            case 'base':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getConditionBadge = (condition) => {
        switch (condition) {
            case 'bom':
                return 'bg-blue-100 text-blue-700';
            case 'novo':
                return 'bg-green-100 text-green-700';
            case 'desgastado':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-4 pb-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    Equipamentos & EPI
                </h2>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">
                        {equipment.filter((e) => e.status === 'embarcado').length}
                    </p>
                    <p className="text-xs text-green-600">Embarcados</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">
                        {equipment.filter((e) => e.status === 'pendente').length}
                    </p>
                    <p className="text-xs text-yellow-600">Pendentes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-700">
                        {equipment.filter((e) => e.status === 'base').length}
                    </p>
                    <p className="text-xs text-gray-600">Na Base</p>
                </div>
            </div>

            {/* Equipment List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="divide-y">
                    {equipment.map((item) => (
                        <div
                            key={item.id}
                            className="p-4 flex items-center justify-between hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${item.required ? 'bg-blue-100' : 'bg-gray-100'
                                        }`}
                                >
                                    {item.status === 'embarcado' ? (
                                        <CheckCircle
                                            className={`w-5 h-5 ${item.required ? 'text-blue-600' : 'text-gray-600'}`}
                                        />
                                    ) : (
                                        <AlertCircle
                                            className={`w-5 h-5 ${item.required ? 'text-yellow-600' : 'text-gray-400'}`}
                                        />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.code}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${getConditionBadge(item.condition)}`}>
                                    {item.condition}
                                </span>
                                <button
                                    onClick={() => onToggleStatus?.(item.id)}
                                    className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(item.status)}`}
                                >
                                    {item.status}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
