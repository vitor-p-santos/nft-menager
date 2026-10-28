import { http, HttpResponse } from 'msw'
import type { Wallet } from '@/entities/wallet'
import { createWalletRequestSchema, MAX_WALLETS, walletInputSchema } from '@/features/profile/schemas'
import { API_BASE_URL } from '@/lib/api'
import { walletsTable } from '../db/wallets'
import { apiError, invalidBody, isJsonObject, notFound, readJson, validationError } from '../http'
import { withScenario } from '../scenarios'
import { withAuth } from '../with-auth'

const walletNotFound = () => notFound('Carteira não encontrada')
const duplicate = () =>
  apiError(409, 'wallet_exists', 'Esta carteira já está salva nesta rede', {
    field: 'address',
    address: 'Esta carteira já está salva nesta rede',
  })

const walletPath = `${API_BASE_URL}/me/wallets/:id`
const idOf = (params: Record<string, string | readonly string[] | undefined>) => String(params.id ?? '')

/** Carteira → campos do formulário (base do PATCH parcial). */
function toInput(wallet: Wallet) {
  const { id: _id, role: _role, ...fields } = wallet
  return fields
}

/**
 * Carteiras salvas (US-09). Regras: exatamente uma principal; a 1ª carteira nasce principal;
 * remover a principal promove a secundária mais antiga; endereço válido para a rede e único por
 * usuário + rede (409 `wallet_exists`); até `MAX_WALLETS` (422 `wallet_limit_reached`).
 */
export const walletsHandlers = [
  http.get(
    `${API_BASE_URL}/me/wallets`,
    withScenario(
      'wallets.list',
      withAuth((_info, { user }) => HttpResponse.json(walletsTable.listByUser(user.id))),
    ),
  ),

  http.post(
    `${API_BASE_URL}/me/wallets`,
    withScenario(
      'wallets.create',
      withAuth(async ({ request }, auth) => {
        const body = await readJson(request)
        if (!isJsonObject(body)) return invalidBody()
        const parsed = createWalletRequestSchema.safeParse(body)
        if (!parsed.success) return validationError(parsed.error.issues)
        const { makePrimary, ...input } = parsed.data
        const userId = auth.user.id
        if (walletsTable.countByUser(userId) >= MAX_WALLETS) {
          return apiError(422, 'wallet_limit_reached', `Você pode salvar até ${MAX_WALLETS} carteiras`)
        }
        if (walletsTable.findDuplicate(userId, input.network, input.address)) return duplicate()
        return HttpResponse.json(walletsTable.create(userId, input, makePrimary), { status: 201 })
      }),
    ),
  ),

  /** PATCH parcial: corpo + carteira atual, validados juntos (trocar a rede revalida o endereço). */
  http.patch(
    walletPath,
    withScenario(
      'wallets.update',
      withAuth(async ({ request, params }, auth) => {
        const userId = auth.user.id
        const current = walletsTable.findForUser(userId, idOf(params))
        if (!current) return walletNotFound()
        const body = await readJson(request)
        if (!isJsonObject(body)) return invalidBody()
        const parsed = walletInputSchema.safeParse({ ...toInput(current), ...body })
        if (!parsed.success) return validationError(parsed.error.issues)
        if (walletsTable.findDuplicate(userId, parsed.data.network, parsed.data.address, current.id)) return duplicate()
        const updated = walletsTable.update(userId, current.id, parsed.data)
        return updated ? HttpResponse.json(updated) : walletNotFound()
      }),
    ),
  ),

  http.delete(
    walletPath,
    withScenario(
      'wallets.remove',
      withAuth(({ params }, auth) => {
        const result = walletsTable.remove(auth.user.id, idOf(params))
        return result ? new HttpResponse(null, { status: 204 }) : walletNotFound()
      }),
    ),
  ),

  http.post(
    `${walletPath}/primary`,
    withScenario(
      'wallets.primary',
      withAuth(({ params }, auth) => {
        const list = walletsTable.setPrimary(auth.user.id, idOf(params))
        return list ? HttpResponse.json(list) : walletNotFound()
      }),
    ),
  ),
]
