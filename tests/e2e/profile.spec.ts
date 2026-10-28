import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../fixtures/app'
import { accountMenu, ANA, BRUNO, logout, openPrivateAs, submitLogin } from '../fixtures/auth'

/*
 * Fase 7 (T-088), escopo enxuto. Perfil, senha, avatar e carteiras são regras de formulário/API:
 * o grosso roda só no desktop; um caso curto no mobile confere que a tela abre e salva em 390.
 * Fixtures: Ana tem "Ana Principal" (Ethereum) e "Ana Reserva" (Polygon); Bruno não tem carteiras.
 */

/** Campo de texto pelo rótulo (os obrigatórios têm " (obrigatório)" no nome acessível). */
const field = (scope: Page | Locator, label: string) => scope.getByRole('textbox', { name: new RegExp(`^${label}`) })

/** PNG 1×1 válido (assinatura conferida pelo schema do avatar). */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const desktopOnly = (name: string) => test.skip(name !== 'desktop-1440', 'Regra de formulário/API: um viewport basta')

test('perfil: validação ligada ao campo, salvar, persistir e refletir no header', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'tablet-768', 'Mesma grade do desktop: 390 e 1440 bastam')
  test.slow()
  await openPrivateAs(page, '/perfil', ANA)
  const main = page.getByRole('main')
  const username = field(main, 'Nome de usuário')
  await expect(username).toHaveValue('ana', { timeout: 15_000 })

  // Validação em português, ligada ao campo (aria-invalid + aria-describedby)
  await username.fill('ab')
  await username.blur()
  await expect(username).toHaveAttribute('aria-invalid', 'true')
  await expect(username).toHaveAccessibleDescription('O usuário precisa ter pelo menos 3 caracteres')

  await username.fill('ana.souza')
  await field(main, 'Nome de exibição').fill('Ana Souza')
  await main.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(main.getByText('Perfil salvo.', { exact: true })).toBeVisible()
  await expect(username).not.toHaveAttribute('aria-invalid')
  await expect(accountMenu(page, { name: 'Ana Souza' })).toBeVisible()

  await page.reload()
  await expect(field(main, 'Nome de usuário')).toHaveValue('ana.souza', { timeout: 15_000 })
  await expect(field(main, 'Nome de exibição')).toHaveValue('Ana Souza')
  await expect(accountMenu(page, { name: 'Ana Souza' })).toBeVisible()
})

test('senha: erros nos campos, troca com sucesso e login só com a nova', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name)
  test.slow()
  await openPrivateAs(page, '/perfil', ANA)
  const main = page.getByRole('main')
  await expect(field(main, 'Nome de usuário')).toHaveValue('ana', { timeout: 15_000 })
  const current = main.getByLabel('Senha atual', { exact: true })
  const next = main.getByLabel('Nova senha', { exact: true })
  const confirm = main.getByLabel('Confirmar nova senha', { exact: true })
  const save = main.getByRole('button', { name: 'Salvar', exact: true })
  const NEW_PASSWORD = 'NovaSenha@456'

  // Confirmação diferente: erro no client, sem chamar a API
  await current.fill('Errada@999')
  await next.fill(NEW_PASSWORD)
  await confirm.fill('Outra@456')
  await save.click()
  await expect(confirm).toHaveAttribute('aria-invalid', 'true')
  await expect(confirm).toHaveAccessibleDescription('As senhas não coincidem')

  // Senha atual errada: erro da API volta para o campo
  await confirm.fill(NEW_PASSWORD)
  await save.click()
  await expect(current).toHaveAttribute('aria-invalid', 'true')
  await expect(current).toHaveAccessibleDescription('Senha atual incorreta.')
  await expect(main.getByText('Senha alterada.')).toHaveCount(0)

  await current.fill(ANA.password)
  await save.click()
  await expect(main.getByText('Perfil salvo. Senha alterada.', { exact: true })).toBeVisible()
  await expect(current).toHaveValue('')

  // Sai e volta: a senha antiga é recusada, a nova entra
  await logout(page, ANA)
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?/, { timeout: 15_000 })
  await submitLogin(page.getByRole('main'), ANA)
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  await submitLogin(page.getByRole('main'), { email: ANA.email, password: NEW_PASSWORD })
  await expect(page).toHaveURL((url) => url.pathname.startsWith('/perfil'), { timeout: 15_000 })
  await expect(accountMenu(page, ANA)).toBeVisible()
})

