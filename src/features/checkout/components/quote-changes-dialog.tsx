import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Quote } from '../schemas/checkout'
import { describeChange } from './quote-change-text'

type QuoteChangesDialogProps = {
  quote: Quote | null
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
}

/**
 * Revalidação pré-compra (T-072): o servidor ajustou o pedido (preço, estoque, cupom ou taxa).
 * Mostra a diferença e o novo total e só segue com uma nova confirmação explícita. Sem frame no
 * Figma: usa o mesmo cartão dos modais (Surface Card, faixa âmbar de 10px na base).
 */
export function QuoteChangesDialog({ quote, onConfirm, onCancel, confirming }: QuoteChangesDialogProps) {
  return (
    <Dialog open={quote !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[500px] flex-col gap-0 overflow-y-auto rounded-none border-0 border-b-[10px] border-primary bg-surface-card px-6 pt-8 pb-8 sm:max-w-[500px] md:px-10"
      >
        <DialogTitle className="text-center text-title-sm leading-7 font-bold text-text-accent">O seu pedido mudou</DialogTitle>
        <DialogDescription className="mt-3 text-center text-body leading-[22px] text-text-secondary">
          Revalidamos preço, estoque, cupom e taxa antes da compra. Confira as mudanças e confirme de novo.
        </DialogDescription>
        {quote && (
          <>
            <ul className="mt-6 flex flex-col gap-3 text-body leading-[22px] text-foreground">
              {quote.changes.map((change, index) => (
                <li key={index} className="border-l-2 border-primary pl-3">
                  {describeChange(change)}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-baseline justify-between gap-2 border-t-[0.3px] border-primary pt-3 text-body-lg leading-5 font-bold text-foreground">
              <span>Novo total</span>
              <span className="text-lead text-text-accent">{formatEthLabel(quote.totals.totalWei)}</span>
            </p>
          </>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={onConfirm} disabled={confirming} className="w-full">
            Confirmar com os novos valores
          </Button>
          <Button size="lg" variant="outline" onClick={onCancel} disabled={confirming} className="w-full">
            Revisar o pedido
          </Button>
          <Link to="/carrinho" className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'self-center rounded-sm text-body-md')}>
            Voltar ao carrinho
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
