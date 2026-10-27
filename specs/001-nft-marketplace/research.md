# Pesquisa e decisões

Cada decisão registra o contexto, a escolha e a alternativa descartada. Itens marcados **[aberto]** dependem de confirmação do usuário; os **[decidido]** já foram confirmados.

## Lacunas do design

**D-01: Layout em 768 px (tablet).** O Figma tem apenas 1440 e 414.
→ Usar o layout mobile até `md` (768), com o grid de catálogo em 3 colunas e o painel de filtros como sheet. O layout desktop (sidebar + grid) entra a partir de `xl` (1280). O header desktop aparece a partir de `md`, e a tab bar inferior só abaixo de `md`.

**D-02: Telas mobile ausentes** (perfil, carteiras e confirmação).
→ Perfil e carteiras usam o menu lateral como lista/accordion no topo, com o formulário em uma coluna. A confirmação vira uma página em tela cheia com o mesmo conteúdo do modal.

**D-03: Pedidos (lista, pendente, recusado).** Não há frames.
→ "Atividade" no menu do perfil lista os pedidos. O recibo usa o layout do modal de confirmação. Os estados pendente e recusado reutilizam o mesmo layout, trocando o ícone e a mensagem e usando os tokens existentes.

**D-04: Estados de loading, vazio e erro.** Não há frames.
→ Skeleton com shimmer na geometria exata de cada card/linha. Estados vazio e de erro usam a tipografia Body/14 com `text-muted-foreground` e um botão primário.

**D-05: Login social (Google/Facebook) [decidido em 2026-10-26].** Não existe provedor no desafio.
→ Os handlers MSW simulam o OAuth (`POST /auth/oauth/:provider`), autenticando um usuário de fixture vinculado ao provedor. É um comportamento real dentro da simulação, e não um botão morto.

**D-06: Navegação sem tela [decidido em 2026-10-26].** "Criadores", "Aprenda", "Ofertas", "Arquivos baixados" e "Suporte".
→ "Mercado" vai para `/` com foco no catálogo. "Aprenda" leva à seção "Diário da Cunhagem". "Criadores" filtra o catálogo por criador. "Lista de interesse" mostra os favoritos e "Atividade" mostra os pedidos. Ofertas, Arquivos e Suporte ficam ocultos até haver escopo, para não exibir botões sem comportamento.

**D-07: "Esqueceu a senha?" [decidido em 2026-10-26].** Não há tela.
→ Um modal derivado do login (campo de e-mail → mensagem "se o e-mail existir, enviaremos um link"), com handler MSW.

**D-08: Checkout desktop × mobile.** O desktop tem um formulário extenso de "Perfil do colecionador", e o mobile só a seleção de carteira.
→ O formulário do desktop é pré-preenchido com o perfil e a carteira principal do usuário, e os dados ficam editáveis. No mobile, os mesmos dados vêm do perfil. Os dois enviam o mesmo payload validado pelo mesmo schema Zod.

**D-09: Botão central da tab bar mobile [decidido em 2026-10-26].** O Figma não define o destino.
→ Leva à busca do catálogo (foca o campo de busca da Home mobile).

**D-10: Links do footer sem tela e redes sociais [decidido em 2026-10-26].** "Central de ajuda", "Como comprar NFTs", "Carteira e segurança", "Política do mercado", "Denunciar item" e "Estúdio do criador" não têm frame.
→ Viram páginas institucionais em `/paginas/$slug`, com conteúdo servido por `GET /content/pages/:slug`. "Meu perfil", "Minha coleção", "Atividade" e "Lista de interesse" apontam para as telas das fases 4, 6 e 7 e ficam "Disponível em breve" até lá. Os ícones sociais linkam para os perfis definidos em `GET /content/site` (nova aba, `rel="noopener noreferrer"`).

**D-11: Estado "favoritado" do coração [decidido em 2026-10-26].** O Figma só tem o coração em contorno (botão "Favoritar" `70410:3940`, coração do hero mobile `15:5642` e o badge dos cards).
→ O contorno é o estado "não favoritado". O estado "favoritado" foi derivado do mesmo vetor: apenas o subpath externo, com o mesmo traço e a mesma cor (`heart-filled.svg`, `heart-sm-filled.svg`, `heart-badge-filled.svg`). No desktop, o rótulo muda para "Favoritado". O estado vai para leitores de tela via `aria-pressed`.

## Decisões técnicas

**T-01: MSW fixado na 2.x.** O `@mswjs/socket.io-binding@0.2.0` exige `msw@^2.10.2`, e a v3 quebra o peer. Fica a 2.15 até sair um binding compatível.

**T-02: `@hookform/resolvers` em ~5.2.2.** As versões ≥ 5.3 declaram dezenas de peers opcionais (`@typeschema/*`, `effect`) que o npm 10 não resolve sem `--legacy-peer-deps`. A 5.2.2 já suporta Zod 4.

**T-03: Ordem de carregamento MSW × Socket.IO.** O `engine.io-client` captura `globalThis.WebSocket` quando o módulo é carregado. Por isso:
1. `main.tsx` importa o app só depois de `worker.start()`;
2. `lib/socket/config.ts` não importa `socket.io-client`, para que os mocks possam usá-lo.

**Resolvido (T-090):** o `WebSocket` era, sim, substituído no `start()`. A conexão ia para a rede porque o `WebSocketHandler` do MSW remove `/socket.io/` do caminho (e a query) antes de casar a URL, e o `ws.link` exigia esse prefixo. O padrão agora casa a origem com ou sem o prefixo (detalhes em ARCHITECTURE.md → "Tempo real").

**T-04: Carrinho do visitante no servidor simulado.** O carrinho anônimo fica identificado por `X-Cart-Id` (gerado no client e persistido) e é mesclado no login (`POST /cart/merge`). Assim as regras de preço e estoque ficam sempre no servidor. A alternativa, um carrinho só local, foi descartada porque violaria a constituição III.

**T-05: Sessão.** Token opaco com expiração curta (padrão de 15 min, configurável por cenário). Um 401 `session_expired` dispara o modal de login com `redirect` e a ação pendente serializada.

**T-06: Valores monetários.** String de wei na API e `bigint` no cliente. Cupom em bps ou valor fixo em wei. Taxa de rede vem do servidor (`0.016 ETH` no Figma).

**T-07: Persistência da simulação.** Banco do MSW em `localStorage` (`mockdb:*`), com versionamento. Dados privados são indexados por `userId`.

**T-08: Deploy.** Vercel servindo o build estático, com o MSW ativo em produção (`VITE_ENABLE_MOCKS` diferente de `false`) e rewrite de SPA excluindo `mockServiceWorker.js`.

**T-09: Porta 5173 ocupada no ambiente local.** Outro processo, fora deste projeto, usa a porta. O `vite.config.ts` usa `strictPort`; para rodar, use `npm run dev -- --port 5180` ou libere a porta.
