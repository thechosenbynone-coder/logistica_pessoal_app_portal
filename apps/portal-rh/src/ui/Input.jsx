import React, { forwardRef } from 'react'
import { cn } from './ui.js'

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 placeholder:text-slate-500',
        className
      )}
      {...props}
    />
  )
})

export default Input
