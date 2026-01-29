import React from 'react';
import {
    User,
    Shield,
    Phone,
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    Download,
    Package,
    History,
    ChevronRight,
} from 'lucide-react';

/**
 * Helper to get document status color classes.
 */
function getDocumentStatusColor(status) {
    switch (status) {
        case 'expired':
            return 'bg-red-100 text-red-700 border-red-300';
        case 'warning':
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'valid':
            return 'bg-green-100 text-green-700 border-green-300';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-300';
    }
}

/**
 * Helper to get document status text.
 */
function getDocumentStatusText(doc) {
    if (!doc.expiryDate) return 'Válido';
    if (doc.status === 'expired') return 'VENCIDO';
    if (doc.status === 'warning') return `Vence em ${doc.daysToExpiry} dias`;
    return 'Válido';
}

/**
 * ProfileTab - Profile view with documents, contacts, and navigation to equipment/history.
 */
export function ProfileTab({
    employee,
    personalDocuments,
    emergencyContacts,
    onNavigateToEquipment,
    onNavigateToHistory,
}) {
    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    return (
        <div className="space-y-4 pb-4">
            {/* User Profile Card */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-4 mb-4">
                    <img
                        src={employee.photo}
                        alt={employee.name}
                        className="w-16 h-16 rounded-full border-2 border-blue-600"
                    />
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{employee.name}</h2>
                        <p className="text-sm text-gray-600">Matrícula: {employee.registration}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onNavigateToEquipment}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Equipamentos</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    <button
                        onClick={onNavigateToHistory}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Histórico</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Personal Documents */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Documentos Pessoais
                </h3>

                <div className="space-y-3">
                    {personalDocuments.map((doc, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-gray-800">{doc.name}</p>
                                    {doc.status === 'expired' && (
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                    {doc.status === 'warning' && (
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    )}
                                    {doc.status === 'valid' && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                {doc.expiryDate && (
                                    <p className="text-xs text-gray-500">Validade: {doc.expiryDate}</p>
                                )}
                            </div>
                            <span
                                className={`text-xs font-medium px-2 py-1 rounded-full border ${getDocumentStatusColor(
                                    doc.status
                                )}`}
                            >
                                {getDocumentStatusText(doc)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-red-600" />
                    Contatos de Emergência
                </h3>

                <div className="space-y-3">
                    {emergencyContacts.map((contact, index) => (
                        <button
                            key={index}
                            onClick={() => handleCall(contact.phone)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                            <div>
                                <p className="font-medium text-gray-800">{contact.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{contact.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-blue-600 font-medium">{contact.phone}</span>
                                <Phone className="w-4 h-4 text-blue-600" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
