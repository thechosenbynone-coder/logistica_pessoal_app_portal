import React from 'react'
import { cn } from './ui.js'

export default function Card({ className, children }) {
  return (
    <div className={cn('bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-2xl transition-all', className)}>
      {children}
    </div>
  )
}
