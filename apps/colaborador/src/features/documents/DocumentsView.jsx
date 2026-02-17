import React from 'react';
import { ExternalLink, FileText, GraduationCap } from 'lucide-react';
import { formatDateBR } from '../../utils';

export function DocumentsView({ documents = [], trainings = [] }) {
  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-xl bg-white p-4 shadow-md">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <FileText className="h-5 w-5 text-blue-600" /> Documentações e Certificações
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum documento disponível.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.fileUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{doc.title || doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {doc.category || 'documento'}
                    {doc.expiryDate ? ` • Validade: ${formatDateBR(doc.expiryDate)}` : ''}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-md">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <GraduationCap className="h-5 w-5 text-purple-600" /> Treinamentos
        </h3>
        {trainings.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum treinamento programado.</p>
        ) : (
          <div className="space-y-2">
            {trainings.map((training) => (
              <div key={training.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">{training.title}</p>
                <p className="text-xs text-slate-500">
                  {formatDateBR(training.date)} • {training.location || 'Local a definir'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
