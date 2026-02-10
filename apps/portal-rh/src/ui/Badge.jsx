import React from 'react'
import { cn } from './ui.js'

export default function Badge({ tone = 'gray', className, children }) {
  const tones = {
    gray: 'bg-slate-900/40 text-slate-300 border border-slate-700/50',
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    yellow: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    red: 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
  }
  return (
    <span className={cn('text-xs font-semibold px-3 py-1 rounded-full', tones[tone] || tones.gray, className)}>
      {children}
    </span>
  )
}
