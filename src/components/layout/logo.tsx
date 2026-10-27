import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/** Wordmark KURIO (Body/14 Bold, letter-spacing 10%). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('text-body leading-normal font-bold tracking-[0.1em] text-foreground', className)}>
      KURIO
    </Link>
  )
}
