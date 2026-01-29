import React from 'react';
import { Clock, CheckCircle, MapPin } from 'lucide-react';

/**
 * TimesheetView - Clock in/out status display.
 */
export function TimesheetView({ isOnBase, setIsOnBase }) {
    const toggleBase = () => {
        setIsOnBase(!isOnBase);
        alert(isOnBase ? 'Saída registrada!' : 'Entrada registrada!');
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Registro de Ponto
            </h3>

            <div className="text-center py-6">
                <div
                    className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${isOnBase ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                >
                    {isOnBase ? (
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    ) : (
                        <MapPin className="w-12 h-12 text-gray-400" />
                    )}
                </div>

                <p className="text-lg font-semibold text-gray-800 mb-2">
                    {isOnBase ? 'Na Base' : 'Fora da Base'}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    {isOnBase
                        ? 'Você está registrado como presente na base'
                        : 'Registre sua entrada ao chegar na base'}
                </p>

                <button
                    onClick={toggleBase}
                    className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${isOnBase ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {isOnBase ? 'Registrar Saída' : 'Registrar Entrada'}
                </button>
            </div>
        </div>
    );
}
