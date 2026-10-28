import type { Page } from '@playwright/test'
import { expect } from './app'

/** Adiciona pelo detalhe ("COMPRAR" no desktop, "Comprar NFT" na Buy Bar) e espera a tela do carrinho. */
export async function buyFromDetail(page: Page, nftId: string) {
  await page.goto(`/nft/${nftId}`)
  await page
    .getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })
    .filter({ visible: true })
    .click({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/carrinho$/)
}

/** Altera um campo do NFT no banco simulado (localStorage), como se o servidor tivesse mudado. */
export async function patchMockNft(page: Page, nftId: string, patch: Record<string, unknown>) {
  await page.evaluate(
    ({ id, changes }) => {
      const raw = localStorage.getItem('mockdb:nfts')
      if (!raw) throw new Error('mockdb:nfts ausente')
      const table = JSON.parse(raw) as { v: number; data: { id: string }[] }
      table.data = table.data.map((n) => (n.id === id ? { ...n, ...changes } : n))
      localStorage.setItem('mockdb:nfts', JSON.stringify(table))
    },
    { id: nftId, changes: patch },
  )
}
