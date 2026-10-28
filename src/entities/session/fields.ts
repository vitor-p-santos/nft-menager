import { z } from 'zod'

/**
 * Campos de conta compartilhados por cadastro (`features/auth`), perfil (`features/profile`) e pelos
 * handlers MSW. Ficam na entidade para que uma feature não importe a outra. Mensagens em português.
 */

export const PASSWORD_MIN = 8

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail')
  .max(254, 'E-mail muito longo')
  .pipe(z.email('Informe um e-mail válido'))

/** Senha nova (cadastro e troca de senha): mínimo de 8 caracteres, com ao menos uma letra e um número. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres`)
  .max(128, 'A senha pode ter no máximo 128 caracteres')
  .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra')
  .regex(/\d/, 'A senha precisa ter pelo menos um número')

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'O usuário precisa ter pelo menos 3 caracteres')
  .max(20, 'O usuário pode ter no máximo 20 caracteres')
  .regex(/^[a-zA-Z0-9_.]+$/, 'Use apenas letras, números, ponto ou sublinhado')

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Informe o nome de exibição')
  .max(50, 'Use até 50 caracteres')
