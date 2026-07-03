import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
}

export function Button({ variant = 'default', className, ...props }: ButtonProps) {
  const variants = {
    default: 'bg-foreground text-warm hover:opacity-90',
    outline: 'border border-border bg-card hover:bg-warm/60 text-foreground',
    ghost: 'hover:bg-warm/60 text-muted-foreground hover:text-foreground',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
