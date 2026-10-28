import { matchQuery, type Query, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { cartKeys, isCartMergePending, mergeAnonymousCart } from '@/entities/cart'
import {
  clearPendingAction,
  emitSessionExpired,
  isPrivateQueryKey,
  sessionStore,
  type AuthResponse,
} from '@/entities/session'
import { api, configureSession, http, resetCartId } from '@/lib/api'
// Import direto (sem o index): não carrega o socket.io-client só para avisar a troca de sessão.
import { resetSocketSession } from '@/lib/socket/session'
import { authResponseSchema } from '../schemas/auth'
import { authKeys } from './keys'

type ResetOptions = {
  /** Dados da identidade nova já conhecidos (ex.: `GET /auth/me` e o carrinho mesclado): gravados em vez de refeitos. */
  seed?: ReadonlyArray<readonly [QueryKey, unknown]>
}

const isPrivateQuery = (query: Query) => isPrivateQueryKey(query.queryKey)

/**
 * Isolamento dos dados privados ao trocar de identidade (login, logout, expiração, outra aba), numa
 * única rodada:
 * - só as queries privadas (ver `entities/session/query-scope`) são tocadas; catálogo e conteúdo são
 *   iguais para qualquer conta e ficam como estão (sem refetch, sem skeleton);
 * - privadas inativas saem do cache; privadas ativas são resetadas (dados → undefined, fetch em voo
 *   cancelado) e refeitas uma vez com o token novo (`resetQueries` refaz só as ativas);
 * - `seed` grava os dados já conhecidos da identidade nova, que então não são refeitos;
 * - mutations concluídas saem do cache (as variáveis do login têm a senha); a em andamento fica.
 * A parte que mexe no cache é síncrona: chamada logo depois de `sessionStore.signIn`, os componentes só
 * renderizam com o usuário novo quando o cache privado já foi trocado (nada é buscado duas vezes).
 */
export async function resetUserData(queryClient: QueryClient, { seed = [] }: ResetOptions = {}) {
  const seeded = (query: Query) => seed.some(([key]) => matchQuery({ queryKey: key, exact: true }, query))
  queryClient.removeQueries({ type: 'inactive', predicate: (query) => isPrivateQuery(query) && !seeded(query) })
  const mutations = queryClient.getMutationCache()
  for (const mutation of mutations.getAll()) {
    if (mutation.state.status !== 'pending') mutations.remove(mutation)
  }
  for (const [key, data] of seed) queryClient.setQueryData(key, data)
  await queryClient
    .resetQueries({ type: 'active', predicate: (query) => isPrivateQuery(query) && !seeded(query) })
    .catch(() => {
      // falhas de refetch aparecem nos próprios componentes
    })
}

/**
 * Conclui login, cadastro ou OAuth em uma rodada só: cancela os requests privados da identidade
 * anterior → mescla o carrinho anônimo com o token novo → troca a sessão, reconecta o socket e reseta
 * o cache privado (o `/auth/me` e o carrinho mesclado entram como `seed`, sem refetch).
 * A ação pendente (`entities/session/pending-action`) fica para a UI concluir após o redirect.
 */
export async function completeSignIn(queryClient: QueryClient, auth: AuthResponse) {
  await queryClient.cancelQueries({ predicate: isPrivateQuery })
  const cart = await mergeAnonymousCart(auth.session.token)
  sessionStore.signIn(auth)
  resetSocketSession(auth.session.token)
  const seed: [QueryKey, unknown][] = [[authKeys.me(), auth]]
  if (cart) seed.push([cartKeys.detail(), cart])
  await resetUserData(queryClient, { seed })
}

/**
 * Logout: sempre conclui localmente, mesmo que a API falhe ou demore (o token é revogado em
 * segundo plano). Começa um carrinho anônimo novo para não herdar nada da conta, exceto quando a
 * junção do carrinho do visitante ficou pendente: aí ele é mantido.
 */
export async function signOut(queryClient: QueryClient) {
  const token = sessionStore.getToken()
  if (token) {
    void http.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  }
  await queryClient.cancelQueries({ predicate: isPrivateQuery })
  sessionStore.signOut()
  // Junção pendente (falhou no login): o carrinho do visitante continua para a próxima tentativa
  if (!isCartMergePending()) resetCartId()
  clearPendingAction()
  resetSocketSession(null)
  await resetUserData(queryClient)
}

/** 401 `session_expired`: limpa a sessão uma única vez e avisa a UI (abre o login com `redirect`). */
function expireSession(queryClient: QueryClient, message: string) {
  if (!sessionStore.expire()) return
  resetSocketSession(null)
  void resetUserData(queryClient)
  emitSessionExpired({ code: 'session_expired', message })
}

let uninstall: (() => void) | null = null

/**
 * Liga a sessão ao cliente HTTP (`configureSession`) e ao cache. Chamado uma vez no bootstrap
 * (`app/providers.tsx`). Também valida a sessão salva com `GET /auth/me` ao abrir o app.
 */
export function installSessionBridge(queryClient: QueryClient) {
  if (uninstall) return uninstall

  configureSession({
    getToken: sessionStore.getToken,
    onUnauthorized: ({ error, token }) => {
      // Ignora 401 de uma sessão que já foi trocada (request antigo terminando depois do login).
      if (error.code !== 'session_expired' || !token || token !== sessionStore.getToken()) return
      expireSession(queryClient, error.message)
    },
  })

  const unsubscribe = sessionStore.subscribe((state, { source }) => {
    // Login/logout em outra aba: troca o cache e o socket aqui também.
    if (source !== 'external') return
    resetSocketSession(state?.session.token ?? null)
    void resetUserData(queryClient)
  })

  const token = sessionStore.getToken()
  resetSocketSession(token)
  if (token) {
    void queryClient
      .fetchQuery({
        queryKey: authKeys.me(),
        queryFn: ({ signal }) => api.get('/auth/me', authResponseSchema, { signal }),
      })
      .then((auth) => sessionStore.refresh(auth))
      .catch(() => {
        // 401 `session_expired` já foi tratado pelo interceptor; outros erros mantêm a sessão.
      })
  }

  uninstall = () => {
    unsubscribe()
    configureSession({ getToken: () => null, onUnauthorized: () => {} })
    uninstall = null
  }
  return uninstall
}
