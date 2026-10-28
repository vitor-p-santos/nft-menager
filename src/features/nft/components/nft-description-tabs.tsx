import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NETWORK_LABELS, type Nft } from '@/entities/nft'
import { NftReviews } from './nft-reviews'

/**
 * Figma "Description": abas "Detalhes do NFT" e "Avaliações de colecionadores (N)".
 * No Figma os textos de Rede, Contrato e Direitos autorais aparecem trocados; aqui cada rótulo
 * mostra o próprio dado da API (ver relatório da Fase 2 em ARCHITECTURE.md).
 */
export function NftDescriptionTabs({ nft }: { nft: Nft }) {
  const royalty = (nft.royaltyBps / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  return (
    <Tabs defaultValue="detalhes" className="gap-0">
      <TabsList aria-label="Informações do NFT">
        <TabsTrigger value="detalhes">Detalhes do NFT</TabsTrigger>
        <TabsTrigger value="avaliacoes">
          <span>
            Avaliações<span className="hidden md:inline"> de colecionadores</span> ({nft.reviewsCount})
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="detalhes" className="flex flex-col gap-3 text-body leading-6">
        <div className="flex flex-col gap-6 text-muted-foreground">
          {nft.details.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd className="text-muted-foreground">{NETWORK_LABELS[nft.network]}</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd className="break-all text-muted-foreground">{nft.contractAddress}</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd className="text-muted-foreground">{royalty}% para o criador nas vendas secundárias</dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="avaliacoes">
        <NftReviews nftId={nft.id} />
      </TabsContent>
    </Tabs>
  )
}
