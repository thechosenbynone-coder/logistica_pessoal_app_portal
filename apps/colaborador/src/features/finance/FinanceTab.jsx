import React, { useEffect, useState } from 'react';
import { Wallet, Plus, CheckCircle, Clock, X, Camera } from 'lucide-react';
import { formatDateBR, formatMoney } from '../../utils';
import { fileToDataUrl } from '../../utils/file';
import { uid } from '../../utils/id';

/**
 * FinanceTab - Expenses, advances, and reimbursements management.
 */
export function FinanceTab({
    expenses,
    advances,
    reimbursements,
    onAddExpense,
    onRequestAdvance,
    onCreateRequest,
    initialIntent = null,
    intentTick = 0,
}) {
    const [activeSection, setActiveSection] = useState('expenses');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ type: '', value: '', date: '', description: '' });
    const [newAdvance, setNewAdvance] = useState({ value: '', justification: '' });
    const [receiptPreview, setReceiptPreview] = useState(null);

    useEffect(() => {
        if (initialIntent === 'create_request') {
            setActiveSection('expenses');
            setShowExpenseModal(true);
        }
    }, [initialIntent, intentTick]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { bg: 'bg-green-100', text: 'text-green-700', label: 'Aprovado' };
            case 'pending':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' };
            case 'paid':
                return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pago' };
            case 'scheduled':
                return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Agendado' };
            case 'rejected':
                return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeitado' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.type || !newExpense.value || !newExpense.date) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        onAddExpense?.({
            id: uid('exp'),
            type: newExpense.type,
            value: parseFloat(newExpense.value),
            date: newExpense.date,
            description: newExpense.description,
            receipt: !!receiptPreview,
            status: 'pending',
            trip: 'P-74 Jan/2026',
        });
        await onCreateRequest?.('finance', {
            type: newExpense.type,
            value: parseFloat(newExpense.value),
            date: newExpense.date,
            description: newExpense.description,
        });
        setNewExpense({ type: '', value: '', date: '', description: '' });
        setReceiptPreview(null);
        setShowExpenseModal(false);
    };

    const handleRequestAdvance = async () => {
        if (!newAdvance.value || !newAdvance.justification) {
            alert('Preencha todos os campos');
            return;
        }
        onRequestAdvance?.({
            id: uid('adv'),
            value: parseFloat(newAdvance.value),
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            trip: 'P-74 Jan/2026',
            justification: newAdvance.justification,
            used: 0,
        });
        await onCreateRequest?.('finance', {
            type: 'Adiantamento',
            value: parseFloat(newAdvance.value),
            justification: newAdvance.justification,
        });
        setNewAdvance({ value: '', justification: '' });
        setShowAdvanceModal(false);
    };

    const onReceiptSelected = async (file) => {
        if (file) {
            const dataUrl = await fileToDataUrl(file);
            setReceiptPreview(dataUrl);
        }
    };

    // Calculate totals
    const totalExpenses = expenses.reduce((acc, e) => acc + e.value, 0);
    const totalApproved = expenses.filter((e) => e.status === 'approved').reduce((acc, e) => acc + e.value, 0);
    const totalAdvances = advances.reduce((acc, a) => acc + a.value, 0);
    const totalUsed = advances.reduce((acc, a) => acc + (a.used || 0), 0);

    return (
        <div className="space-y-4 pb-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <p className="text-green-100 text-xs">Despesas Aprovadas</p>
                    <p className="text-xl font-bold">{formatMoney(totalApproved)}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-blue-100 text-xs">Adiantamentos</p>
                    <p className="text-xl font-bold">{formatMoney(totalAdvances)}</p>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                    { key: 'expenses', label: 'Despesas' },
                    { key: 'advances', label: 'Adiantamentos' },
                    { key: 'reimbursements', label: 'Reembolsos' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeSection === key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-md">
                {activeSection === 'expenses' && (
                    <div>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">Minhas Despesas</h3>
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="flex items-center gap-1 text-sm text-blue-600 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Nova
                            </button>
                        </div>
                        <div className="divide-y">
                            {expenses.map((expense) => {
                                const status = getStatusBadge(expense.status);
                                return (
                                    <div key={expense.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-800">{expense.type}</p>
                                            <p className="text-xs text-gray-500">{formatDateBR(expense.date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-800">{formatMoney(expense.value)}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeSection === 'advances' && (
                    <div>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">Meus Adiantamentos</h3>
                            <button
                                onClick={() => setShowAdvanceModal(true)}
                                className="flex items-center gap-1 text-sm text-blue-600 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Solicitar
                            </button>
                        </div>
                        <div className="divide-y">
                            {advances.map((advance) => {
                                const status = getStatusBadge(advance.status);
                                return (
                                    <div key={advance.id} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-800">{formatMoney(advance.value)}</p>
                                                <p className="text-xs text-gray-500">{formatDateBR(advance.date)}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${Math.min((advance.used / advance.value) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {formatMoney(advance.used)} usado
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeSection === 'reimbursements' && (
                    <div>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-gray-800">Meus Reembolsos</h3>
                        </div>
                        <div className="divide-y">
                            {reimbursements.map((reimb) => {
                                const status = getStatusBadge(reimb.status);
                                return (
                                    <div key={reimb.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-800">{reimb.description}</p>
                                            <p className="text-xs text-gray-500">{formatDateBR(reimb.date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-600">+{formatMoney(reimb.value)}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">Nova Despesa</h3>
                            <button onClick={() => setShowExpenseModal(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    value={newExpense.type}
                                    onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Alimentação">Alimentação</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Hospedagem">Hospedagem</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newExpense.value}
                                    onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante</label>
                                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-500">
                                        {receiptPreview ? 'Foto anexada' : 'Tirar foto ou anexar'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => onReceiptSelected(e.target.files?.[0])}
                                    />
                                </label>
                            </div>
                            <button
                                onClick={handleAddExpense}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Adicionar Despesa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Advance Modal */}
            {showAdvanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">Solicitar Adiantamento</h3>
                            <button onClick={() => setShowAdvanceModal(false)}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newAdvance.value}
                                    onChange={(e) => setNewAdvance({ ...newAdvance, value: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Justificativa</label>
                                <textarea
                                    value={newAdvance.justification}
                                    onChange={(e) => setNewAdvance({ ...newAdvance, justification: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2 h-24"
                                    placeholder="Descreva o motivo da solicitação..."
                                />
                            </div>
                            <button
                                onClick={handleRequestAdvance}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Enviar Solicitação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
