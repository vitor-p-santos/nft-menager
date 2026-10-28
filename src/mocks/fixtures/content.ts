import type { HomeContent, SiteSettings } from '@/features/home/schemas/content'

const art = (file: string, alt: string) => ({ src: `/images/nfts/${file}`, alt, width: 1254, height: 1254 })

/** Conteúdo editorial da Home. Textos do slide 1, promos e posts conforme o Figma. */
export const HOME_CONTENT: Omit<HomeContent, 'featured'> & { featuredSlug: string } = {
  hero: [
    {
      id: 'hero-futuro',
      eyebrow: 'Bem-vindo à Kurio',
      title: 'SEJA DONO DO FUTURO DA ARTE DIGITAL',
      mobileTitle: 'SEJA DONO DA CULTURA DIGITAL',
      description:
        'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
      mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
      ctaLabel: 'EXPLORAR',
      image: art('ape-emerald.png', 'Emerald Ape, macaco de óculos e jaqueta verde'),
      secondaryImage: art('ape-sage.png', 'Sage Nomad, gorila de chapéu e moletom roxo'),
    },
    {
      id: 'hero-colecoes',
      eyebrow: 'Coleções verificadas',
      title: 'COLECIONE EDIÇÕES RARAS DIRETO DOS CRIADORES',
      mobileTitle: 'EDIÇÕES RARAS DOS CRIADORES',
      description:
        'Edições limitadas com procedência registrada na rede, direitos autorais automáticos e acesso antecipado aos próximos lançamentos.',
      mobileDescription: 'Edições limitadas com procedência registrada.',
      ctaLabel: 'EXPLORAR',
      image: art('ape-ivory.png', 'Ivory Baron, macaco de terno claro'),
      secondaryImage: art('ape-golden.png', 'Golden Beat, macaco dourado com fones'),
    },
    {
      id: 'hero-som',
      eyebrow: 'Em alta',
      title: 'A CULTURA DA INTERNET AGORA É SUA',
      mobileTitle: 'A CULTURA DA INTERNET É SUA',
      description:
        'Música, arte 3D e colecionáveis generativos dos artistas que estão definindo o que vem a seguir no universo digital.',
      mobileDescription: 'Música, arte 3D e colecionáveis generativos.',
      ctaLabel: 'EXPLORAR',
      image: art('ape-golden.png', 'Golden Beat, macaco dourado com fones'),
      secondaryImage: art('ape-emerald.png', 'Emerald Ape, macaco de óculos e jaqueta verde'),
    },
  ],
  featuredSlug: 'sage-nomad-009',
  promos: [
    {
      id: 'promo-genesis',
      title: 'Lançamentos gênesis de edição limitada',
      description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
      ctaLabel: 'Explorar',
      image: art('ape-emerald.png', 'Emerald Ape'),
      search: { tab: 'new' },
    },
    {
      id: 'promo-curadoria',
      title: 'Arte digital selecionada e muito mais',
      description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
      ctaLabel: 'Explorar',
      image: art('ape-ivory.png', 'Ivory Baron'),
      search: { categories: ['arte-digital'] },
    },
  ],
  posts: [
    {
      id: 'post-propriedade',
      publishedAt: '2026-09-12',
      readingMinutes: 6,
      title: 'Como funciona a propriedade de NFTs',
      excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
      body: [
        'Um NFT é um registro único na blockchain que aponta para uma obra e identifica quem a possui. Ao comprar, o token é transferido para a sua carteira.',
        'A procedência fica pública: qualquer pessoa pode verificar o histórico de donos, o contrato e os direitos autorais configurados pelo criador.',
        'Na Kurio, cada edição mostra o ID do token, a coleção e os atributos armazenados nos metadados, para que você saiba exatamente o que está colecionando.',
      ],
      image: art('ape-ivory.png', 'Ivory Baron'),
    },
    {
      id: 'post-artistas',
      publishedAt: '2026-09-13',
      readingMinutes: 2,
      title: '10 artistas digitais para acompanhar',
      excerpt: 'Conheça criadores que moldam a cultura digital.',
      body: [
        'De Nova Sato a Rafa Okoye, reunimos criadores que estão experimentando com arte generativa, música on-chain e colecionáveis em 3D.',
        'Use o filtro de criadores no catálogo para acompanhar os lançamentos de cada artista.',
      ],
      image: art('ape-emerald.png', 'Emerald Ape'),
    },
    {
      id: 'post-raridade',
      publishedAt: '2026-09-15',
      readingMinutes: 3,
      title: 'Raridade, atributos e procedência',
      excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
      body: [
        'A raridade de um NFT depende do tamanho da edição (1/1, 1/10, 1/50 ou aberta) e da combinação de atributos.',
        'A procedência registra cada transferência. Os direitos autorais garantem ao criador uma porcentagem das vendas secundárias.',
      ],
      image: art('ape-sage.png', 'Sage Nomad'),
    },
    {
      id: 'post-carteira',
      publishedAt: '2026-09-15',
      readingMinutes: 2,
      title: 'Como proteger sua carteira',
      excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
      body: [
        'Nunca compartilhe sua frase de recuperação. Nenhum suporte legítimo vai pedir por ela.',
        'Confira sempre a rede e o endereço antes de confirmar uma compra, e prefira carteiras compatíveis como MetaMask, WalletConnect e Coinbase Wallet.',
      ],
      image: art('ape-golden.png', 'Golden Beat'),
    },
  ],
}

/** Contato e redes sociais exibidos no footer (D-10). */
export const SITE_SETTINGS: SiteSettings = {
  contact: { email: 'contato@email.com', phone: '+55 11 4002 8922', phoneHref: 'tel:+551140028922' },
  socials: [
    { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/kurio' },
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/kurio' },
    { id: 'twitter', label: 'Twitter', url: 'https://x.com/kurio' },
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/kurio' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@kurio' },
  ],
}
