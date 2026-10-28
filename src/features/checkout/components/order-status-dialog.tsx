import { Link } from '@tanstack/react-router'
import { CircleAlertIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import thankYou from '@/assets/decor/thank-you.png'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { NETWORK_LABELS } from '@/entities/nft'
import type { Order } from '@/entities/order'
import { OrderReceipt } from '@/entities/order/order-receipt'
import { cn } from '@/lib/utils'

type OrderStatusDialogProps = {
  order: Order | null
  /** Fecha o recibo (`confirmed`): a página leva o usuário para fora do checkout. */
  onCloseConfirmed: () => void
  /** Fecha o aviso de recusa: volta ao formulário (o carrinho continua intacto). */
  onCloseRejected: () => void
}

/**
 * Estado do pedido depois de "Confirmar compra" (T-074, D-02/D-03):
 * - `confirmed`: Order Confirmation Modal (`70376:239`, 578px, Surface Card, faixa âmbar de 10px);
 *   no mobile vira uma página em tela cheia com o mesmo conteúdo (D-02);
 * - `pending` e `rejected`: o mesmo layout, trocando ícone e mensagem (D-03). Enquanto pendente não
 *   dá para fechar: o status chega do servidor (polling até o socket da Fase 8).
 * A confirmação só aparece quando a API devolve `confirmed`.
 */
export function OrderStatusDialog({ order, onCloseConfirmed, onCloseRejected }: OrderStatusDialogProps) {
  const status = order?.status
  const close = status === 'confirmed' ? onCloseConfirmed : onCloseRejected

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && status !== 'pending' && close()}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => status === 'pending' && event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        aria-busy={status === 'pending'}
        className={cn(
          'flex flex-col gap-0 overflow-y-auto rounded-none border-0 bg-surface-card p-0 pt-[22px]',
          // Mobile: página em tela cheia (D-02); desktop: modal de 578px com a faixa âmbar
          'max-md:top-0 max-md:left-0 max-md:h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0',
          'md:max-h-[calc(100dvh-2rem)] md:w-[578px] md:max-w-[578px] md:border-b-[10px] md:border-primary md:pb-12',
        )}
      >
        {status !== 'pending' && (
          <DialogClose className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-sm text-primary">
            <XIcon aria-hidden className="size-5" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        )}

        {order?.status === 'confirmed' && (
          <>
            <img src={thankYou} alt="" width={68} height={84} className="mx-auto" />
            <DialogTitle className="mt-[18px] mb-[22px] px-6 text-center text-body-lg leading-5 font-bold text-text-secondary">
              Seus NFTs agora estão na sua carteira
            </DialogTitle>
            <DialogDescription className="sr-only">Recibo do pedido confirmado</DialogDescription>
            <div className="flex flex-col pb-8 md:pb-0">
              <OrderReceipt order={order} />
              {/* Fora do frame do Figma: leva à lista de pedidos ("Atividade", T-082), onde o recibo fica guardado */}
              <Link
                to="/atividade"
                className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'mt-6 self-center rounded-sm text-body-md')}
              >
                Ver meus pedidos
              </Link>
            </div>
          </>
        )}

        {order?.status === 'pending' && (
          <output className="flex flex-col items-center gap-5 px-6 pt-6 pb-10 text-center md:px-14">
            <LoaderCircleIcon aria-hidden className="size-16 text-primary motion-safe:animate-spin" />
            <DialogTitle className="text-body-lg leading-5 font-bold text-text-secondary">
              Aguardando a confirmação da rede
            </DialogTitle>
            <DialogDescription className="text-body leading-[22px] text-text-secondary">
              O pedido foi criado e o pagamento está sendo processado na {NETWORK_LABELS[order.network]}. Isso leva
              alguns segundos; você pode recarregar a página que o pedido continua sendo acompanhado.
            </DialogDescription>
          </output>
        )}

        {order?.status === 'rejected' && (
          <div role="alert" className="flex flex-col items-center gap-5 px-6 pt-6 pb-10 text-center md:px-14">
            <CircleAlertIcon aria-hidden className="size-16 text-destructive" />
            <DialogTitle className="text-body-lg leading-5 font-bold text-text-secondary">
              Pagamento recusado
            </DialogTitle>
            <DialogDescription className="text-body leading-[22px] text-text-secondary">
              {order.rejectionReason ?? 'A carteira recusou o pagamento. Nenhum valor foi cobrado e os seus itens continuam no carrinho.'}
            </DialogDescription>
            <div className="mt-3 flex w-full flex-col items-center gap-3">
              <Button size="lg" onClick={onCloseRejected}>
                Tentar novamente
              </Button>
              <Link to="/carrinho" className={cn(buttonVariants({ variant: 'link', size: 'none' }), 'rounded-sm text-body-md')}>
                Voltar ao carrinho
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
