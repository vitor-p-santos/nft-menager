import { Link } from '@tanstack/react-router'
import deleteAccentIcon from '@/assets/icons/delete-accent.svg'
import deleteIcon from '@/assets/icons/delete.svg'
import { Skeleton } from '@/components/feedback/skeleton'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { formatEthLabel } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { CartItemActions } from '../hooks/use-cart-item-actions'
import type { CartItem } from '../schemas/cart'
import { ResponsiveImage } from '@/components/ui/responsive-image'

/**
 * Larguras das colunas do Figma ("Cart Table", 782px): os blocos de 250/77/75/87/24px ficam
 * distribuídos com `justify-between` (sobra de 61,25px entre eles) e 24px de respiro à direita.
 */
const COLS = ['w-[311.25px]', 'w-[138.25px]', 'w-[136.25px]', 'w-[147.25px]', 'w-12']

/** Aviso do servidor sobre o item (T-052): preço alterado, indisponível ou quantidade reduzida. */
export function CartItemIssue({ item, className }: { item: CartItem; className?: string }) {
  if (!item.issue) return null
  const text = {
    price_changed: `Preço alterado: era ${formatEthLabel(item.unitPriceWei)}`,
    unavailable: 'Indisponível: remova para continuar',
    quantity_reduced: `Quantidade ajustada ao estoque (${item.available})`,
  }[item.issue]
  return (
    <p className={cn('text-caption leading-4 font-bold', item.issue === 'unavailable' ? 'text-destructive' : 'text-text-accent', className)}>
      {text}
    </p>
  )
}

function ItemLink({ item, className }: { item: CartItem; className?: string }) {
  return (
    <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className={cn('rounded-sm hover:text-text-accent', className)}>
      {item.nft.name}
    </Link>
  )
}

function RemoveButton({ item, actions, icon, className }: { item: CartItem; actions: CartItemActions; icon: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Remover ${item.nft.name} do carrinho`}
      data-cart-remove={item.id}
      disabled={actions.isPending(item)}
      onClick={() => actions.removeItem(item)}
      className={cn('flex size-6 cursor-pointer items-center justify-center rounded-sm disabled:cursor-wait disabled:opacity-50', className)}
    >
      <img src={icon} alt="" width={17.65} height={19.98} />
    </button>
  )
}

function Stepper({ item, actions, size }: { item: CartItem; actions: CartItemActions; size: 'row' | 'round' }) {
  return (
    <QuantityStepper
      size={size}
      itemName={item.nft.name}
      value={actions.displayQuantity(item)}
      max={item.issue === 'unavailable' ? 0 : item.available}
      disabled={actions.isPending(item)}
      onChange={(quantity) => actions.changeQuantity(item, quantity)}
    />
  )
}

/** Desktop (Figma "Cart Table"): tabela real, com linhas de 70px em Surface Card. */
export function CartTable({ items, actions }: { items: CartItem[]; actions: CartItemActions }) {
  // Linha de 0,3px (Figma "Line 2") sob o cabeçalho: borda das células (spacing-x é 0)
  const head = 'border-b-[0.3px] border-primary p-0 pb-3 text-left text-body-lg leading-4 text-foreground'
  return (
    <table className="w-[782px] table-fixed border-separate border-spacing-y-3 -my-3">
      <caption className="sr-only">Itens do carrinho</caption>
      <colgroup>
        {COLS.map((width) => (
          <col key={width} className={width} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={cn(head, 'font-bold')}>NFTs</th>
          <th scope="col" className={cn(head, 'font-medium')}>Preço</th>
          <th scope="col" className={cn(head, 'font-bold')}>Edições</th>
          <th scope="col" className={cn(head, 'font-medium')}>Total</th>
          <th scope="col" className={head}>
            <span className="sr-only">Remover</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const unavailable = item.issue === 'unavailable'
          return (
            <tr key={item.id} aria-busy={actions.isPending(item)} className="bg-card">
              <th scope="row" aria-label={item.nft.name} className="h-[70px] p-0 text-left font-normal">
                <div className={cn('flex items-center gap-4', unavailable && 'opacity-60')}>
                  <ResponsiveImage
                    src={item.nft.image.src}
                    sizes="100px"
                    alt=""
                    width={70}
                    height={70}
                    loading="lazy"
                    className="size-[70px] shrink-0 rounded-md object-cover"
                  />
                  <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                    <ItemLink item={item} className="truncate text-body-lg font-bold text-foreground" />
                    <span className="text-body text-secondary">ID do token: {item.nft.tokenId}</span>
                    <span className="sr-only">Edição {item.edition}</span>
                    <CartItemIssue item={item} />
                  </div>
                </div>
              </th>
              <td className="p-0 text-body-lg leading-4 font-bold text-text-secondary">{formatEthLabel(item.currentPriceWei)}</td>
              <td className="p-0">
                <Stepper item={item} actions={actions} size="row" />
              </td>
              <td className="p-0 text-body-lg leading-4 font-bold text-text-accent">{formatEthLabel(item.lineTotalWei)}</td>
              <td className="p-0">
                <RemoveButton item={item} actions={actions} icon={deleteIcon} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Mobile e tablet (Figma "Cart Items" mobile): cards de 100px com arte à esquerda. */
export function CartCards({ items, actions }: { items: CartItem[]; actions: CartItemActions }) {
  return (
    <ul aria-label="Itens do carrinho" className="flex flex-col gap-5">
      {items.map((item) => (
        <li
          key={item.id}
          aria-busy={actions.isPending(item)}
          className="relative flex min-h-[100px] rounded-[14px] bg-card shadow-cart-card"
        >
          <ResponsiveImage
            src={item.nft.image.src}
            sizes="100px"
            alt=""
            width={100}
            height={100}
            loading="lazy"
            className={cn('size-[100px] shrink-0 rounded-[14px] object-cover', item.issue === 'unavailable' && 'opacity-60')}
          />
          <div className="flex min-w-0 flex-1 flex-col py-[13px] pr-3 pl-[9px] leading-4">
            <ItemLink item={item} className="truncate pr-8 text-body-md font-bold text-foreground" />
            <span className="mt-1.5 text-body text-text-secondary">Edição: {item.edition}</span>
            <CartItemIssue item={item} className="mt-1" />
            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-2">
              <span className="text-lead font-bold text-text-accent">
                <span className="sr-only">Total: </span>
                {formatEthLabel(item.lineTotalWei)}
              </span>
              <Stepper item={item} actions={actions} size="round" />
            </div>
          </div>
          <RemoveButton item={item} actions={actions} icon={deleteAccentIcon} className="absolute top-2.5 right-3" />
        </li>
      ))}
    </ul>
  )
}

/** Skeleton com a geometria das linhas (desktop) e dos cards (mobile/tablet). */
export function CartItemsSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex flex-col gap-5 xl:hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-[100px] gap-[9px] rounded-[14px] bg-card">
            <Skeleton className="size-[100px] rounded-[14px]" />
            <div className="flex flex-1 flex-col gap-2 py-[13px] pr-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-auto h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden w-[782px] flex-col gap-3 xl:flex">
        <Skeleton className="h-4 w-full" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-[70px] items-center gap-4 bg-card pr-6">
            <Skeleton className="size-[70px] rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
