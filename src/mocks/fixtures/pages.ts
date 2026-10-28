import type { Page, PageSlug } from '@/features/pages/schemas/page'

/** Páginas institucionais sem frame no Figma (D-10), servidas por `GET /content/pages/:slug`. */
export const PAGES: Record<PageSlug, Page> = {
  'central-de-ajuda': {
    slug: 'central-de-ajuda',
    title: 'Central de ajuda',
    summary: 'Respostas rápidas sobre conta, compras, pagamentos e pedidos na Kurio.',
    updatedAt: '2026-10-20',
    sections: [
      {
        heading: 'Conta e acesso',
        paragraphs: [
          'Você pode navegar pelo mercado sem conta, mas precisa entrar para finalizar uma compra, salvar favoritos e acompanhar seus pedidos.',
          'Por segurança, a sessão expira após um período sem atividade. Ao entrar de novo, você volta exatamente para onde estava.',
        ],
      },
      {
        heading: 'Pedidos e pagamentos',
        paragraphs: [
          'Todo pedido começa como pendente e só é confirmado depois que a rede registra a transação. Você acompanha o status em tempo real na página do pedido.',
          'Se o pagamento for recusado, os itens continuam no seu carrinho para uma nova tentativa, sem cobrança duplicada.',
        ],
      },
      {
        heading: 'Fale com a gente',
        paragraphs: [
          'Não encontrou o que procurava? Escreva para o nosso time pelo e-mail ou telefone indicados no rodapé. Respondemos em até um dia útil.',
        ],
      },
    ],
  },
  'como-comprar': {
    slug: 'como-comprar',
    title: 'Como comprar NFTs',
    summary: 'Do primeiro clique ao recibo: o passo a passo para colecionar arte digital na Kurio.',
    updatedAt: '2026-10-18',
    sections: [
      {
        heading: '1. Encontre a obra',
        paragraphs: [
          'Explore o mercado por categoria, rede, faixa de preço ou criador. Os filtros podem ser combinados e ficam salvos no endereço da página, então você pode compartilhar a sua busca.',
        ],
      },
      {
        heading: '2. Adicione ao carrinho',
        paragraphs: [
          'Na página do NFT, escolha a quantidade disponível e adicione ao carrinho. Ele fica salvo mesmo que você feche o navegador, e é mesclado com a sua conta quando você entrar.',
          'Tem um cupom? Aplique no carrinho para ver o desconto antes de pagar.',
        ],
      },
      {
        heading: '3. Conecte a carteira e pague',
        paragraphs: [
          'No pagamento, conecte sua carteira e confira a rede. Antes de concluir, revalidamos preço, disponibilidade, cupom e taxa de rede, e avisamos se algo mudou.',
          'Os valores são exibidos em ETH, com a taxa de rede separada do subtotal.',
        ],
      },
      {
        heading: '4. Receba o recibo',
        paragraphs: [
          'Com a confirmação da rede, o pedido vira confirmado e o recibo fica disponível no seu histórico. Recibos são imutáveis: servem como comprovante permanente da compra.',
        ],
      },
    ],
  },
  'carteira-e-seguranca': {
    slug: 'carteira-e-seguranca',
    title: 'Carteira e segurança',
    summary: 'Boas práticas para proteger sua carteira e suas obras digitais.',
    updatedAt: '2026-10-15',
    sections: [
      {
        heading: 'Sua carteira, suas chaves',
        paragraphs: [
          'A Kurio nunca pede sua frase de recuperação nem sua chave privada. Qualquer mensagem que solicite esses dados é uma tentativa de golpe.',
          'Guarde a frase de recuperação fora do computador, em local seguro, e nunca a fotografe.',
        ],
      },
      {
        heading: 'Antes de assinar',
        paragraphs: [
          'Confira sempre a rede e o valor exibidos pela carteira antes de assinar uma transação. Eles devem bater com o resumo mostrado na tela de pagamento.',
          'Desconfie de links recebidos por mensagem direta. Acesse a Kurio digitando o endereço ou pelos nossos perfis oficiais.',
        ],
      },
      {
        heading: 'Proteja sua conta',
        paragraphs: [
          'Use uma senha forte e exclusiva. Você pode trocá-la a qualquer momento no seu perfil, onde também gerencia as carteiras vinculadas.',
        ],
      },
    ],
  },
  'politica-do-mercado': {
    slug: 'politica-do-mercado',
    title: 'Política do mercado',
    summary: 'As regras que mantêm a Kurio um lugar justo para colecionadores e criadores.',
    updatedAt: '2026-10-01',
    sections: [
      {
        heading: 'Originalidade e procedência',
        paragraphs: [
          'Só aceitamos obras cujos direitos pertencem ao criador que as publica. Coleções verificadas passam por checagem de identidade e de procedência na rede.',
        ],
      },
      {
        heading: 'Preços e taxas',
        paragraphs: [
          'O preço de cada item é definido pelo criador. A taxa de rede é calculada no momento do pagamento e exibida separadamente antes da confirmação.',
          'Direitos autorais sobre revendas são repassados automaticamente ao criador original.',
        ],
      },
      {
        heading: 'Conteúdo proibido',
        paragraphs: [
          'Não são permitidas cópias não autorizadas, conteúdo que incite ódio ou violência, nem itens usados para manipular preços. Itens que violem estas regras são removidos do mercado.',
        ],
      },
    ],
  },
  'denunciar-item': {
    slug: 'denunciar-item',
    title: 'Denunciar item',
    summary: 'Viu uma cópia, um golpe ou conteúdo impróprio? Conte para a gente.',
    updatedAt: '2026-09-28',
    sections: [
      {
        heading: 'O que denunciar',
        paragraphs: [
          'Obras plagiadas, perfis que se passam por criadores conhecidos, links suspeitos e qualquer item que viole a política do mercado.',
        ],
      },
      {
        heading: 'Como enviar',
        paragraphs: [
          'Escreva para o e-mail de contato informando o nome do item, o endereço da página e o motivo da denúncia. Se puder, inclua provas de autoria original.',
          'Todas as denúncias são analisadas pelo time de confiança e segurança em até 48 horas.',
        ],
      },
      {
        heading: 'O que acontece depois',
        paragraphs: [
          'Durante a análise, o item pode ficar indisponível para compra. Se a denúncia for confirmada, ele é removido e o responsável pode ter a conta suspensa.',
        ],
      },
    ],
  },
  'estudio-do-criador': {
    slug: 'estudio-do-criador',
    title: 'Estúdio do criador',
    summary: 'Publique suas obras, acompanhe vendas e receba direitos autorais na Kurio.',
    updatedAt: '2026-10-10',
    sections: [
      {
        heading: 'Publique suas coleções',
        paragraphs: [
          'No estúdio você cria coleções, define edições limitadas e escolhe a rede de cada lançamento. Lançamentos gênesis aparecem em destaque na aba de novidades.',
        ],
      },
      {
        heading: 'Acompanhe o desempenho',
        paragraphs: [
          'Veja vendas, visualizações e favoritos de cada obra, e saiba quais peças estão em alta no mercado.',
        ],
      },
      {
        heading: 'Direitos autorais automáticos',
        paragraphs: [
          'A cada revenda, a sua porcentagem é repassada automaticamente para a carteira cadastrada, sem intermediários.',
          'O estúdio está em fase de convites. Para participar, entre em contato pelo e-mail do rodapé contando um pouco sobre o seu trabalho.',
        ],
      },
    ],
  },
}
