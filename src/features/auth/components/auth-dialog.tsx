import { XIcon } from 'lucide-react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { authDialog, useAuthDialog, type AuthView } from '../hooks/use-auth-dialog'
import { useAuthSuccess } from '../hooks/use-auth-success'
import { ForgotPasswordForm } from './forgot-password-form'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'
import { SocialButtons } from './social-buttons'

const DESCRIPTION: Record<Exclude<AuthView, 'forgot'>, string> = {
  login: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  register: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

const tabClass =
  'cursor-pointer rounded-sm text-title-sm leading-7 text-foreground data-[state=active]:text-text-accent'

/**
 * Modal de autenticação desktop (Figma Sign In Modal `70381:239`, 500×600, e Sign Up Modal
 * `70383:239`, 500×656): card Surface Card sem raio, faixa âmbar de 10px na base, conteúdo de
 * 340px centralizado e abas "Entrar | Criar conta". "Esqueceu a senha?" troca o conteúdo (D-07).
 * Fecha ao entrar; a ação pendente (ex.: favoritar) leva de volta à rota de origem, e o `redirect`
 * (vindo de `/entrar?redirect=` no desktop) segue o fluxo interrompido.
 */
export function AuthDialog() {
  const { open, view, notice, redirect } = useAuthDialog()
  const completeAuth = useAuthSuccess()

  function handleSuccess() {
    authDialog.close()
    completeAuth(redirect ?? undefined, null)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && authDialog.close()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (authDialog.restoreFocus()) event.preventDefault()
        }}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-[500px] flex-col max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-none border-0 border-b-[10px] border-primary bg-surface-card px-20 pt-[45px] pb-10 sm:max-w-[500px]',
          view === 'register' ? 'min-h-[656px]' : 'min-h-[600px]',
        )}
      >
        <DialogClose className="absolute top-3.5 right-3.5 flex size-8 cursor-pointer items-center justify-center rounded-sm text-primary">
          <XIcon aria-hidden className="size-5" />
          <span className="sr-only">Fechar</span>
        </DialogClose>

        {view === 'forgot' ? (
          <>
            <DialogTitle className="text-center text-title-sm leading-7 font-normal text-text-accent">Recuperar senha</DialogTitle>
            <DialogDescription className="sr-only">Receba um link para redefinir a senha</DialogDescription>
            <div className="mt-9">
              <ForgotPasswordForm variant="modal" onBack={() => authDialog.setView('login')} />
            </div>
          </>
        ) : (
          <TabsPrimitive.Root value={view} onValueChange={(value) => authDialog.setView(value as AuthView)}>
            <DialogTitle className="sr-only">{view === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>
            <TabsPrimitive.List aria-label="Acesso à conta" className="flex items-center justify-center gap-2">
              <TabsPrimitive.Trigger value="login" className={tabClass}>
                Entrar
              </TabsPrimitive.Trigger>
              <span aria-hidden className="h-6 w-px bg-text-accent" />
              <TabsPrimitive.Trigger value="register" className={tabClass}>
                Criar conta
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>

            {notice && (
              <output className="block mt-6 text-center text-caption-lg leading-4 text-text-accent">
                {notice}
              </output>
            )}
            <DialogDescription className="-mx-[30px] mt-9 text-center text-caption-lg leading-4 text-foreground">
              {DESCRIPTION[view]}
            </DialogDescription>

            <TabsPrimitive.Content value="login" className="mt-6 focus-visible:outline-none">
              <LoginForm variant="modal" onSuccess={handleSuccess} onForgotPassword={() => authDialog.setView('forgot')} />
            </TabsPrimitive.Content>
            <TabsPrimitive.Content value="register" className="mt-6 focus-visible:outline-none">
              <RegisterForm variant="modal" onSuccess={handleSuccess} />
            </TabsPrimitive.Content>
            <div className="mt-6">
              <SocialButtons variant="modal" onSuccess={handleSuccess} />
            </div>
          </TabsPrimitive.Root>
        )}
      </DialogContent>
    </Dialog>
  )
}
