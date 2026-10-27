import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Logo } from '@/components/layout/logo'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAuthSuccess } from '../hooks/use-auth-success'
import { ForgotPasswordForm } from './forgot-password-form'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'
import { SocialButtons } from './social-buttons'

type AuthPageProps = { mode: 'login' | 'register'; redirect?: string; notice?: string }

const TITLE = { login: 'Entrar', register: 'Criar perfil de colecionador' } as const

/**
 * Páginas `/entrar` e `/cadastro` (Figma Mobile/Login `16:1022` e Mobile/Cadastro `16:1228`):
 * logo, título, formulário, "Ou continue com", botões sociais e o link para a outra tela.
 * A partir de `md` o conteúdo vira um card centralizado (no desktop o header abre o modal).
 * Depois de entrar volta ao `redirect` (ou à ação pendente); sem destino, vai ao Início.
 */
export function AuthPage({ mode, redirect, notice }: AuthPageProps) {
  const completeAuth = useAuthSuccess()
  const [forgotOpen, setForgotOpen] = useState(false)
  const onSuccess = () => completeAuth(redirect, '/')

  return (
    <div className="mx-auto flex w-full max-w-[414px] flex-col px-7 pt-32 pb-10 md:my-16 md:max-w-[500px] md:border-b-[10px] md:border-primary md:bg-surface-card md:px-20 md:pt-12">
      <Logo className="self-center text-[2rem] leading-10" />
      {/* Title/20 no login e Body Large/18 no cadastro (medidos nos recortes m-05/m-06) */}
      <h1 className={cn('mt-[83px] text-center leading-7 font-bold text-foreground md:mt-12', mode === 'login' ? 'text-title-sm' : 'text-lead')}>
        {TITLE[mode]}
      </h1>
      {notice && (
        <output className="block mt-4 text-center text-caption-lg leading-4 text-text-accent">
          {notice}
        </output>
      )}
      <div className="mt-[33px]">
        {mode === 'login' ? (
          <LoginForm variant="page" onSuccess={onSuccess} onForgotPassword={() => setForgotOpen(true)} />
        ) : (
          <RegisterForm variant="page" onSuccess={onSuccess} />
        )}
      </div>
      <div className="mt-10">
        <SocialButtons variant="page" onSuccess={onSuccess} />
      </div>
      <p className="mt-10 text-center text-body-md leading-5 text-text-secondary">
        {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <Link
          to={mode === 'login' ? '/cadastro' : '/entrar'}
          search={{ redirect }}
          replace
          className="rounded-sm underline-offset-4 hover:underline"
        >
          {mode === 'login' ? 'Crie uma conta' : 'Entre'}
        </Link>
      </p>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="gap-6 rounded-lg border-border bg-surface-card px-6 pt-10 pb-6">
          <DialogTitle className="text-center text-title-sm leading-7 font-bold text-foreground">Recuperar senha</DialogTitle>
          <DialogDescription className="sr-only">Receba um link para redefinir a senha</DialogDescription>
          <ForgotPasswordForm variant="page" onBack={() => setForgotOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
