import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { Cart } from '@/entities/cart'
import type { Order } from '@/entities/order'
import { useCurrentUser } from '@/entities/session'
import { ApiError } from '@/lib/api'
import {
  checkoutQueries,
  getCheckoutConflictChanges,
  useCheckoutOrder,
  useCreateOrder,
  useRequestQuote,
} from '../api'
import type { CreateOrderInput, Quote, QuoteChange } from '../schemas/checkout'

/** O que a tela envia em "Confirmar compra" (a cotação é escolhida pelo fluxo). */
export type CheckoutSubmission = Omit<CreateOrderInput, 'quoteId'>

export type CheckoutFlow = {
  /** Cotação exibida (sempre a mais recente do servidor). */
  quote: Quote | null
  /** Mudanças da primeira cotação (o carrinho mudou desde que o usuário o viu): aviso não bloqueante. */
  initialChanges: QuoteChange[]
  quoteError: { title: string; description: string; retry: boolean } | null
  retryQuote: () => void
  /** Cotação com mudanças esperando nova confirmação (T-072). */
  changedQuote: Quote | null
  confirmChanges: () => void
  dismissChanges: () => void
  submit: (submission: CheckoutSubmission) => void
  /** Cotando, criando o pedido ou esperando o status: o botão fica desabilitado. */
  isSubmitting: boolean
  /** Erro da última tentativa, para o `role="alert"` perto do botão. */
  error: string | null
  /** Pedido acompanhado (criado agora ou recuperado após timeout/refresh). */
  order: Order | null
  dismissOrder: () => void
}

/** Mensagem acessível para a falha ao criar o pedido (o carrinho nunca é alterado aqui). */
const QUOTE_BLOCKED_TITLES: Record<string, string | undefined> = {
  cart_empty: 'Nada para comprar',
  mixed_networks: 'Finalize uma rede por vez',
}

function submitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Não foi possível concluir a compra. Tente novamente.'
  switch (error.kind) {
    case 'timeout':
    case 'network':
    case 'unavailable':
      return 'Não recebemos a resposta do pagamento. Tente novamente: a compra não será duplicada.'
    case 'unauthorized':
      return 'Sua sessão expirou. Entre novamente para concluir a compra.'
    case 'validation': {
      const details = Object.values(error.details ?? {}).filter((v): v is string => typeof v === 'string')
      return details.length > 0 ? `Revise os dados: ${details.join(' ')}` : error.message
    }
    default:
      return error.message || 'Não foi possível concluir a compra. Tente novamente.'
  }
}

/**
 * Orquestra o pagamento (T-071 a T-074) sobre a camada de dados de `../api`:
 * 1. ao abrir, `POST /checkout/quote` com a versão do carrinho exibida (e recupera um pedido em
 *    andamento salvo pela `Idempotency-Key`, se houver);
 * 2. "Confirmar compra" sempre revalida (nova cotação). Se algo mudou, para e pede nova confirmação;
 * 3. cria o pedido (`useCreateOrder` cuida da chave, do duplo clique e da recuperação após timeout);
 *    409 → nova cotação + diff; outros erros → mensagem, carrinho intacto;
 * 4. acompanha o pedido até `confirmed`/`rejected` (`useCheckoutOrder`).
 */
