import type { Page, TestInfo } from '@playwright/test'
import { expect } from './app'

/** Usuários de `src/mocks/fixtures/users.ts`. */
export const ANA = { email: 'ana@kurio.dev', password: 'Senha@123', name: 'Ana Ribeiro' }
export const BRUNO = { email: 'bruno@kurio.dev', password: 'Senha@123', name: 'Bruno Lima' }

/** Abaixo de `md` (768px) as telas de auth são páginas (/entrar, /cadastro); a partir dele, viram o modal. */
export const isMobile = (testInfo: TestInfo) => testInfo.project.name === 'mobile-390'

/**
 * Abre o login pela UI: no desktop/tablet o botão "Entrar" do header abre o modal; no mobile a aba
 * "Conta" da tab bar leva a `/entrar?redirect=<rota atual>`. Devolve o container do formulário.
 */
export async function openLogin(page: Page, testInfo: TestInfo) {
  if (isMobile(testInfo)) {
    await page.getByRole('link', { name: 'Entrar na conta' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible({ timeout: 15_000 })
    return page.getByRole('main')
  }
  await page.getByRole('button', { name: 'Entrar', exact: true }).click({ timeout: 15_000 })
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Preenche e envia o formulário "Entrar" dentro de `scope` (modal ou página). */
export async function submitLogin(scope: ReturnType<Page['getByRole']>, user: { email: string; password: string }) {
  await scope.getByLabel('E-mail', { exact: true }).fill(user.email)
  await scope.getByLabel('Senha', { exact: true }).fill(user.password)
  await scope.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Avatar do header (desktop) ou ícone "Conta" da tab bar (mobile) quando há sessão. */
export const accountMenu = (page: Page, user: { name: string }) =>
  page.getByRole('button', { name: `Conta de ${user.name}` }).filter({ visible: true })

export async function logout(page: Page, user: { name: string }) {
  await accountMenu(page, user).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(accountMenu(page, user)).toHaveCount(0)
}

/**
 * Login pedido por uma rota privada (`path`): abaixo de `md` é a página `/entrar?redirect=<path>`; a
 * partir dele, o modal sobre o mercado (a página `/entrar` vira o modal, com o mesmo `redirect`).
 * Devolve o container do formulário.
 */
export async function expectLoginFor(page: Page, path: string) {
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await expect(page).toHaveURL(/\/entrar\?/, { timeout: 15_000 })
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(path)
    return page.getByRole('main')
  }
  const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL((url) => url.pathname === '/')
  return dialog
}

/** Rota privada: sem sessão pede login (página ou modal, ver `expectLoginFor`) e volta para ela. */
export async function openPrivateAs(page: Page, path: string, user: { email: string; password: string }) {
  await page.goto(path)
  await submitLogin(await expectLoginFor(page, path), user)
  await expect(page).toHaveURL((url) => url.pathname + url.search === path, { timeout: 15_000 })
}
