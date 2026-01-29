import React from 'react'
import { cn } from './ui.js'

export default function Card({ className, children }) {
  return (
    <div className={cn('bg-white rounded-xl shadow-md', className)}>
      {children}
    </div>
  )
}
