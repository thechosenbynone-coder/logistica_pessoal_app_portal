import React, { forwardRef } from 'react'
import { cn } from './ui.js'

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
        className
      )}
      {...props}
    />
  )
})

export default Input
