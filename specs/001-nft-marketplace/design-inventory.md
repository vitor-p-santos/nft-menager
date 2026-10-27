# Inventário de design (Figma)

- **Arquivo:** `hM1w5sJ9EKqqdJTLazjE7u`. Página `0:1`, *Marketplace de NFTs GreenMint*. Marca exibida: **KURIO**.
- **Recortes de referência (1:1):** `design/figma/d-*.png` (desktop) e `design/figma/m-*.png` (mobile).
- **Orçamento de chamadas do MCP:** a conta tem assento *View* no plano Starter, com poucas chamadas por mês. Por isso, use `get_design_context` só por seção, na hora de implementar cada tela.

## Frames

| Frame | Node | Tamanho | Seções (node) |
|---|---|---|---|
| Desktop / Início | `2:2` | 1440×3668 | Top `70353:242` · Products `70342:2831` · Promos `70353:241` · Blog `70343:253` · Footer `70492:696` |
| Desktop / Detalhes do NFT | `10:244` | 1440×2246 | Top `70342:2770` · Description `70342:2780` · Related `70364:239` · Footer |
| Desktop / Carrinho | `11:1278` | 1440×1754 | Top `70371:250` · Related `70371:239` · Footer |
| Desktop / Pagamento | `11:2862` | 1440×1657 | Checkout Page `70522:3321` · Footer |
| Desktop / Confirmação | `11:4385` | 1440×1657 | Order Confirmation Modal `70376:239` (578×821) sobre BG |
| Desktop / Login | `9:115` | 1440×1981 | Sign In Modal `70381:239` (500×600) |
| Desktop / Cadastro | `9:1022` | 1440×1981 | Sign Up Modal `70383:239` (500×656) |
| Desktop / Perfil | `9:1238` | 1440×1080 | Top `70386:264` |
| Desktop / Carteiras | `9:1670` | 1440×1080 | Top `70390:267` |
| Mobile / Início | `14:5226` | 414×896 | Search `70395:239` · Hero `70395:240` · Tabs `70395:241` · Grid `70395:242` · Tab Bar `70395:245` |
| Mobile / Detalhes | `15:5536` | 414×896 | Hero `70396:241` · Details Sheet `70396:242` · Buy Bar `70396:245` |
| Mobile / Carrinho | `16:360` | 414×896 | Content `70397:239` · Payment Summary `70397:245` |
| Mobile / Pagamento | `16:748` | 414×896 | Content `70398:239` |
| Mobile / Login | `16:1022` | 414×896 | Logo · Title · Form `70399:241` · Button · Social `70522:3186` · Link |
| Mobile / Cadastro | `16:1228` | 414×896 | Logo · Title · Form `70399:250` · Button · Social `70522:3213` · Link |

**Layout desktop:** container de 1200 px centralizado (margens de 120 px em 1440).

## Tokens (variáveis do Figma → `src/styles/globals.css`)

| Figma | Valor | Token CSS / Tailwind |
|---|---|---|
| Color/Ink | `#140D0A` | `--ink` → `bg-background` |
| Color/Surface Card | `#241612` | `--surface-card` → `bg-card` |
| Color/Surface Dark | `#38220F` | `--surface-dark` → `bg-surface-dark` |
| Color/Background Elevated | `#FBFBFB` | `--background-elevated` → `bg-elevated` |
| Text/Primary | `#F7F3EC` | `--text-primary` → `text-foreground` |
| Color/Foreground | `#F5F1EB` | `--foreground-figma` |
| Text/Secondary | `#CFB28C` | `--text-secondary` → `text-muted-foreground` |
| Text/Accent | `#E89B55` | `--text-accent` → `text-text-accent` |
| Color/Primary | `#D28A4C` | `--brand-primary` → `bg-primary` |
| Color/Secondary | `#B39463` | `--brand-secondary` → `bg-secondary` |
| Color/Border | `#3F2319` | `--line` → `border-border` |
| Color/Border Soft | `#55321F` | `--line-soft` → `border-border-soft` |

**Tipografia:** família única **Roboto Mono** (self-hosted via `@fontsource-variable/roboto-mono`).

| Estilo | Tamanho / peso / line-height |
|---|---|
| Display/43 Bold | 43 / 700 / 70 |
| Heading/24 Bold | 24 / 700 / auto |
| Body Large/18 Bold · Regular | 18 / 700·400 / 16–24 |
| Body Large/17 Bold | 17 / 700 / 16 |
| Body Large/16 Bold · Medium · Regular | 16 / 700·500·400 / auto·16·20 |
| Body/15 Bold · Medium · Regular | 15 / 700·500·400 / 16·40 |
| Body/14 Bold · Medium · Regular | 14 / 700·500·400 / 16·20·22·24·30 (Bold e Medium com letter-spacing 10%) |
| Caption/13 Regular | 13 / 400 / 22 |
| Caption/12 Bold | 12 / 700 / 14 |
| Tiny/10 Medium · Tiny/9 Bold | 10 / 500 · 9 / 700 |

**Pendente via `get_design_context` (por seção):** raios exatos, sombras, cor de erro e do asterisco de obrigatório, espaçamentos internos e gradientes dos botões mobile.

## Assets

| Asset | Local | Origem |
|---|---|---|
| NFT, macaco marrom de óculos (Emerald Ape) | `public/images/nfts/ape-emerald.png` | rawImage do `2:2` (1254²) |
| NFT, gorila de chapéu (Sage/Violet Nomad, Cosmic Bloom) | `public/images/nfts/ape-sage.png` | rawImage do `2:2` |
| NFT, macaco preto de terno (Neon Vessel, Ivory Baron) | `public/images/nfts/ape-ivory.png` | rawImage do `2:2` |
| NFT, macaco dourado de fones (Golden Beat/Signal/Frequency) | `public/images/nfts/ape-golden.png` | rawImage do `2:2` |
| Ícones SVG da Home (20 de mais de 20) | `design/figma/svg-home/*.svg` | svgAssets do `2:2`. Mapear e mover para `src/assets/icons` na implementação |
| Ícones do detalhe (zoom, estrelas, +/−, coração, compartilhar, voltar, carrinho) | `src/assets/icons/{zoom,star,star-muted,star-sm,minus,plus,heart-outline,heart-sm-outline,share-*,arrow-back,shop}.svg` | svgAssets de `70342:2770` e `15:5536`. Os corações cheios (`*-filled.svg`) foram derivados (D-11) |
| Ilustração "Thank you" | pendente | baixar do `70376:239` |
| Logos Google/Facebook | `src/assets/icons/google.svg`, `facebook-f.svg` (provisórios, ver ARCHITECTURE.md) | baixar do `70381:239` quando houver chamada MCP |

Os PNGs têm cerca de 1,9 MB cada. Antes da etapa de Lighthouse, devem ser gerados em AVIF/WebP com `srcset`, sem trocar a arte.

## Inconsistências observadas no Figma

- Violet Nomad #314 aparece com "ID do token: #0009" no carrinho e "#0314" no pagamento. **Decisão:** o ID do token vem da API (um único valor por NFT).
- Neon Vessel #552 e Ivory Baron #088 usam a mesma arte, e o carrinho mostra Ivory Baron com o token #0552. **Decisão:** dados vêm das fixtures, coerentes entre telas.
- O modal de login na Home cobre um catálogo com itens em ordem diferente da Home. É só um mock visual, sem impacto.
