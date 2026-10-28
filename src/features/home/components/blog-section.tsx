import { useRef, useState } from 'react'
import { Container } from '@/components/layout/container'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Post } from '../schemas/content'
import { ResponsiveImage } from '@/components/ui/responsive-image'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

function PostMeta({ post }: { post: Post }) {
  return (
    <p className="text-caption leading-4 text-muted-foreground">
      <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
      <span aria-hidden className="mx-3">|</span>
      <span>Leitura de {post.readingMinutes} min</span>
    </p>
  )
}

/** "Diário da Cunhagem" (Figma "Blog"): cards de 268px; "Ler mais" abre o post num modal. */
export function BlogSection({ posts }: { posts: Post[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  // O último post fica montado durante o fechamento, para o Radix rodar onCloseAutoFocus
  const [shownId, setShownId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const open = posts.find((p) => p.id === shownId)
  if (posts.length === 0) return null

  return (
    <section id="diario" aria-labelledby="diario-titulo" tabIndex={-1} className="mt-16 scroll-mt-6 focus-visible:outline-none xl:mt-[115px]">
      <Container>
        <header className="flex flex-col items-center gap-3 text-center">
          {/* 28px medido no recorte do Figma (não há variável tipográfica para este título) */}
          <h2 id="diario-titulo" className="text-heading-lg leading-9 font-bold text-foreground">
            Diário da Cunhagem
          </h2>
          <p className="text-body leading-6 text-muted-foreground">
            Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
          </p>
        </header>
        <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-[repeat(4,268px)]">
          {posts.map((post) => (
            <li key={post.id}>
              <article className="relative flex h-full flex-col overflow-hidden rounded-lg bg-card">
                <ResponsiveImage
                  src={post.image.src}
                  sizes="(min-width: 1280px) 270px, (min-width: 768px) 45vw, 100vw"
                  alt=""
                  width={268}
                  height={195}
                  loading="lazy"
                  className="aspect-[268/195] w-full object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <PostMeta post={post} />
                  <h3 className="mt-1 text-body-md leading-[21px] font-bold text-foreground">{post.title}</h3>
                  <p className="text-caption leading-4 text-text-secondary">{post.excerpt}</p>
                  <button
                    type="button"
                    onClick={(event) => {
                      triggerRef.current = event.currentTarget
                      setShownId(post.id)
                      setOpenId(post.id)
                    }}
                    aria-haspopup="dialog"
                    className="mt-1 w-max cursor-pointer text-caption leading-4 font-bold text-text-accent after:absolute after:inset-0 hover:underline"
                  >
                    Ler mais <span aria-hidden>→</span>
                    <span className="sr-only">: {post.title}</span>
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>

      <Dialog open={openId !== null} onOpenChange={(value) => !value && setOpenId(null)}>
        {open && (
          <DialogContent
            onCloseAutoFocus={(event) => {
              // Devolve o foco ao "Ler mais" que abriu o modal (Esc, overlay ou "Fechar")
              event.preventDefault()
              triggerRef.current?.focus()
            }}
            className="max-h-[90dvh] gap-0 overflow-y-auto border-border bg-card p-0 sm:max-w-xl [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-card [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:opacity-100">
            <ResponsiveImage
              src={open.image.src}
              sizes="(min-width: 640px) 576px, 100vw"
              alt={open.image.alt}
              width={576}
              height={300}
              className="aspect-[576/300] w-full object-cover"
            />
            <div className="flex flex-col gap-3 p-6">
              <PostMeta post={open} />
              <DialogTitle className="text-heading leading-8 font-bold text-foreground">{open.title}</DialogTitle>
              <DialogDescription className="text-body leading-6 text-text-secondary">{open.excerpt}</DialogDescription>
              <div className="flex flex-col gap-3 text-body leading-6 text-foreground">
                {open.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}
