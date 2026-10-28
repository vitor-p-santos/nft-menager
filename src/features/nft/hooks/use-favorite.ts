import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useRef } from 'react'
import { useTimedAnnouncement } from '@/components/feedback/use-timed-announcement'
import { takePendingAction, useCurrentUser, type PendingAction } from '@/entities/session'
import { ApiError } from '@/lib/api'
import { favoritesQueries, useToggleFavorite } from '../api/queries'

/** O convite para entrar tem link: fica mais tempo para dar tempo de chegar nele pelo teclado. */
const LOGIN_FEEDBACK_MS = 10_000

/** Mensagem do balão; `loginRedirect` transforma "Entre para favoritar" em link para `/entrar`. */
export type FavoriteFeedback = { message: string; loginRedirect?: string }

/**
 * Estado e ação de favoritar um NFT. Sem sessão a API responde 401: a ação fica pendente
 * (entities/session) e o usuário recebe "Entre para favoritar" num `aria-live`, com link para
 * `/entrar?redirect=` (a página de login também serve no desktop, além do botão "Entrar" do header). Depois do login
 * (que volta à rota de origem), o primeiro botão do mesmo NFT a montar com sessão conclui a ação.
 */
export function useFavorite(nftId: string, nftName: string) {
  const user = useCurrentUser()
  // Sem sessão não há lista a buscar (a API responderia 401 em todo card); o 401 do clique vem da mutation
  const favorites = useQuery({ ...favoritesQueries.list(), enabled: user !== null })
  const toggle = useToggleFavorite()
  const href = useRouterState({ select: (state) => state.location.href })
  const [feedback, setTimedFeedback] = useTimedAnnouncement<FavoriteFeedback>()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const announce = useCallback(
    (message: string, loginRedirect?: string) =>
      setTimedFeedback({ message, loginRedirect }, loginRedirect ? LOGIN_FEEDBACK_MS : undefined),
    [setTimedFeedback],
  )

  // Conclui o favoritar pendente quando há sessão (takePendingAction lê e limpa de uma vez:
  // se o NFT aparece em mais de um botão, só o primeiro executa). PUT é idempotente.
  // Só um botão visível conclui: o detalhe monta o coração do hero mobile e o "Favoritar" do desktop
  // ao mesmo tempo (um deles em `display: none`), e o anúncio tem de sair no balão que se vê.
  // Espera a lista de favoritos da conta nova chegar: logo depois do login o `resetUserData` cancela e
  // reseta as queries privadas (a lista inclusive). Um PUT disparado antes disso teria o update otimista
  // apagado pelo reset e o botão piscaria "não favoritado" até a invalidação final.
  const favoritesReady = favorites.isSuccess && !favorites.isFetching
  const mutateFavorite = toggle.mutate
  useEffect(() => {
    if (!user || !favoritesReady) return
    if (buttonRef.current && buttonRef.current.getClientRects().length === 0) return
    const isMine = (action: PendingAction): action is PendingAction => action.type === 'favorite' && action.nftId === nftId
    if (!takePendingAction(isMine)) return
    mutateFavorite(
      { nftId, favorite: true, redirect: href },
      {
        onSuccess: () => announce(`${nftName} adicionado aos favoritos`),
        onError: () => announce('Não foi possível favoritar. Tente novamente.'),
      },
    )
  }, [user, favoritesReady, nftId, nftName, href, mutateFavorite, announce])

  const saved = favorites.data?.some((nft) => nft.id === nftId) ?? false
  // Enquanto a mutation roda, mostra o estado pedido (otimista mesmo sem a lista em cache)
  const pending = toggle.isPending && toggle.variables?.nftId === nftId
  const isFavorite = pending ? (toggle.variables?.favorite ?? saved) : saved

  function toggleFavorite() {
    if (toggle.isPending) return
    const favorite = !isFavorite
    // A ação pendente (401) é gravada pela própria mutation (useToggleFavorite), mesmo que este
    // componente desmonte com a expiração da sessão; aqui fica só o anúncio.
    toggle.mutate(
      { nftId, favorite, redirect: href },
      {
        onSuccess: () => announce(favorite ? `${nftName} adicionado aos favoritos` : `${nftName} removido dos favoritos`),
        onError: (error) => {
          if (error instanceof ApiError && error.kind === 'unauthorized') {
            announce(favorite ? 'Entre para favoritar' : 'Entre para atualizar os favoritos', href)
            return
          }
          announce('Não foi possível atualizar os favoritos. Tente novamente.')
        },
      },
    )
  }

  return { isFavorite, isPending: pending, toggleFavorite, feedback, buttonRef }
}
