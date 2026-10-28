import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { CATALOG_SECTION_ID } from './search'

/**
 * Ação dos estados vazios (carrinho, pagamento, atividade, lista de interesse): leva ao catálogo
 * da Home. O rótulo padrão é "Explorar o mercado"; o detalhe do NFT usa "Voltar ao catálogo".
 */
export function ExploreLink({ children = 'Explorar o mercado' }: { children?: string }) {
  return (
    <Link to="/" hash={CATALOG_SECTION_ID} className={buttonVariants({ size: 'lg' })}>
      {children}
    </Link>
  )
}
