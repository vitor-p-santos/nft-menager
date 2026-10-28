import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Abas (shadcn/ui sobre Radix): setas do teclado, `aria-selected` e `aria-controls` vêm do Radix.
 * Visual do Figma (Detalhes do NFT → Description): ativa em Body Large/17 Bold âmbar com
 * sublinhado de 3px; inativa em Body Large/17 Regular; linha de 0,3px sob a lista.
 */
function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex gap-8 overflow-x-auto border-b-[0.3px] border-primary', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'flex shrink-0 cursor-pointer flex-col gap-3 text-left text-body-xl leading-4 whitespace-nowrap text-foreground',
        "after:h-[3px] after:w-full after:bg-transparent after:content-['']",
        'data-[state=active]:font-bold data-[state=active]:text-text-accent data-[state=active]:after:bg-primary',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('pt-3 focus-visible:outline-none', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
