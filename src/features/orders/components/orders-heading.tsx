import { Breadcrumbs, PageHeading } from '@/components/layout/page-heading'

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
  return (
    <>
      <Breadcrumbs
        className="hidden pt-8 md:block"
        items={
          order
            ? [{ label: 'Início', to: '/' }, { label: 'Atividade', to: '/atividade' }, { label: 'Pedido' }]
            : [{ label: 'Início', to: '/' }, { label: 'Atividade' }]
        }
      />
      <PageHeading title={title} fallback={{ to: order ? '/atividade' : '/' }} />
    </>
  )
}
