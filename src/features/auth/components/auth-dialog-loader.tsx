import { lazy, Suspense, useState } from 'react'
import { useAuthDialog } from '../hooks/use-auth-dialog'

const AuthDialog = lazy(() => import('./auth-dialog').then((m) => ({ default: m.AuthDialog })))

/**
 * Carrega o modal "Entrar | Criar conta" só quando ele abre pela primeira vez (T-101): o diálogo,
 * os formulários (RHF + Zod) e os botões sociais saem do caminho crítico. Depois de aberto fica
 * montado, para a animação de saída e a devolução do foco funcionarem.
 */
export function AuthDialogLoader() {
  const { open } = useAuthDialog()
  const [loaded, setLoaded] = useState(open)
  if (open && !loaded) setLoaded(true)
  if (!loaded) return null
  return (
    <Suspense>
      <AuthDialog />
    </Suspense>
  )
}
