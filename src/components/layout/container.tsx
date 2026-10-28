import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Coluna de conteúdo: 1200px no desktop (margens de 120px em 1440), gutter de 24px no mobile. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1248px] px-6', className)} {...props} />
}
