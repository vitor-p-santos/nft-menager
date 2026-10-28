# Lighthouse — medianas (3 execuções)

| Página | Perfil | Performance | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|---|
| / | mobile | 62 | 5452 | 0 | 257 |
| /nft/nft-emerald-ape-042 | mobile | 52 | 5249 | 0 | 689 |
| /carrinho | mobile | 53 | 4874 | 0 | 684 |
| / | desktop | 93 | 1314 | 0 | 3 |
| /nft/nft-emerald-ape-042 | desktop | 93 | 1334 | 0 | 60 |
| /carrinho | desktop | 95 | 1200 | 0 | 3 |

## Análise (2026-10-27, rodada final)

- **CLS 0 em todas as páginas.** O 0,166 de `/carrinho` no desktop vinha do skeleton (carrinho cheio) ser mais
  alto que o estado vazio: o rodapé subia para dentro da viewport. O contêiner da página agora reserva
  `min-h-dvh` em todos os breakpoints (`features/cart/components/cart-page.tsx`).
- **Desktop:** Performance 93–95, LCP ≈ 1,2–1,3 s, TBT ≤ 60 ms.
- **Mobile (4× CPU, 4G simulado):** Performance 52–62. O TBT varia bastante entre rodadas no WSL (a rodada
  anterior marcou 925–3874 ms). O principal custo é o MSW e o banco simulado (`vendor-mocks`, ≈ 448 kB),
  que rodam no navegador antes de o app montar: é a "API" do desafio. Num backend real esse chunk sai do
  caminho crítico. Ver ARCHITECTURE.md (R-4).
