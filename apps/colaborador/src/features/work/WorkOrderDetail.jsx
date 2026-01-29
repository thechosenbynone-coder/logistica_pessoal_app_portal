import React from 'react';
import {
    ChevronLeft,
    Play,
    Pause,
    Square,
    Camera,
    AlertTriangle,
    CheckCircle,
    X,
} from 'lucide-react';
import { formatTimeBR, minutesBetween, sumPauseMinutes } from '../../utils';
import { SignaturePad } from '../../components';

/**
 * WorkOrderDetail - Detailed view of a work order.
 */
export function WorkOrderDetail({
    os,
    onBack,
    onToggleChecklist,
    onStart,
    onPause,
    onResume,
    onFinish,
    onAddPhotos,
    onRemovePhoto,
    onOpenIncident,
    onSetSignature,
    canConclude,
    onConclude,
}) {
    const isPaused = !!os.time.currentPauseStart;
    const isRunning = os.status === 'IN_PROGRESS' && !isPaused;
    const isCompleted = os.status === 'COMPLETED' || os.status === 'CONCLUDED';

    // Calculate elapsed time
    const elapsedMinutes = os.time.startedAt
        ? minutesBetween(os.time.startedAt, os.time.endedAt || new Date().toISOString()) -
        sumPauseMinutes(os.time.pauses)
        : 0;

    const formatElapsed = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <span className="text-xs text-gray-500 font-mono">{os.code}</span>
                    <h2 className="font-bold text-gray-800">{os.title}</h2>
                </div>
            </div>

            {/* Time Controls */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-500">Tempo de Trabalho</p>
                        <p className="text-2xl font-bold text-gray-800">{formatElapsed(elapsedMinutes)}</p>
                    </div>

                    <div className="flex gap-2">
                        {os.status === 'RECEIVED' && (
                            <button
                                onClick={() => onStart(os.id)}
                                className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                            >
                                <Play className="w-4 h-4" />
                                Iniciar
                            </button>
                        )}

                        {isRunning && (
                            <>
                                <button
                                    onClick={() => onPause(os.id)}
                                    className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
                                >
                                    <Pause className="w-4 h-4" />
                                    Pausar
                                </button>
                                <button
                                    onClick={() => onFinish(os.id)}
                                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    <Square className="w-4 h-4" />
                                    Finalizar
                                </button>
                            </>
                        )}

                        {isPaused && (
                            <button
                                onClick={() => onResume(os.id)}
                                className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                            >
                                <Play className="w-4 h-4" />
                                Retomar
                            </button>
                        )}
                    </div>
                </div>

                {os.time.startedAt && (
                    <div className="text-xs text-gray-500">
                        Início: {formatTimeBR(os.time.startedAt)}
                        {os.time.endedAt && ` • Fim: ${formatTimeBR(os.time.endedAt)}`}
                    </div>
                )}
            </div>

            {/* Safety Checklist */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Checklist de Segurança
                </h3>
                <div className="space-y-2">
                    {os.safetyChecklist.map((item) => (
                        <label
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => onToggleChecklist(os.id, 'safetyChecklist', item.id)}
                                className="w-5 h-5 rounded text-green-600"
                            />
                            <span className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                {item.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Execution Checklist */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    Checklist de Execução
                </h3>
                <div className="space-y-2">
                    {os.executionChecklist.map((item) => (
                        <label
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => onToggleChecklist(os.id, 'executionChecklist', item.id)}
                                className="w-5 h-5 rounded text-blue-600"
                            />
                            <span className={`text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                {item.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Evidence Photos */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-600" />
                    Evidências Fotográficas
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                    {os.evidences.map((photo) => (
                        <div key={photo.id} className="relative">
                            <img src={photo.dataUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />
                            <button
                                onClick={() => onRemovePhoto(os.id, photo.id)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Adicionar fotos</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => onAddPhotos(os.id, e.target.files)}
                    />
                </label>
            </div>

            {/* Incidents */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        Incidentes ({os.incidents.length})
                    </h3>
                    <button
                        onClick={() => onOpenIncident(os.id)}
                        className="text-sm text-yellow-600 font-medium hover:underline"
                    >
                        + Registrar
                    </button>
                </div>

                {os.incidents.length > 0 ? (
                    <div className="space-y-2">
                        {os.incidents.map((inc) => (
                            <div key={inc.id} className="p-3 bg-yellow-50 rounded-lg">
                                <p className="font-medium text-gray-800">{inc.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatTimeBR(inc.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhum incidente registrado</p>
                )}
            </div>

            {/* Signatures */}
            {isCompleted && (
                <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
                    <h3 className="font-semibold text-gray-800">Assinaturas</h3>

                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Colaborador</p>
                        <SignaturePad
                            value={os.signatures.worker}
                            onChange={(sig) => onSetSignature(os.id, 'worker', sig)}
                        />
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Supervisor</p>
                        <SignaturePad
                            value={os.signatures.supervisor}
                            onChange={(sig) => onSetSignature(os.id, 'supervisor', sig)}
                        />
                    </div>

                    {canConclude(os) && (
                        <button
                            onClick={() => onConclude(os.id)}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                        >
                            Concluir OS
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
