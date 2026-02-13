import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Briefcase,
    Clock,
    FileText,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Camera,
    Plus,
    ChevronRight,
} from 'lucide-react';
import { formatTimeBR, minutesBetween, sumPauseMinutes, todayISO, formatDateBR } from '../../utils';
import { fileToDataUrl, downloadTextFile } from '../../utils/file';
import { uid } from '../../utils/id';
import { SignaturePad } from '../../components';
import { WorkOrdersList } from './WorkOrdersList';
import { WorkOrderDetail } from './WorkOrderDetail';
import { TimesheetView } from './TimesheetView';

/**
 * WorkTab - Work orders, RDO, Timesheet, and Sync management.
 */
export function WorkTab({
    workOrders,
    setWorkOrders,
    dailyReports,
    setDailyReports,
    syncLog,
    setSyncLog,
    isOnBase,
    setIsOnBase,
    initialSection = 'os',
}) {
    const [workSection, setWorkSection] = useState(initialSection);
    const [workScreen, setWorkScreen] = useState({ view: 'list', id: null });
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [incidentDraft, setIncidentDraft] = useState({ title: '', severity: 'media', description: '', photos: [] });
    const [incidentTargetOsId, setIncidentTargetOsId] = useState(null);

    useEffect(() => {
        if (['os', 'rdo', 'timesheet', 'sync'].includes(initialSection)) {
            setWorkSection(initialSection);
        }
    }, [initialSection]);

    const [rdoDraft, setRdoDraft] = useState({
        date: todayISO(),
        shiftStart: '',
        shiftEnd: '',
        activities: '',
        notes: '',
        safetyChecklistOk: false,
        photos: [],
        workerSignature: null,
        supervisorSignature: null,
    });

    // Work order helpers
    const updateWorkOrder = useCallback((id, updater) => {
        setWorkOrders((prev) => prev.map((os) => (os.id === id ? updater(os) : os)));
    }, [setWorkOrders]);

    const toggleChecklistItem = useCallback((osId, listKey, itemId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            [listKey]: os[listKey].map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        }));
    }, [updateWorkOrder]);

    const startOs = useCallback(async (osId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            status: 'IN_PROGRESS',
            time: { ...os.time, startedAt: new Date().toISOString() },
        }));
    }, [updateWorkOrder]);

    const pauseOs = useCallback((osId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            time: { ...os.time, currentPauseStart: new Date().toISOString() },
        }));
    }, [updateWorkOrder]);

    const resumeOs = useCallback((osId) => {
        updateWorkOrder(osId, (os) => {
            const pauseEnd = new Date().toISOString();
            const newPause = { start: os.time.currentPauseStart, end: pauseEnd };
            return {
                ...os,
                time: { ...os.time, currentPauseStart: null, pauses: [...os.time.pauses, newPause] },
            };
        });
    }, [updateWorkOrder]);

    const finishOs = useCallback((osId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            status: 'COMPLETED',
            time: { ...os.time, endedAt: new Date().toISOString() },
        }));
    }, [updateWorkOrder]);

    const addEvidencePhotos = useCallback(async (osId, files) => {
        const photos = [];
        for (const file of Array.from(files)) {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl) {
                photos.push({ id: uid('ev'), dataUrl, ts: new Date().toISOString() });
            }
        }
        if (photos.length > 0) {
            updateWorkOrder(osId, (os) => ({
                ...os,
                evidences: [...os.evidences, ...photos],
            }));
        }
    }, [updateWorkOrder]);

    const removeEvidencePhoto = useCallback((osId, photoId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            evidences: os.evidences.filter((e) => e.id !== photoId),
        }));
    }, [updateWorkOrder]);

    const openIncidentForOs = useCallback((osId) => {
        setIncidentTargetOsId(osId);
        setIncidentDraft({ title: '', severity: 'media', description: '', photos: [] });
        setShowIncidentModal(true);
    }, []);

    const addIncidentPhotos = useCallback(async (files) => {
        const photos = [];
        for (const file of Array.from(files)) {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl) {
                photos.push({ id: uid('inc'), dataUrl, ts: new Date().toISOString() });
            }
        }
        if (photos.length > 0) {
            setIncidentDraft((prev) => ({ ...prev, photos: [...prev.photos, ...photos] }));
        }
    }, []);

    const submitIncident = useCallback(() => {
        if (!incidentDraft.title) {
            alert('Preencha o título do incidente');
            return;
        }
        const incident = {
            id: uid('inc'),
            ...incidentDraft,
            createdAt: new Date().toISOString(),
        };
        updateWorkOrder(incidentTargetOsId, (os) => ({
            ...os,
            incidents: [...os.incidents, incident],
        }));
        setShowIncidentModal(false);
        setIncidentTargetOsId(null);
    }, [incidentDraft, incidentTargetOsId, updateWorkOrder]);

    const setSignature = useCallback((osId, who, dataUrl) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            signatures: {
                ...os.signatures,
                [who]: dataUrl,
                [`${who}SignedAt`]: dataUrl ? new Date().toISOString() : null,
            },
        }));
    }, [updateWorkOrder]);

    const canConcludeOs = useCallback((os) => {
        if (os.status !== 'COMPLETED') return false;
        const allSafety = os.safetyChecklist.every((c) => c.done);
        const allExec = os.executionChecklist.every((c) => c.done);
        const hasWorkerSig = !!os.signatures.worker;
        const hasSupervisorSig = !!os.signatures.supervisor;
        return allSafety && allExec && hasWorkerSig && hasSupervisorSig;
    }, []);

    const concludeOs = useCallback((osId) => {
        updateWorkOrder(osId, (os) => ({
            ...os,
            status: 'CONCLUDED',
            sync: { ...os.sync, status: 'READY' },
        }));
        setWorkScreen({ view: 'list', id: null });
    }, [updateWorkOrder]);

    // RDO helpers
    const addRdoPhotos = useCallback(async (files) => {
        const photos = [];
        for (const file of Array.from(files)) {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl) {
                photos.push({ id: uid('rdo'), dataUrl, ts: new Date().toISOString() });
            }
        }
        if (photos.length > 0) {
            setRdoDraft((prev) => ({ ...prev, photos: [...prev.photos, ...photos] }));
        }
    }, []);

    const removeRdoPhoto = useCallback((photoId) => {
        setRdoDraft((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
    }, []);

    const submitRdo = useCallback(() => {
        if (!rdoDraft.shiftStart || !rdoDraft.shiftEnd || !rdoDraft.activities) {
            alert('Preencha todas as informações obrigatórias');
            return;
        }
        const rdo = {
            id: uid('rdo'),
            ...rdoDraft,
            createdAt: new Date().toISOString(),
            sync: { status: 'READY', lastAttemptAt: null, syncedAt: null },
        };
        setDailyReports((prev) => [...prev, rdo]);
        setRdoDraft({
            date: todayISO(),
            shiftStart: '',
            shiftEnd: '',
            activities: '',
            notes: '',
            safetyChecklistOk: false,
            photos: [],
            workerSignature: null,
            supervisorSignature: null,
        });
        setWorkScreen({ view: 'list', id: null });
        alert('RDO registrado com sucesso!');
    }, [rdoDraft, setDailyReports]);

    // Sync
    const syncNow = useCallback(() => {
        setSyncLog((prev) => [
            { id: uid('sync'), type: 'SYNC', ts: new Date().toISOString(), status: 'SUCCESS', message: 'Sincronização concluída' },
            ...prev,
        ]);
        setWorkOrders((prev) =>
            prev.map((os) =>
                os.sync.status === 'READY'
                    ? { ...os, sync: { ...os.sync, status: 'SYNCED', syncedAt: new Date().toISOString() } }
                    : os
            )
        );
        setDailyReports((prev) =>
            prev.map((rdo) =>
                rdo.sync?.status === 'READY'
                    ? { ...rdo, sync: { ...rdo.sync, status: 'SYNCED', syncedAt: new Date().toISOString() } }
                    : rdo
            )
        );
        alert('Dados sincronizados!');
    }, [setSyncLog, setWorkOrders, setDailyReports]);

    // Selected OS
    const selectedOs = useMemo(() => {
        if (workScreen.view === 'detail' && workScreen.id) {
            return workOrders.find((os) => os.id === workScreen.id);
        }
        return null;
    }, [workScreen, workOrders]);

    // Pending sync count
    const pendingCount = useMemo(() => {
        const osReady = workOrders.filter((os) => os.sync.status === 'READY').length;
        const rdoReady = dailyReports.filter((r) => r.sync?.status === 'READY').length;
        return osReady + rdoReady;
    }, [workOrders, dailyReports]);

    return (
        <div className="space-y-4 pb-4">
            {/* Section Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                    { key: 'os', label: 'Ordens', icon: Briefcase },
                    { key: 'rdo', label: 'RDO', icon: FileText },
                    { key: 'timesheet', label: 'Ponto', icon: Clock },
                    { key: 'sync', label: 'Sync', icon: RefreshCw, badge: pendingCount },
                ].map(({ key, label, icon: Icon, badge }) => (
                    <button
                        key={key}
                        onClick={() => {
                            setWorkSection(key);
                            setWorkScreen({ view: 'list', id: null });
                        }}
                        className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${workSection === key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                        {badge > 0 && (
                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {workSection === 'os' && (
                <>
                    {workScreen.view === 'list' && (
                        <WorkOrdersList
                            workOrders={workOrders}
                            onSelectOs={(id) => setWorkScreen({ view: 'detail', id })}
                        />
                    )}
                    {workScreen.view === 'detail' && selectedOs && (
                        <WorkOrderDetail
                            os={selectedOs}
                            onBack={() => setWorkScreen({ view: 'list', id: null })}
                            onToggleChecklist={toggleChecklistItem}
                            onStart={startOs}
                            onPause={pauseOs}
                            onResume={resumeOs}
                            onFinish={finishOs}
                            onAddPhotos={addEvidencePhotos}
                            onRemovePhoto={removeEvidencePhoto}
                            onOpenIncident={openIncidentForOs}
                            onSetSignature={setSignature}
                            canConclude={canConcludeOs}
                            onConclude={concludeOs}
                        />
                    )}
                </>
            )}

            {workSection === 'rdo' && (
                <div className="bg-white rounded-xl shadow-md p-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Relatório Diário de Obra
                    </h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Início Turno</label>
                                <input
                                    type="time"
                                    value={rdoDraft.shiftStart}
                                    onChange={(e) => setRdoDraft({ ...rdoDraft, shiftStart: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fim Turno</label>
                                <input
                                    type="time"
                                    value={rdoDraft.shiftEnd}
                                    onChange={(e) => setRdoDraft({ ...rdoDraft, shiftEnd: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Atividades Realizadas</label>
                            <textarea
                                value={rdoDraft.activities}
                                onChange={(e) => setRdoDraft({ ...rdoDraft, activities: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 h-24"
                                placeholder="Descreva as atividades..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                            <textarea
                                value={rdoDraft.notes}
                                onChange={(e) => setRdoDraft({ ...rdoDraft, notes: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 h-16"
                                placeholder="Notas adicionais..."
                            />
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={rdoDraft.safetyChecklistOk}
                                onChange={(e) => setRdoDraft({ ...rdoDraft, safetyChecklistOk: e.target.checked })}
                                className="rounded"
                            />
                            <span className="text-sm text-gray-700">Checklist de segurança OK</span>
                        </label>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fotos</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {rdoDraft.photos.map((photo) => (
                                    <div key={photo.id} className="relative">
                                        <img src={photo.dataUrl} alt="" className="w-16 h-16 object-cover rounded" />
                                        <button
                                            onClick={() => removeRdoPhoto(photo.id)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                <Camera className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-500">Adicionar fotos</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => addRdoPhotos(e.target.files)}
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assinatura Colaborador</label>
                            <SignaturePad
                                value={rdoDraft.workerSignature}
                                onChange={(sig) => setRdoDraft({ ...rdoDraft, workerSignature: sig })}
                            />
                        </div>

                        <button
                            onClick={submitRdo}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                        >
                            Registrar RDO
                        </button>
                    </div>
                </div>
            )}

            {workSection === 'timesheet' && (
                <TimesheetView isOnBase={isOnBase} setIsOnBase={setIsOnBase} />
            )}

            {workSection === 'sync' && (
                <div className="bg-white rounded-xl shadow-md p-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        Sincronização
                    </h3>

                    <div className="text-center py-6">
                        <p className="text-gray-600 mb-4">
                            {pendingCount > 0
                                ? `${pendingCount} item(ns) aguardando sincronização`
                                : 'Todos os dados estão sincronizados'}
                        </p>
                        <button
                            onClick={syncNow}
                            disabled={pendingCount === 0}
                            className={`px-6 py-3 rounded-lg font-semibold ${pendingCount > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            <RefreshCw className="w-5 h-5 inline mr-2" />
                            Sincronizar Agora
                        </button>
                    </div>

                    {syncLog.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Histórico</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {syncLog.slice(0, 5).map((log) => (
                                    <div key={log.id} className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-gray-600">{log.message}</span>
                                        <span className="text-xs text-gray-400 ml-auto">{formatTimeBR(log.ts)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Incident Modal */}
            {showIncidentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                Registrar Incidente
                            </h3>
                            <button onClick={() => setShowIncidentModal(false)} className="text-gray-500 text-xl">
                                ×
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    value={incidentDraft.title}
                                    onChange={(e) => setIncidentDraft({ ...incidentDraft, title: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Breve descrição..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
                                <select
                                    value={incidentDraft.severity}
                                    onChange={(e) => setIncidentDraft({ ...incidentDraft, severity: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="critica">Crítica</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    value={incidentDraft.description}
                                    onChange={(e) => setIncidentDraft({ ...incidentDraft, description: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 h-24"
                                    placeholder="Detalhes do incidente..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fotos</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {incidentDraft.photos.map((photo) => (
                                        <img key={photo.id} src={photo.dataUrl} alt="" className="w-16 h-16 object-cover rounded" />
                                    ))}
                                </div>
                                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-500">Adicionar fotos</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => addIncidentPhotos(e.target.files)}
                                    />
                                </label>
                            </div>
                            <button
                                onClick={submitIncident}
                                className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600"
                            >
                                Registrar Incidente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
