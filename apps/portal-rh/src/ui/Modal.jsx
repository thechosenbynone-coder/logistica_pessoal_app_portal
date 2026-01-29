import React from 'react'
import { X } from 'lucide-react'
import { cn } from './ui.js'

export default function Modal({ open, title, children, onClose, className }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]', className)}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold text-gray-900">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
