import { useEffect, useMemo, useState } from 'react'
import { shallow } from 'zustand/shallow'
import { getWalletClient } from '@wagmi/core'
import { providers } from 'ethers'
import type { WalletClient } from 'viem'
import { getEvmConfig, hasEvmConfig } from '../service/getEvmConfig'
import { useEvmStore } from '../service/evmStore'

export function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient

    if (!chain) throw new Error('Chain not found in public client')
    if (!account) throw new Error('Account not found in public client')

    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }

    // Force disable type checking of transport
    // See https://github.com/wagmi-dev/viem/discussions/792#discussioncomment-6297530
    const provider = new providers.Web3Provider(transport, network)
    const signer = provider.getSigner(account.address)
    return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { address, storeChainId } = useEvmStore(
        s => ({ address: s.wagmiAccount.address, storeChainId: s.wagmiAccount.chainId }),
        shallow,
    )

    const [walletClient, setWalletClient] = useState<WalletClient | undefined>(undefined)

    useEffect(() => {
        if (!address || !hasEvmConfig()) {
            setWalletClient(undefined)
            return
        }
        let cancelled = false
        getWalletClient(getEvmConfig(), { chainId })
            .then(client => { if (!cancelled) setWalletClient(client as WalletClient) })
            .catch(() => { if (!cancelled) setWalletClient(undefined) })
        return () => { cancelled = true }
    }, [address, chainId, storeChainId])

    return useMemo(
        () => (walletClient ? walletClientToSigner(walletClient) : undefined),
        [walletClient],
    )
}
