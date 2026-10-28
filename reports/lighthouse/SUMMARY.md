# Lighthouse — medianas (3 execuções)

| Página | Perfil | Performance | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|---|
| / | mobile | 38 | 5464 | 0 | 2006 |
| /nft/nft-emerald-ape-042 | mobile | 33 | 6076 | 0 | 3874 |
| /carrinho | mobile | 46 | 5241 | 0 | 925 |
| / | desktop | 92 | 1337 | 0 | 63 |
| /nft/nft-emerald-ape-042 | desktop | 91 | 1426 | 0 | 47 |
| /carrinho | desktop | 87 | 1204 | 0.166 | 8 |

## Análise (2026-10-27)

- **Desktop:** Performance 87–92, LCP ≈ 1,2–1,4 s, TBT < 70 ms.
- **Mobile (4× CPU, 4G simulado):** Performance 33–46. O TBT alto vem principalmente do MSW e do
  banco simulado (`vendor-mocks`, ≈ 448 kB), que rodam no navegador antes de o app montar: é a "API" do
  desafio. Num backend real esse chunk sai do caminho crítico. Ver ARCHITECTURE.md (R-4).
- **CLS 0,166 em /carrinho (desktop):** deslocamento de layout a corrigir (pendente).
