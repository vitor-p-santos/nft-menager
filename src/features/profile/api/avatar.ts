import { ApiError } from '@/lib/api'
import { AVATAR_MAX_DIMENSION, avatarDataUrlSchema, avatarFileSchema } from '../schemas'

/** Erro de validação local no formato do `ApiError` (`details.dataUrl`), para a UI tratar igual. */
function avatarError(message: string) {
  return new ApiError({ kind: 'validation', status: null, code: 'validation_error', message, details: { dataUrl: message } })
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Prepara o avatar escolhido no `<input type="file">` (use também para a prévia):
 * 1. valida tipo (PNG/JPEG/WebP) e tamanho (≤ 2 MB) com `avatarFileSchema`;
 * 2. reduz para no máximo 256 px no lado maior (WebP; PNG se o navegador não gerar WebP), porque o
 *    banco simulado vive no `localStorage` (~5 MB) e o usuário também vai para a sessão local;
 * 3. revalida a data URL com o mesmo schema do servidor.
 * Rejeita com `ApiError` `validation_error` (`details.dataUrl`) e mensagem em português.
 */
export async function prepareAvatar(file: File): Promise<string> {
  const checked = avatarFileSchema.safeParse(file)
  if (!checked.success) throw avatarError(checked.error.issues[0]?.message ?? 'Imagem inválida')

  let dataUrl: string
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponível')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    dataUrl = canvas.toDataURL('image/webp', 0.9)
  } catch {
    // Sem decodificação no navegador: envia o arquivo original (o servidor valida tipo e tamanho).
    try {
      dataUrl = await readAsDataUrl(file)
    } catch {
      throw avatarError('Não foi possível ler a imagem')
    }
  }

  const valid = avatarDataUrlSchema.safeParse(dataUrl)
  if (!valid.success) throw avatarError(valid.error.issues[0]?.message ?? 'Imagem inválida')
  return valid.data
}
