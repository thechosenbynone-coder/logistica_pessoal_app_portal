import React from 'react'
import { cn } from './ui.js'

export default function Button({ variant = 'primary', className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500',
    secondary: 'bg-slate-900/50 text-slate-200 border border-slate-700/60 hover:bg-slate-800/60',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60'
  }
  return (
    <button className={cn(base, styles[variant] || styles.primary, className)} {...props} />
  )
}
