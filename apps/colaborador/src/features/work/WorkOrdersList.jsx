import React from 'react';
import { Briefcase, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { formatDateBR } from '../../utils';

/**
 * Get status chip for work order.
 */
function getOsStatusChip(os) {
    switch (os.status) {
        case 'RECEIVED':
            return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Recebida' };
        case 'IN_PROGRESS':
            return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Em Progresso' };
        case 'COMPLETED':
            return { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluída' };
        case 'CONCLUDED':
            return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Finalizada' };
        default:
            return { bg: 'bg-gray-100', text: 'text-gray-700', label: os.status };
    }
}

/**
 * Count completed checklist items.
 */
function countChecklistDone(items = []) {
    return items.filter((i) => i.done).length;
}

/**
 * WorkOrdersList - List of work orders.
 */
export function WorkOrdersList({ workOrders, onSelectOs }) {
    if (workOrders.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma ordem de serviço</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {workOrders.map((os) => {
                const status = getOsStatusChip(os);
                const safetyDone = countChecklistDone(os.safetyChecklist);
                const execDone = countChecklistDone(os.executionChecklist);

                return (
                    <button
                        key={os.id}
                        onClick={() => onSelectOs(os.id)}
                        className="w-full bg-white rounded-xl shadow-md p-4 text-left hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <span className="text-xs text-gray-500 font-mono">{os.code}</span>
                                <h4 className="font-semibold text-gray-800">{os.title}</h4>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                                {status.label}
                            </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{os.destination}</p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Segurança: {safetyDone}/{os.safetyChecklist.length}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Execução: {execDone}/{os.executionChecklist.length}
                                </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
