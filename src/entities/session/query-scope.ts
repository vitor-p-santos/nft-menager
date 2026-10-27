import type { QueryKey } from '@tanstack/react-query'

/**
 * Raízes de query key com dados PÚBLICOS (iguais para qualquer conta): catálogo/NFTs (`['nfts', ...]`)
 * e conteúdo editorial (`['content', ...]`). Elas sobrevivem à troca de identidade sem refetch.
 *
 * Todo o resto é tratado como privado (`['auth']`, `['me']`, `['cart']`, `['orders']`, `['checkout']`,
 * `['profile']`, `['wallets']`, ...) e sai do cache em login, logout, expiração e troca de conta.
 * Uma raiz nova é privada por padrão, o que é o lado seguro do isolamento: só entra aqui se a resposta
 * não depender do usuário nem do `X-Cart-Id`.
 */
export const PUBLIC_QUERY_ROOTS: readonly string[] = ['nfts', 'content']

export const isPublicQueryKey = (queryKey: QueryKey) =>
  typeof queryKey[0] === 'string' && PUBLIC_QUERY_ROOTS.includes(queryKey[0])

export const isPrivateQueryKey = (queryKey: QueryKey) => !isPublicQueryKey(queryKey)