export function useCheckoutFlow(cart: Cart | undefined): CheckoutFlow {
  const user = useCurrentUser()
  const requestQuote = useRequestQuote()
  const createOrder = useCreateOrder()
  const recovery = useQuery({ ...checkoutQueries.recovery(user?.id ?? ''), enabled: user !== null })

  const [quote, setQuote] = useState<Quote | null>(null)
  const [initialChanges, setInitialChanges] = useState<QuoteChange[]>([])
  const [quoteError, setQuoteError] = useState<CheckoutFlow['quoteError']>(null)
  const [changedQuote, setChangedQuote] = useState<Quote | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  /** Trava síncrona contra duplo clique (o estado do React só muda no próximo render). */
  const busyRef = useRef(false)
  const pendingSubmission = useRef<CheckoutSubmission | null>(null)
  const quotedOnce = useRef(false)

  const orderQuery = useCheckoutOrder(orderId)
  const order = orderId ? (orderQuery.data ?? null) : null

  // Compra em andamento recuperada (refresh/timeout): passa a acompanhar o pedido salvo
  const recovered = recovery.data?.order.id
  useEffect(() => {
    if (recovered) setOrderId((current) => current ?? recovered)
  }, [recovered])

  function loadQuote(cartVersion: number) {
    setQuoteError(null)
    requestQuote.mutate(
      { cartVersion },
      {
        onSuccess: (next) => {
          setQuote(next)
          setInitialChanges(next.changes)
        },
        onError: (cause) => {
          // Sem como cotar (carrinho vazio ou NFTs de redes diferentes): o caminho é voltar ao carrinho
          const blocked = cause instanceof ApiError ? QUOTE_BLOCKED_TITLES[cause.code] : undefined
          if (blocked) {
            setQuoteError({ title: blocked, description: cause.message, retry: false })
            return
          }
          setQuoteError({ title: 'Não foi possível revisar o pedido', description: 'Verifique sua conexão e tente novamente.', retry: true })
        },
      },
    )
  }

  // Primeira cotação, assim que o carrinho chega (uma vez; refetches do carrinho não recotam)
  const cartVersion = cart && cart.items.length > 0 ? cart.version : null
  useEffect(() => {
    if (cartVersion === null || quotedOnce.current) return
    quotedOnce.current = true
    loadQuote(cartVersion)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara só na primeira versão conhecida
  }, [cartVersion])

  async function placeOrder(submission: CheckoutSubmission, quoteId: string, baseVersion: number) {
    try {
      const { order: created } = await createOrder.mutateAsync({ ...submission, quoteId })
      setOrderId(created.id)
    } catch (cause) {
      if (cause instanceof ApiError && cause.kind === 'conflict') {
        // Algo mudou entre a cotação e o pedido: nova cotação com o diff e nova confirmação
        const conflict = getCheckoutConflictChanges(cause)
        const fresh = await requestQuote.mutateAsync({ cartVersion: baseVersion })
        setQuote(fresh)
        pendingSubmission.current = submission
        setChangedQuote({ ...fresh, changes: fresh.changes.length > 0 ? fresh.changes : conflict })
        return
      }
      throw cause
    }
  }

  async function run(task: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setWorking(true)
    setError(null)
    try {
      await task()
    } catch (cause) {
      setError(submitErrorMessage(cause))
    } finally {
      busyRef.current = false
      setWorking(false)
    }
  }

  function submit(submission: CheckoutSubmission) {
    const current = quote
    if (!current) return
    void run(async () => {
      // Revalidação pré-compra: preço, estoque, cupom e taxa
      const fresh = await requestQuote.mutateAsync({ cartVersion: current.cartVersion })
      setQuote(fresh)
      if (fresh.changes.length > 0) {
        pendingSubmission.current = submission
        setChangedQuote(fresh)
        return
      }
      await placeOrder(submission, fresh.id, fresh.cartVersion)
    })
  }

  function confirmChanges() {
    const submission = pendingSubmission.current
    const accepted = changedQuote
    if (!submission || !accepted) return
    setChangedQuote(null)
    void run(() => placeOrder(submission, accepted.id, accepted.cartVersion))
  }

  return {
    quote,
    initialChanges,
    quoteError,
    retryQuote: () => {
      if (cart) loadQuote(cart.version)
    },
    changedQuote,
    confirmChanges,
    dismissChanges: () => {
      pendingSubmission.current = null
      setChangedQuote(null)
    },
    submit,
    isSubmitting: working || order?.status === 'pending',
    error,
    order,
    dismissOrder: () => {
      setOrderId(null)
      if (order?.status === 'rejected') setError('Pagamento recusado. Seus itens continuam no carrinho; revise e tente novamente.')
    },
  }
}
