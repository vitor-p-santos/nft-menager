import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Placeholder com shimmer; respeita prefers-reduced-motion via globals.css. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,var(--accent)_50%,var(--muted)_100%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}
