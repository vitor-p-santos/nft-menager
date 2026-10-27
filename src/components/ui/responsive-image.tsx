import type { ComponentProps } from 'react'
import { IMAGE_MANIFEST } from '@/lib/image/manifest.gen'

type ResponsiveImageProps = ComponentProps<'img'> & {
  src: string
  /** Obrigatório: texto da arte ou `""` quando é decorativa (o nome já está ao lado). */
  alt: string
  /** Largura exibida por breakpoint (atributo `sizes`); define qual largura o navegador baixa. */
  sizes: string
}

/**
 * `<img>` com AVIF/WebP responsivos (T-100). Se `src` tem versões otimizadas (`npm run images` gera o
 * manifesto a partir de `public/images/nfts`), vira `<picture>` com `srcset` por largura; o PNG
 * original fica só como fallback. O `<picture>` usa `display: contents` para o `<img>` continuar
 * sendo o item de layout (flex/grid/absolute), e `width`/`height` seguem reservando o espaço.
 */
export function ResponsiveImage({ src, sizes, alt, ...props }: ResponsiveImageProps) {
  const entry = IMAGE_MANIFEST[src]
  if (!entry) return <img src={src} sizes={sizes} alt={alt} {...props} />
  const srcSet = (format: 'avif' | 'webp') => entry.widths.map((w) => `${entry.base}-${w}.${format} ${w}w`).join(', ')
  return (
    <picture className="contents">
      {/* `hidden`: com o pai em `contents`, os <source> virariam itens de flex/grid (e ganhariam `gap`).
          O CSS não afeta a escolha da fonte, que é feita pelos atributos. */}
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} className="hidden" />
      <source type="image/webp" srcSet={srcSet('webp')} sizes={sizes} className="hidden" />
      <img src={src} alt={alt} {...props} />
    </picture>
  )
}
