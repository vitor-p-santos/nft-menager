import type { ReactNode } from 'react'
import { Button } from './button'
import { buttonVariants } from './button-variants'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './dialog'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  /** Ação em andamento: desabilita a confirmação. */
  busy?: boolean
}

/**
 * Confirmação de ação destrutiva (ex.: remover carteira). Sem frame no Figma: segue o diálogo
 * "O seu pedido mudou" do checkout (Surface Card, faixa âmbar de 10px, título âmbar centralizado).
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, busy }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[440px] flex-col gap-0 rounded-none border-0 border-b-[10px] border-primary bg-surface-card px-6 pt-8 pb-8 sm:max-w-[440px] md:px-10"
      >
        <DialogTitle className="text-center text-title-sm leading-7 font-bold text-text-accent">{title}</DialogTitle>
        <DialogDescription className="mt-3 text-center text-body leading-[22px] text-text-secondary">{description}</DialogDescription>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button size="lg" className="w-full" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <DialogClose className={buttonVariants({ variant: 'link', size: 'none', className: 'rounded-sm text-body-md' })}>
            Cancelar
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
