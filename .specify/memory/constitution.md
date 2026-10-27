# Constituição — Kurio NFT Marketplace

Princípios que valem para toda decisão do projeto. Em conflito, a ordem abaixo define a prioridade.

## I. O Figma é a fonte da verdade visual
- Cores, tipografia, espaçamentos, raios, assets e textos vêm do arquivo Figma (`hM1w5sJ9EKqqdJTLazjE7u`).
- Nada é inventado quando pode ser consultado. Lacunas (telas ou estados ausentes) são **derivadas do design system existente** e registradas em `specs/001-nft-marketplace/research.md`.

## II. Comportamento real, nunca fachada
- Todo controle visível tem comportamento verificável. Se algo não puder ser implementado, a limitação é documentada e uma alternativa compatível é proposta.
- Uma funcionalidade só é marcada como concluída depois de verificada (typecheck, lint, testes e comparação visual).

## III. A API simulada é a única fonte de dados
- Componentes não contêm dados fictícios nem regras de negócio. Tudo passa por Axios tipado → TanStack Query → handlers MSW.
- Regras de preço, estoque, cupom, taxa e estado de pedido vivem nos handlers (servidor simulado), e o cliente só as revalida.

## IV. Dinheiro é exato
- Valores em ETH trafegam como string de wei e são calculados com `bigint`. `number` nunca é usado para valores monetários.

## V. Tipagem de ponta a ponta
- TypeScript strict. Schemas Zod definem contratos (respostas da API, formulários, search params), e os tipos derivam deles (`z.infer`).

## VI. Acessível e estável por padrão
- Teclado, foco visível, labels, `aria-live` para feedback, `prefers-reduced-motion`.
- Sem overflow horizontal e sem layout shift: imagens com dimensões reservadas e skeletons com a mesma geometria do conteúdo.

## VII. Reprodutível
- Cenários de falha (falha, latência, timeout, conflito, indisponibilidade) são acionáveis de forma determinística.
- Testes, baselines visuais e auditorias rodam com um único comando cada.
