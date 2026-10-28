import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { NETWORK_LABELS } from '@/entities/nft'
import { rejectionTitle, type Order } from '@/entities/order'
import { OrderReceipt } from '@/entities/order/order-receipt'
import {
  MyOrdersLink,
  ORDER_STATUS_TITLE_CLASS,
  OrderStatusMessage,
  RejectedOrderActions,
  ThankYouArt,
} from '@/entities/order/order-status-panel'
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
 *   dá para fechar: o status chega do servidor (evento `order.updated`, com polling de reserva).
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
            <ThankYouArt />
            <DialogTitle className={cn('mt-[18px] mb-[22px] px-6 text-center', ORDER_STATUS_TITLE_CLASS)}>
              Seus NFTs agora estão na sua carteira
            </DialogTitle>
            <DialogDescription className="sr-only">Recibo do pedido confirmado</DialogDescription>
            <div className="flex flex-col pb-8 md:pb-0">
              <OrderReceipt order={order} />
              {/* Fora do frame do Figma: leva à lista de pedidos ("Atividade", T-082), onde o recibo fica guardado */}
              <MyOrdersLink className="mt-6 self-center" />
            </div>
          </>
        )}

        {order?.status === 'pending' && (
          <OrderStatusMessage status="pending" as="output" className="pb-10">
            <DialogTitle className={ORDER_STATUS_TITLE_CLASS}>
              Aguardando a confirmação da rede
            </DialogTitle>
            <DialogDescription className="text-body leading-[22px] text-text-secondary">
              O pedido foi criado e o pagamento está sendo processado na {NETWORK_LABELS[order.network]}. Isso leva
              alguns segundos; você pode recarregar a página que o pedido continua sendo acompanhado.
            </DialogDescription>
          </OrderStatusMessage>
        )}

        {order?.status === 'rejected' && (
          <OrderStatusMessage status="rejected" role="alert" className="pb-10">
            <DialogTitle className={ORDER_STATUS_TITLE_CLASS}>{rejectionTitle(order)}</DialogTitle>
            <DialogDescription className="text-body leading-[22px] text-text-secondary">
              {order.rejectionReason ?? 'A carteira recusou o pagamento. Nenhum valor foi cobrado e os seus itens continuam no carrinho.'}
            </DialogDescription>
            <RejectedOrderActions
              retry={
                <Button size="lg" onClick={onCloseRejected}>
                  Tentar novamente
                </Button>
              }
            />
          </OrderStatusMessage>
        )}
      </DialogContent>
    </Dialog>
  )
}
