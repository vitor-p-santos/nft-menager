import { z } from 'zod'

/**
 * Avatar (`PUT /me/avatar`): PNG, JPEG ou WebP de até 2 MB, enviado como data URL base64 e guardado
 * assim no banco simulado. O mesmo schema valida no client e no handler (tipo declarado, tamanho
 * decodificado e assinatura do arquivo, que precisa bater com o tipo).
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number]
/** Valor do `accept` do `<input type="file">`. */
export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(',')
/** Lado maior da imagem depois do redimensionamento no client (`prepareAvatar`). */
export const AVATAR_MAX_DIMENSION = 256

export const AVATAR_TYPE_MESSAGE = 'Use uma imagem PNG, JPEG ou WebP'
export const AVATAR_SIZE_MESSAGE = 'A imagem pode ter no máximo 2 MB'

const isAvatarMime = (value: string): value is AvatarMimeType => (AVATAR_MIME_TYPES as readonly string[]).includes(value)

const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/

/** Bytes decodificados de um base64 sem precisar decodificar tudo. */
const base64Bytes = (base64: string) => Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)

/** Assinatura (magic bytes) dos primeiros bytes do arquivo. */
function sniffMime(base64: string): AvatarMimeType | null {
  let head: string
  try {
    head = atob(base64.slice(0, 16))
  } catch {
    return null
  }
  const bytes = Array.from(head, (char) => char.charCodeAt(0))
  if (bytes[0] === 0x89 && head.slice(1, 4) === 'PNG') return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** Data URL de avatar válida: tipo aceito, até 2 MB e conteúdo do mesmo tipo declarado. */
export const avatarDataUrlSchema = z
  .string({ error: 'Envie uma imagem' })
  // Limite bruto antes do regex: 2 MB em base64 + cabeçalho.
  .max(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 64, AVATAR_SIZE_MESSAGE)
  .superRefine((value, ctx) => {
    const match = DATA_URL.exec(value)
    if (!match) {
      ctx.addIssue({ code: 'custom', message: 'Envie a imagem como data URL base64' })
      return
    }
    const [, mime, base64] = match as unknown as [string, string, string]
    if (!isAvatarMime(mime)) {
      ctx.addIssue({ code: 'custom', message: AVATAR_TYPE_MESSAGE })
      return
    }
    if (base64Bytes(base64) > AVATAR_MAX_BYTES) {
      ctx.addIssue({ code: 'custom', message: AVATAR_SIZE_MESSAGE })
      return
    }
    if (sniffMime(base64) !== mime) {
      ctx.addIssue({ code: 'custom', message: 'O arquivo não é uma imagem válida' })
    }
  })

export const avatarUploadSchema = z.object({ dataUrl: avatarDataUrlSchema })
export type AvatarUpload = z.infer<typeof avatarUploadSchema>

/** Arquivo escolhido no `<input type="file">` (validação antes de ler/redimensionar). */
export const avatarFileSchema = z
  .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Escolha uma imagem')
  .refine((file) => isAvatarMime(file.type), AVATAR_TYPE_MESSAGE)
  .refine((file) => file.size <= AVATAR_MAX_BYTES, AVATAR_SIZE_MESSAGE)
