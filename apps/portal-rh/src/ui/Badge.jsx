import React from 'react'
import { cn } from './ui.js'

export default function Badge({ tone = 'gray', className, children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700'
  }
  return (
    <span className={cn('text-xs font-semibold px-3 py-1 rounded-full', tones[tone] || tones.gray, className)}>
      {children}
    </span>
  )
}
