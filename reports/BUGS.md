# Bugs conhecidos

Levantados em 2026-10-28 por uma caça de bugs no site publicado (<https://nft-marketplace-ten-weld.vercel.app>, `main` em `dedf401`). O teste usou um navegador real (Playwright/Chromium), com axe injetado e leitura do código. Corrigidos até agora: item 1. Os arquivos e linhas se referem à `main` daquele momento. A refatoração da PR #11 mudou de lugar parte do código dos mocks (`handlers/checkout.ts` → `mocks/domain/*`).

Usuários de teste: `ana@kurio.dev` e `bruno@kurio.dev`, senha `Senha@123`. Os cenários do MSW são configurados com `?mock=<chave>:<valor>` ou `localStorage['mock:scenarios']` (ver `src/mocks/scenarios/index.ts`).

Legenda: **R** = reproduzido no navegador · **S** = suspeito pela leitura do código, não reproduzido.

## Alto

### 1. ~~A rede do pedido não é validada contra a rede dos NFTs~~ — CORRIGIDO (PR `rede-do-pedido`)
> Corrigido com a opção (a): uma rede por compra. O carrinho com redes misturadas bloqueia o "Finalizar", a cotação responde 422 `mixed_networks` e `POST /orders` responde 422 em `network`. Coberto por `tests/e2e/order-network.spec.ts`.

- **Passos:**
  - **A:** Bruno (sem carteiras) põe *Copper Ape #291* (Ethereum) no carrinho e vai a `/checkout`. Escolhe Rede = Solana, endereço `9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin`, tipo MetaMask, e confirma.
  - **B (390 px):** Ana escolhe a carteira salva "Reserva" (Polygon) para comprar *Copper Ape* (Ethereum).
  - **C:** carrinho com *Copper Ape* (Ethereum) + *Neon Vessel* (Polygon).
- **Esperado:** recusar (422) ou bloquear no client quando a rede da carteira for diferente da rede dos itens, ou separar a compra por rede.
- **Obtido:**
  - **A:** pedido `confirmed` com `network: 'solana'` e itens em Ethereum. O recibo diz "Transação confirmada na Solana", mostra "Ver no Solscan" e cobra a taxa da Ethereum.
  - **B:** recibo "confirmada na Polygon" para um NFT Ethereum.
  - **C:** taxa das duas redes, mas o recibo diz "confirmada na Ethereum".
- **Onde:** criação do pedido em `src/mocks/handlers/checkout.ts:320-345` e `:403`. Só compara a rede da carteira com `payload.network`, nunca com `quote.items[].nft.network`. O schema do checkout também não faz essa checagem.
- **Decisão pendente (regra de negócio):**
  - **(a)** aceitar só uma carteira da rede dos itens e exigir uma compra por rede; ou
  - **(b)** dividir em um pedido por rede.

## Médio

### 2. Um favorito pendente antigo sequestra o redirect do login (R)
- **Passos:**
  1. Anônimo, em `/nft/nft-sage-nomad-009`, clicar no coração ("Entre para favoritar") e ignorar.
  2. Comprar *Golden Beat*, ir a `/carrinho` e clicar em "Conectar e finalizar" (`/entrar?redirect=%2Fcheckout`).
  3. Entrar como Bruno.
- **Esperado:** voltar a `/checkout`.
- **Obtido (390 e 1440):** vai para `/nft/nft-sage-nomad-009`, e esse NFT é favoritado.
- **Onde:** `src/features/auth/hooks/use-auth-success.ts:15-16`.
  - A ação pendente tem prioridade sobre o `redirect` explícito.
  - `readPendingAction` não verifica a idade (o limite de 30 min só existe em `takePendingAction`).
  - A ação nunca é descartada quando o usuário sai do fluxo.

### 3. Uma compra antiga reaparece como "confirmada" ao abrir um checkout novo (R)
- **Passos:**
  1. Ana abre `/checkout?mock=payment.delay:7000` e clica em "Confirmar compra".
  2. Com o diálogo "Aguardando a confirmação" aberto, usa "voltar" do navegador e vai para `/`.
  3. Adiciona outro NFT e abre `/checkout`.
- **Esperado:** checkout novo.
- **Obtido:** abre o diálogo "Seus NFTs agora estão na sua carteira" do pedido **anterior**, e a tentativa `kurio:checkout-attempt:user-ana` continua salva.
- **Onde:** `src/features/checkout/api/queries.ts:180`. A recuperação devolve o pedido mesmo quando ele já está `confirmed`/`rejected`, e a tentativa só é limpa em `useCheckoutOrder` (`:209`). Com `use-checkout-flow.ts:92`, o pedido antigo é exibido.
- **Correção sugerida:** ignorar e limpar tentativas cujo pedido já está concluído.

### 4. Falha no merge do carrinho no login apaga os itens sem aviso (R)
- **Passos:**
  1. Anônimo adiciona *Golden Beat*.
  2. Define `localStorage['mock:scenarios'] = '{"cart.merge":"failure"}'`.
  3. Entra como Bruno por `/entrar?redirect=%2Fcarrinho`.
- **Obtido:** "Seu carrinho está vazio", sem nenhum alerta.
- **Pela leitura do código (S):** `signOut` chama `resetCartId()` (`src/features/auth/api/session.ts:94`), então o carrinho anônimo preservado também se perde. Isso contradiz o comentário em `:62` ("entra no próximo login").

### 5. O provedor trocado fica gravado junto com a carteira salva de outro provedor (R)
- **Passos:**
  1. Ana, no desktop, marca "Coinbase Wallet" com a carteira "Principal" (MetaMask).
  2. Confirma com `?mock=payment.outcome:reject`.
- **Obtido:** o pedido grava `walletId: 'wallet-ana-principal'`, `provider: 'coinbase'`.
- **Onde:** `checkout-page.tsx:157-163` (só compara endereço e rede) e a montagem da carteira no `POST /orders`.

## Baixo

### Funcionais
6. **Página do catálogo fora do intervalo (R):** `/?page=999#catalogo` anuncia "página 999 de 4" e mostra "Nenhum NFT encontrado. Tente outros termos ou remova filtros", sem filtros ativos e sem botão. Já `/atividade?page=99` trata bem ("Ir para a primeira página"). Onde: `catalog-section.tsx:110` e a rota `/`.
7. **A busca "ape" devolve os 36 NFTs (R):** todos têm `collection: 'Kurio Apes'` (`src/mocks/fixtures/nfts.ts:93`), e a busca inclui a coleção.
8. **Filtros em URL escrita à mão são descartados sem aviso (R):** `/?minPrice=1&maxPrice=1.5` e `/?categories=musica` caem no catálogo sem filtro. Só funciona o formato JSON do TanStack Router. A API aceita `minPrice=1`; quem descarta é o `.catch` do `catalogSearchSchema`.
9. **Sessão expirada mostra "erro de conexão" (R):** com `mock:session-ttl=6`, em `/perfil/carteiras`, recarregando depois de expirar. O modal de login aparece certo, mas a página atrás diz "Não foi possível carregar suas carteiras. Verifique sua conexão…".
10. **Skeleton dos filtros eterno (R):** com `{"*":"failure"}` em `/`, o erro do catálogo aparece, mas os skeletons do aside (`FiltersSkeleton`) continuam animando.
11. **Timeout sem feedback por ~33 s (R):** com `cart.get:timeout`, o checkout fica em skeleton sem alerta durante 3 tentativas × 10 s (`app/query-client.ts`).
12. **Texto de estoque confuso (R):** adicionando uma edição que já está no carrinho no limite, a mensagem é "Só há 1 disponíveis". Não diz que o item já está no carrinho, e a concordância está errada.
13. **Mensagens da API em inglês (R):** padrão do Zod, por exemplo:
    - `POST /cart/items` com `quantity: 1.5` → "Invalid input: expected int, received number";
    - `POST /me/wallets` sem `nickname` → "…expected string, received undefined".

### Acessibilidade
14. **Foco perdido ao remover item do carrinho (R):** pelo teclado, `document.activeElement` vira `BODY` (390 e 1440), tanto removendo um item quanto o último.
15. **Foco perdido ao fechar "Pagamento recusado" (R):** com `?mock=payment.outcome:reject`, Esc no diálogo leva o foco para `BODY`, e não para "Confirmar compra".
16. **Páginas 404 sem `h1` (R):** `/rota-x`, `/paginas/xyz` e `/nft/nao-existe` geram `page-has-heading-one` (moderate). O `EmptyState` usa `<p>` no título (`components/feedback/states.tsx:31`).
17. **`landmark-unique` (moderate) no perfil a 1440 px (R):** `/perfil`, `/perfil/carteiras` e `/perfil/lista-de-interesse`, no seletor `.w-[310px]`.

## Suspeitos (leitura do código, não reproduzidos)
- **Médio:** a confirmação (`settle`) remove do carrinho o item inteiro pelo id. Se a quantidade mudou enquanto o pedido estava `pending` (1 comprada, mudou para 3), o item todo sai.
- **Baixo:** no mesmo `settle`, se o pedido tinha cupom, o cupom atual do carrinho é removido, mesmo que seja outro aplicado durante o `pending`.
- **Baixo:** baixa de estoque dupla com várias abas. `resumePendingSettlements` roda no MSW de cada aba e o check-then-write no `localStorage` não é atômico entre abas.
- **Baixo:** a idempotência por chave só é garantida dentro de uma aba (cada aba tem o próprio MSW).
- **Baixo:** `VersionGate.observe` (`src/lib/socket/version-gate.ts`) nunca é chamado.
- **Baixo:** o endereço de carteira não é único entre usuários (Bruno salvou o endereço da Ana). Pode ser limitação aceitável do mock.

## Verificado sem problemas
- **Layout e console:** sem overflow em 390/768/1440 (15 rotas públicas e 5 privadas) e sem erros de console além dos 4xx esperados.
- **Catálogo:** filtros combinados, ordenação, paginação e voltar/avançar.
- **Detalhe:** o stepper respeita o estoque, inclusive quando ele cai via socket; duplo clique em COMPRAR gera um POST só.
- **Carrinho:** cupons (normalização, expirado, mínimo), persistência e merge anônimo → login.
- **Checkout:**
  - duplo/triplo clique gera um único `POST /orders`;
  - timeout e refresh recuperam o pedido pela `Idempotency-Key`;
  - conflito de preço mostra o diff;
  - recusa mantém o carrinho.
- **Pedidos:** 405 ao alterar pedido/recibo; IDOR bloqueado (404).
- **Auth:** validações, duplicados, open redirect bloqueado, expiração com retorno ao fluxo e troca de conta sem vazar dados (inclusive entre abas).
- **Perfil e carteiras:** validações de avatar, senha e carteira.
- **Tempo real:** compra numa aba reflete na outra; duplicados, eventos antigos e payloads inválidos ignorados; reconexão com refetch.
- **axe** em 10 telas × 2 viewports: só os itens 16 e 17, de impacto moderado.
