# Spec 001 — Kurio NFT Marketplace

- **Status:** Rascunho aprovado para implementação
- **Fonte de design:** Figma `hM1w5sJ9EKqqdJTLazjE7u` (cópia de "Frontend-Challenge"), página *Marketplace de NFTs GreenMint*
- **Referências visuais locais:** `design/figma/*.png` (recortes 1:1 de cada frame)
- **Inventário de design:** [design-inventory.md](./design-inventory.md)

## 1. Visão

Marketplace de NFTs da marca **Kurio** (tema escuro, marrom/âmbar, tipografia monoespaçada). Colecionadores exploram o catálogo, favoritam, montam um carrinho, pagam com uma carteira em uma rede e acompanham o pedido até a confirmação, com atualizações em tempo real.

## 2. Telas no Figma

| # | Tela | Desktop (1440) | Mobile (414 → alvo 390) | Rota |
|---|---|---|---|---|
| 1 | Início / catálogo | `2:2` | `14:5226` | `/` |
| 2 | Detalhes do NFT | `10:244` | `15:5536` | `/nft/$nftId` |
| 3 | Carrinho | `11:1278` | `16:360` | `/carrinho` |
| 4 | Pagamento (checkout) | `11:2862` | `16:748` | `/checkout` |
| 5 | Confirmação de pedido (modal) | `11:4385` | — *(derivar)* | `/pedidos/$orderId` |
| 6 | Login (modal desktop / página mobile) | `9:115` | `16:1022` | `?auth=login` · `/entrar` |
| 7 | Cadastro (modal desktop / página mobile) | `9:1022` | `16:1228` | `?auth=cadastro` · `/cadastro` |
| 8 | Perfil do colecionador | `9:1238` | — *(derivar)* | `/perfil` |
| 9 | Carteiras | `9:1670` | — *(derivar)* | `/perfil/carteiras` |

O Figma não tem frames de tablet (768): esse layout é derivado dos frames de desktop e mobile (ver research.md, D-01).

## 3. Histórias de usuário e critérios de aceite

### US-01 Explorar o catálogo (P1)
Como visitante, quero buscar, filtrar e ordenar NFTs para encontrar o que colecionar.
- **Busca** por texto (ícone de lupa no header desktop e campo "Explorar coleções" no mobile).
- **Filtros combináveis:** coleção/categoria (Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade, com contagem), faixa de preço (slider duplo, "Preço: 0,02 – 12,30 ETH", botão "Aplicar") e rede (Ethereum, Polygon, Solana, com contagem).
- **Abas:** Todos os NFTs · Novos lançamentos · Em alta.
- **Ordenação:** "Listados recentemente" (padrão), menor preço, maior preço e mais populares.
- **Paginação** numerada com botão de próxima página.
- **URL sincronizada:** todo estado (q, categorias, redes, preço, aba, ordenação, página) vive nos search params. Recarregar a página ou compartilhar a URL reproduz a mesma lista, e mudar um filtro volta para a página 1.
- Os cards mostram imagem, nome, preço em ETH, preço anterior riscado quando há desconto e o selo "RARO". No hover/foco aparecem as ações adicionar ao carrinho, favoritar e ver detalhes.
- A contagem dos facets reflete os filtros aplicados.
- Estados: skeleton com shimmer, lista vazia ("nenhum NFT encontrado" com ação de limpar filtros) e erro com "tentar novamente".
- O mobile tem um botão de filtros que abre o painel de filtros (sheet) e uma barra de abas inferior.

### US-02 Conteúdo da Home (P2)
- Hero com carrossel (indicadores em pontos), CTA "EXPLORAR" que rola até o catálogo, card "NFT em destaque / Oferta limitada", 2 banners promocionais, blog "Diário da Cunhagem" (4 posts) e footer com newsletter.
- Todo esse conteúdo vem da API.

### US-03 Detalhe do NFT (P1)
- Breadcrumb, galeria (miniaturas + imagem principal com zoom), nome, preço, avaliação (estrelas + quantidade), descrição, edição (chips 1/1, 1/10, 1/50, ABERTA), seletor de quantidade, "Comprar", "Favoritar", ID do token, coleção, atributos e compartilhamento.
- Abas "Detalhes do NFT" e "Avaliações de colecionadores (N)".
- Carrossel "Mais desta coleção".
- A quantidade fica limitada entre 1 e a disponibilidade da edição escolhida, e a disponibilidade é revalidada no servidor.
- "Comprar" adiciona ao carrinho e leva ao carrinho. O botão de carrinho no mobile só adiciona e dá feedback.
- Favoritar exige login: sem sessão, abre o login e, depois de entrar, conclui a ação.
- Preço e disponibilidade se atualizam em tempo real (`nft.updated`).

### US-04 Carrinho (P1)
- Lista de itens com imagem, nome, ID do token/edição, preço unitário, quantidade (+/−), total da linha e remoção.
- Resumo: código promocional (Aplicar), subtotal, "Desconto do lançamento", "Taxa de rede" (taxa estimada) e total.
- "Conectar e finalizar" leva ao checkout (exige login). "Continuar explorando" volta ao catálogo.
- O carrinho persiste entre refresh e sessões: o do visitante é anônimo e, no login, é mesclado ao carrinho do usuário.
- Cupom inválido ou expirado mostra erro acessível no campo, e os valores não mudam.
- Os cálculos são exatos em wei, e o servidor é a fonte do total.
- Se um item mudar de preço ou ficar indisponível (via socket ou revalidação), o carrinho sinaliza na linha.
- Estado vazio com CTA para o catálogo.

