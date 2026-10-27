import { http, HttpResponse } from 'msw'
import { oauthProviderSchema, type AuthResponse } from '@/entities/session'
import { loginSchema, passwordResetSchema, registerRequestSchema } from '@/features/auth/schemas/auth'
import { API_BASE_URL } from '@/lib/api'
import { authenticate, bearerToken, sessionsTable } from '../db/session'
import { toPublicUser, usersTable, type UserRow } from '../db/users'
import { withScenario } from '../scenarios'

const error = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ code, message, ...(details ? { details } : {}) }, { status })

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 422 com a primeira mensagem de cada campo (a ordem das regras no schema define a prioridade). */
function validation(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) fields[issue.path.map(String).join('.') || '_'] ??= issue.message
  return error(422, 'validation_error', 'Dados inválidos', fields)
}

function signIn(user: UserRow, status = 200) {
  const body: AuthResponse = { user: toPublicUser(user), session: sessionsTable.create(user.id) }
  return HttpResponse.json(body, { status })
}

export const authHandlers = [
  /** Cadastro: e-mail e usuário únicos (sem diferenciar maiúsculas). Já devolve a sessão. */
  http.post(
    `${API_BASE_URL}/auth/register`,
    withScenario('auth.register', async ({ request }) => {
      const parsed = registerRequestSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const { username, email, password } = parsed.data
      if (usersTable.findByEmail(email)) {
        return error(409, 'email_taken', 'Este e-mail já está cadastrado', { field: 'email' })
      }
      if (usersTable.findByUsername(username)) {
        return error(409, 'username_taken', 'Este nome de usuário já está em uso', { field: 'username' })
      }
      return signIn(usersTable.create({ username, email, password }), 201)
    }),
  ),

  /** Login por e-mail e senha. Erro genérico: não revela se o e-mail existe. */
  http.post(
    `${API_BASE_URL}/auth/login`,
    withScenario('auth.login', async ({ request }) => {
      const parsed = loginSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      const user = usersTable.findByEmail(parsed.data.email)
      if (!user || user.password !== parsed.data.password) {
        return error(401, 'invalid_credentials', 'E-mail ou senha incorretos')
      }
      return signIn(user)
    }),
  ),

  /** OAuth simulado (D-05): autentica a conta de fixture vinculada ao provedor. */
  http.post(
    `${API_BASE_URL}/auth/oauth/:provider`,
    withScenario('auth.oauth', ({ params }) => {
      const provider = oauthProviderSchema.safeParse(params.provider)
      if (!provider.success) return error(404, 'not_found', 'Provedor de login não suportado')
      const user = usersTable.findByProvider(provider.data)
      if (!user) return error(401, 'unauthorized', 'Nenhuma conta vinculada a este provedor')
      return signIn(user)
    }),
  ),

  /** Revoga o token enviado. Idempotente: sem token ou com token vencido também responde 204. */
  http.post(
    `${API_BASE_URL}/auth/logout`,
    withScenario('auth.logout', ({ request }) => {
      const token = bearerToken(request)
      if (token) sessionsTable.revoke(token)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  /** Sessão atual. Sem token → 401 `unauthorized`; token inválido/vencido → 401 `session_expired`. */
  http.get(
    `${API_BASE_URL}/auth/me`,
    withScenario('auth.me', ({ request }) => {
      const auth = authenticate(request)
      if (auth.error) return auth.error
      const body: AuthResponse = { user: toPublicUser(auth.user), session: auth.session }
      return HttpResponse.json(body)
    }),
  ),

  /** "Esqueceu a senha?" (D-07): resposta neutra 202, exista ou não o e-mail. */
  http.post(
    `${API_BASE_URL}/auth/password-reset`,
    withScenario('auth.reset', async ({ request }) => {
      const parsed = passwordResetSchema.safeParse(await readJson(request))
      if (!parsed.success) return validation(parsed.error.issues)
      return new HttpResponse(null, { status: 202 })
    }),
  ),
]