test('avatar: envio com prévia, tipo inválido e remoção', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name)
  await openPrivateAs(page, '/perfil', ANA)
  const avatar = page.getByRole('group', { name: 'Avatar' })
  const image = avatar.getByRole('img', { name: 'Avatar de Ana Ribeiro' })
  const input = avatar.locator('input[type="file"]')
  const remove = avatar.getByRole('button', { name: 'Remover avatar' })
  await expect(remove).toBeDisabled({ timeout: 15_000 }) // começa sem avatar
  await expect(image).toHaveCount(0)

  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', /^data:image\/(png|webp);base64,/)
  await expect(avatar.locator('output')).toHaveText('Avatar atualizado.')
  await expect(remove).toBeEnabled()

  // Tipo inválido: mensagem ligada ao botão "Alterar"; o avatar salvo continua
  await input.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
  await expect(avatar.getByRole('alert')).toHaveText('Use uma imagem PNG, JPEG ou WebP')
  await expect(avatar.getByRole('button', { name: /^Alterar/ })).toHaveAccessibleDescription('Use uma imagem PNG, JPEG ou WebP')
  await expect(image).toBeVisible()

  await remove.click()
  await expect(avatar.locator('output')).toHaveText('Avatar removido.')
  await expect(image).toHaveCount(0)
  await expect(remove).toBeDisabled()
})

test('carteiras: editar principal, adicionar secundária, tornar principal e remover', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name)
  test.slow()
  await openPrivateAs(page, '/perfil/carteiras', ANA)
  const main = page.getByRole('main')
  const primary = main.getByRole('region', { name: 'Carteira principal' })
  const secondary = main.getByRole('region', { name: 'Carteira secundária' })
  const list = secondary.getByRole('list', { name: 'Carteiras secundárias' })

  // Editar a principal
  const nickname = field(primary, 'Apelido da carteira')
  await expect(nickname).toHaveValue('Ana Principal', { timeout: 15_000 })
  await nickname.fill('Ana Cofre')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(main.getByText('Carteira Ana Cofre salva.', { exact: true })).toBeVisible()

  // Nova secundária: endereço inválido para a rede, depois um válido (Solana = base58)
  await secondary.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
  const form = secondary.getByRole('group', { name: 'Nova carteira secundária' })
  await field(form, 'Apelido da carteira').fill('Ana Solana')
  await form.getByRole('combobox', { name: /^Rede/ }).selectOption({ label: 'Solana' })
  await form.getByRole('combobox', { name: /^Tipo de carteira/ }).selectOption({ label: 'MetaMask' })
  const address = field(form, 'Endereço da carteira')
  await address.fill('0x1234')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(address).toHaveAttribute('aria-invalid', 'true')
  await expect(address).toHaveAccessibleDescription('Endereço Solana inválido')

  await address.fill('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(main.getByText('Carteira Ana Solana adicionada.', { exact: true })).toBeVisible()
  await expect(list.getByRole('listitem')).toHaveCount(2)

  // "Tornar principal" troca os papéis
  await list.getByRole('button', { name: 'Tornar principal Ana Reserva' }).click()
  await expect(main.getByText('Ana Reserva agora é a carteira principal.', { exact: true })).toBeVisible()
  await expect(field(primary, 'Apelido da carteira')).toHaveValue('Ana Reserva')
  await expect(list.getByRole('listitem').filter({ hasText: 'Ana Cofre' })).toHaveCount(1)
  await expect(list.getByRole('listitem').filter({ hasText: 'Ana Reserva' })).toHaveCount(0)

  // Remover com confirmação (Cancelar não remove)
  await list.getByRole('button', { name: 'Remover Ana Solana' }).click()
  const dialog = page.getByRole('dialog', { name: 'Remover carteira?' })
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await list.getByRole('button', { name: 'Remover Ana Solana' }).click()
  await dialog.getByRole('button', { name: 'Remover carteira' }).click()
  await expect(main.getByText('Carteira Ana Solana removida.', { exact: true })).toBeVisible()
  await expect(list.getByRole('listitem')).toHaveCount(1)

  // Persistência: o banco simulado guarda os papéis
  await page.reload()
  await expect(field(primary, 'Apelido da carteira')).toHaveValue('Ana Reserva', { timeout: 15_000 })
  await expect(list.getByRole('listitem').filter({ hasText: 'Ana Cofre' })).toHaveCount(1)
})

test('carteiras: sem carteiras, Bruno vê o formulário de nova principal', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name)
  await openPrivateAs(page, '/perfil/carteiras', BRUNO)
  const main = page.getByRole('main')
  await expect(main.getByRole('group', { name: 'Nova carteira principal' })).toBeVisible({ timeout: 15_000 })
  await expect(main.getByText('Salve a carteira principal para adicionar outras.')).toBeVisible()
  await expect(main.getByRole('button', { name: 'Adicionar carteira secundária' })).toBeDisabled()
  await expect(main.getByRole('button', { name: 'Remover carteira' })).toHaveCount(0)
})