### US-05 Checkout (P1)
- **Revisão:** itens, quantidades, subtotais, cupom, taxa e total.
- **Carteira:** escolher uma carteira salva (mobile: "Reserva", "Principal") ou um provedor (MetaMask, WalletConnect, Coinbase Wallet), com "Trocar carteira".
- **Rede:** a rede da carteira define a rede do pedido.
- O formulário do desktop ("Perfil do colecionador": nome de exibição, usuário, rede, endereço 0x, tipo de carteira, código de indicação, e-mail, nome ENS, observação) é validado com Zod.
- **Antes de comprar,** o sistema revalida preço, disponibilidade, cupom e taxa (`POST /checkout/quote`). Se algo mudou, mostra a diferença e pede uma nova confirmação.
- "Confirmar compra" cria o pedido com uma `Idempotency-Key`. Duplo clique, retry ou refresh nunca geram dois pedidos.
- Timeout ou refresh durante a compra: o pedido em andamento é recuperado pela chave salva e o usuário vê o status real.
- A confirmação só aparece quando a API confirma o pedido. Se o pagamento falhar, os itens continuam no carrinho.

### US-06 Pedidos e recibos (P1)
- Estados: `pending` → `confirmed` | `rejected`, com transições por `order.updated` ou polling de fallback.
- Confirmado: modal/página de recibo com ID da transação, data, total, carteira, itens, taxa, total, mensagem de confirmação e "Ver no Etherscan".
- Recusado: motivo, itens mantidos no carrinho e opção de tentar de novo.
- **Recibos imutáveis:** são um snapshot do pedido no momento da confirmação, e mudanças posteriores de preço ou NFT não os alteram.
- Lista de pedidos em "Atividade", no menu do perfil.

### US-07 Conta e sessão (P1)
- Cadastro (usuário, e-mail, senha, confirmação), login (e-mail, senha, mostrar/ocultar senha) e logout.
- No desktop são modais com abas "Entrar | Criar conta" sobre a página atual. No mobile são páginas.
- Expiração de sessão: um 401 `session_expired` abre o login, e depois de entrar o usuário volta ao fluxo anterior, com a mesma rota, os mesmos search params e a ação pendente.
- Trocar de conta limpa o cache do Query, as subscriptions do socket e os dados privados.
- Pelo menos 2 usuários de fixture.

### US-08 Perfil (P2)
- Menu lateral: Dados do perfil, Carteiras, Atividade, Lista de interesse, Ofertas, Arquivos baixados, Suporte e Sair.
- Dados do perfil: nome de exibição, usuário, e-mail, nome ENS (.eth), apelido da carteira, avatar (Alterar/Remover) e "Salvar".
- Alterar senha: senha atual, nova e confirmação.
- Upload de avatar com prévia e validação de tipo e tamanho.

### US-09 Carteiras (P2)
- Carteira principal: nome de exibição, apelido, rede, nome do perfil, endereço 0x, ENS opcional, tipo de carteira, código de indicação, e-mail e nome ENS.
- Carteira secundária: "Igual à carteira principal" ou "Adicionar". Também é possível editar, remover e definir a principal.
- As carteiras salvas aparecem no checkout.

### US-10 Tempo real (P1)
- Eventos `nft.updated` (preço, disponibilidade, status) e `order.updated` (status, txHash, motivo).
- Cada evento tem `eventId` e `version`: duplicatas e eventos antigos são descartados.
- Desconexão mostra um indicador discreto. Na reconexão, os dados afetados são revalidados (refetch).
- A subscription é por usuário e é trocada no login e no logout.

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| NFR-01 | Responsivo em 390, 768 e 1440 px, sem overflow horizontal |
| NFR-02 | CLS ≈ 0: imagens com aspect-ratio reservado, skeletons com a mesma geometria e fonte self-hosted |
| NFR-03 | WCAG 2.1 AA (axe sem violações), teclado completo, foco visível, `prefers-reduced-motion` |
| NFR-04 | Lighthouse: 3 execuções por página e perfil (mobile/desktop), medianas de LCP, CLS e TBT registradas |
| NFR-05 | Testes visuais com baselines versionadas: início, detalhe, carrinho e pagamento |
| NFR-06 | Deploy público (Vercel) com o MSW servindo os mocks em produção |

## 5. Decisões de escopo (ver research.md)
- Login social (Google/Facebook): OAuth simulado pelo MSW, autenticando um usuário de fixture vinculado ao provedor (D-05).
- "Mercado" vai ao catálogo, "Aprenda" ao blog e "Criadores" a um filtro por criador. "Ofertas", "Arquivos baixados" e "Suporte" ficam ocultos (D-06).
- "Esqueceu a senha?" abre um modal com e-mail e uma resposta neutra (D-07).
