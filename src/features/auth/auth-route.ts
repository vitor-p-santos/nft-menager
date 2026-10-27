import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { sanitizeRedirect, sessionStore } from '@/entities/session'
import { authSearchSchema } from './schemas/auth'

/** Search das páginas de auth: `redirect` + `motivo=sessao-expirada` (mostra o aviso). */
export const authPageSearchSchema = authSearchSchema.extend({
  motivo: z.literal('sessao-expirada').optional().catch(undefined),
})
export type AuthPageSearch = z.infer<typeof authPageSearchSchema>

export const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente para continuar.'

/** `beforeLoad` das páginas de auth: quem já está logado segue direto para o destino. */
export function skipIfAuthenticated({ search }: { search: AuthPageSearch }) {
  if (sessionStore.isAuthenticated()) {
    throw redirect({ href: sanitizeRedirect(search.redirect), replace: true })
  }
}

/**
 * `beforeLoad` das rotas privadas (checkout, pedidos, perfil): sem sessão, manda para `/entrar`
 * com `redirect` = rota + search atuais, para voltar ao mesmo ponto depois do login.
 */
export function requireAuth({ location }: { location: { href: string } }) {
  if (!sessionStore.isAuthenticated()) {
    throw redirect({ to: '/entrar', search: { redirect: location.href } })
  }
}
