import React, { useState, useCallback } from 'react';
import {
    MapPin,
    Calendar,
    Briefcase,
    Clock,
    CheckCircle,
} from 'lucide-react';
import { formatDateBR } from '../../utils';
import { useGeolocation } from '../../hooks/useGeolocation';

/**
 * HomeTab - Main home screen with status, next trip, check-in/out, and timeline.
 */
export function HomeTab({
    employee,
    currentTrip,
    timeline,
    onCheckIn,
    onCheckOut,
}) {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [checkInStatus, setCheckInStatus] = useState('pending');
    const { getLocation } = useGeolocation();

    const handleCheckIn = useCallback(async () => {
        try {
            await onCheckIn?.();
            const locationResult = await getLocation();

            if (locationResult?.ok) {
                setCurrentLocation({ lat: locationResult.lat, lng: locationResult.lng });
            } else {
                setCurrentLocation(null);
            }

            setCheckInStatus('success');
            setTimeout(() => setCheckInStatus('completed'), 1200);
        } catch (error) {
            console.error('Check-in error:', error.message);
            alert('Erro ao fazer check-in. Tente novamente.');
        }
    }, [getLocation, onCheckIn]);

    const handleCheckOut = useCallback(async () => {
        try {
            await onCheckOut?.();
            alert('Check-out realizado com sucesso!');
        } catch (error) {
            console.error('Check-out error:', error.message);
            alert('Erro ao fazer check-out. Tente novamente.');
        }
    }, [onCheckOut]);

    return (
        <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-blue-100 text-sm">Status Atual</p>
                        <h2 className="text-2xl font-bold">{employee.currentStatus}</h2>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Briefcase className="w-8 h-8" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{currentTrip.location}</span>
                </div>
            </div>

            {/* Próximo Embarque */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Próximo Embarque
                    </h3>
                    <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {currentTrip.daysRemaining} dias
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-gray-600 text-sm">Destino</span>
                        <span className="font-semibold text-gray-800">{currentTrip.destination}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-gray-600 text-sm">Data de Embarque</span>
                        <span className="font-semibold text-gray-800">{formatDateBR(currentTrip.embarkDate)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-gray-600 text-sm">Data de Desembarque</span>
                        <span className="font-semibold text-gray-800">{formatDateBR(currentTrip.disembarkDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Transporte</span>
                        <span className="font-semibold text-gray-800">{currentTrip.transportation}</span>
                    </div>
                </div>
            </div>

            {/* Check-in/Check-out */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    Confirmar Localização
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleCheckIn}
                        disabled={checkInStatus === 'completed'}
                        className={`${checkInStatus === 'completed'
                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            } py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors`}
                    >
                        {checkInStatus === 'completed' ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Check-in Feito
                            </>
                        ) : (
                            <>
                                <MapPin className="w-5 h-5" />
                                Check-in
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleCheckOut}
                        className="bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <MapPin className="w-5 h-5" />
                        Check-out
                    </button>
                </div>

                {currentLocation && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <p className="font-semibold text-gray-800 mb-1">Localização capturada:</p>
                        <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                        <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Cronograma
                </h3>

                <div className="space-y-3">
                    {timeline.map((item, index) => (
                        <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-3 h-3 rounded-full ${item.status === 'completed'
                                            ? 'bg-green-500'
                                            : item.status === 'pending'
                                                ? 'bg-blue-500'
                                                : 'bg-gray-300'
                                        }`}
                                />
                                {index < timeline.length - 1 && <div className="w-0.5 h-12 bg-gray-200 my-1" />}
                            </div>
                            <div className="flex-1 pb-3">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-gray-800 text-sm">{item.event}</p>
                                    <span className="text-xs text-gray-500">{item.date}</span>
                                </div>
                                <p className="text-sm text-gray-600">{item.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
