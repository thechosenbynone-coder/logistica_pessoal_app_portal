import React, { useMemo } from 'react';
import { QrCode, Plane, AlertCircle } from 'lucide-react';
import { formatDateBR } from '../../utils';

/**
 * TripTab - QR code and boarding pass display.
 */
export function TripTab({ employee, boarding, qrCodeData = 'SECURE_TOKEN_V1' }) {
    const qrCodeUrl = useMemo(() => {
        const data = `EMBARQUE|${employee.registration}|${boarding.flight}|${boarding.date}|${qrCodeData}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
    }, [employee.registration, boarding.flight, boarding.date, qrCodeData]);

    return (
        <div className="space-y-4">
            {/* QR Code */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    QR Code de Identificação
                </h3>

                <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-3 flex items-center justify-center">
                        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-2">
                        Apresente este QR Code nos terminais de embarque
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                        <p className="text-xs text-blue-800">
                            <strong>Matrícula:</strong> {employee.registration}
                        </p>
                        <p className="text-xs text-blue-800">
                            <strong>Voo:</strong> {boarding.flight}
                        </p>
                        <p className="text-[11px] text-blue-800 mt-1 font-mono break-all">
                            <strong>Token:</strong> {qrCodeData.substring(0, 18)}...
                        </p>
                    </div>
                </div>
            </div>

            {/* Cartão de Embarque */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">CARTÃO DE EMBARQUE</span>
                        <Plane className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold">{boarding.flight}</p>
                </div>

                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">PASSAGEIRO</p>
                            <p className="font-semibold text-gray-800">{employee.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">ASSENTO</p>
                            <p className="font-semibold text-gray-800">{boarding.seat}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">DATA</p>
                            <p className="font-semibold text-gray-800">{formatDateBR(boarding.date)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">HORÁRIO</p>
                            <p className="font-semibold text-gray-800">{boarding.time}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-xs text-gray-500 mb-1">LOCAL DE EMBARQUE</p>
                        <p className="font-semibold text-gray-800">{boarding.location}</p>
                        <p className="text-sm text-gray-600 mt-1">{boarding.terminal}</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">
                                Apresente-se às {boarding.checkInTime}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                                Tenha em mãos: RG, ASO válido e este app aberto
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
