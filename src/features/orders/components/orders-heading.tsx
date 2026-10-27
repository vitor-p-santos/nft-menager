import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import arrowBack from '@/assets/icons/arrow-back.svg'

/** Voltar (topo mobile): histórico quando possível; senão, `fallback`. */
function BackButton({ fallback }: { fallback: '/' | '/atividade' }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: fallback }))}
      className="absolute left-0 flex size-[35px] cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised"
    >
      <img src={arrowBack} alt="" width={13} height={7} className="rotate-90" />
    </button>
  )
}

type OrdersHeadingProps = {
  /** Título da página (h1): visível no topo mobile, só para leitores de tela no desktop. */
  title: string
  /** Página do pedido: a trilha passa por "Atividade" e o voltar cai nela. */
  order?: boolean
}

/**
 * Cabeçalho das telas de pedidos (sem frame no Figma, D-03): repete o do carrinho, com a trilha
 * "Início / Atividade / Pedido" no desktop e voltar + título centralizado no mobile.
 */
export function OrdersHeading({ title, order = false }: OrdersHeadingProps) {
  const link = 'rounded-sm hover:text-text-accent'
  return (
    <>
      <nav aria-label="Trilha de navegação" className="hidden pt-8 md:block">
        <ol className="flex gap-1 text-body-md leading-4 font-bold text-foreground">
          <li>
            <Link to="/" className={link}>
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          {order ? (
            <>
              <li>
                <Link to="/atividade" className={link}>
                  Atividade
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page">Pedido</li>
            </>
          ) : (
            <li aria-current="page">Atividade</li>
          )}
        </ol>
      </nav>
      <div className="relative flex h-[35px] items-center justify-center md:hidden">
        <BackButton fallback={order ? '/atividade' : '/'} />
        <h1 className="text-title-sm leading-6 font-bold text-foreground">{title}</h1>
      </div>
      <h1 className="sr-only max-md:hidden">{title}</h1>
    </>
  )
}
