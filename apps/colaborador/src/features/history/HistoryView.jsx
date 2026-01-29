import React from 'react';
import { History, ChevronLeft, MapPin, Calendar, Plane, Ship } from 'lucide-react';
import { formatDateBR } from '../../utils';

/**
 * HistoryView - Embark history.
 */
export function HistoryView({ embarkHistory, onBack }) {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'agendado':
                return 'bg-blue-100 text-blue-700';
            case 'concluido':
                return 'bg-green-100 text-green-700';
            case 'cancelado':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getTransportIcon = (transport) => {
        if (transport?.toLowerCase().includes('barco')) {
            return <Ship className="w-4 h-4" />;
        }
        return <Plane className="w-4 h-4" />;
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
                    <History className="w-6 h-6 text-purple-600" />
                    Histórico de Embarques
                </h2>
            </div>

            {/* History List */}
            <div className="space-y-3">
                {embarkHistory.map((trip) => (
                    <div key={trip.id} className="bg-white rounded-xl shadow-md p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-gray-800">{trip.destination}</h3>
                                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{trip.location}</span>
                                </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(trip.status)}`}>
                                {trip.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatDateBR(trip.embarkDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatDateBR(trip.disembarkDate)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                {getTransportIcon(trip.transportation)}
                                <span>{trip.transportation}</span>
                            </div>
                            <span className="text-gray-600">{trip.days} dias</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
