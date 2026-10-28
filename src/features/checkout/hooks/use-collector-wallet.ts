import { useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { sameWalletAddress, stripEthSuffix, type Wallet } from '@/entities/wallet'
import type { CollectorFormValues, CollectorInput } from '../schemas/checkout'

type CollectorFormApi = UseFormReturn<CollectorFormValues, unknown, CollectorInput>

/** Valores do formulário a partir da carteira salva (o sufixo ".eth" é fixo no campo do ENS). */
function walletFields(wallet: Wallet) {
  return {
    network: wallet.network,
    walletAddress: wallet.address,
    walletProvider: wallet.provider,
    ensName: stripEthSuffix(wallet.ensName),
  }
}

/**
 * Carteira do colecionador no checkout (D-08): qual carteira salva está escolhida (`null` = carteira
 * digitada no formulário) e a sincronização dos campos de rede/endereço/tipo/ENS com ela.
 */
export function useCollectorWallet(form: CollectorFormApi, wallets: Wallet[], primary: Wallet | null) {
  const { setValue } = form
  const [selectedWalletId, setSelected] = useState<string | null>(primary?.id ?? null)
  // Seleção atual para callbacks assíncronos (a remoção resolve depois de outros renders)
  const selectedRef = useRef(selectedWalletId)

  function setSelectedWalletId(id: string | null) {
    selectedRef.current = id
    setSelected(id)
  }

  function selectWallet(wallet: Wallet) {
    setSelectedWalletId(wallet.id)
    for (const [key, value] of Object.entries(walletFields(wallet))) {
      setValue(key as keyof ReturnType<typeof walletFields>, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
    }
  }

  function toggleOtherWallet(other: boolean) {
    if (!other) {
      if (primary) selectWallet(wallets.find((w) => w.id === selectedRef.current) ?? primary)
      return
    }
    setSelectedWalletId(null)
    setValue('walletAddress', '', { shouldDirty: true })
    setValue('ensName', '', { shouldDirty: true })
  }

  /** Carteira escolhida removida (menu ⋮): passa para outra salva ou para a carteira digitada. */
  function walletRemoved(wallet: Wallet) {
    if (wallet.id !== selectedRef.current) return
    const next = wallets.find((w) => w.id !== wallet.id)
    if (next) selectWallet(next)
    else toggleOtherWallet(true)
  }

  /**
   * A carteira salva só vale se o formulário ainda aponta para ela: rede, endereço e tipo. Trocar o
   * tipo (ex.: Coinbase no lugar da MetaMask salva) vira carteira digitada, e não a salva com outro tipo.
   */
  function savedWalletIdFor(collector: CollectorInput): string | null {
    const saved = wallets.find((w) => w.id === selectedWalletId)
    return saved &&
      saved.network === collector.network &&
      saved.provider === collector.walletProvider &&
      sameWalletAddress(saved.address, collector.walletAddress, collector.network)
      ? saved.id
      : null
  }

  return { selectedWalletId, selectWallet, toggleOtherWallet, walletRemoved, savedWalletIdFor }
}
