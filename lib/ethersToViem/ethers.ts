import * as React from 'react'
import { type PublicClient, usePublicClient } from 'wagmi'
import { providers } from 'ethers'
import { type HttpTransport } from 'viem'
import { type WalletClient, useWalletClient } from 'wagmi'

export function publicClientToProvider(publicClient: PublicClient) {
    const { chain, transport } = publicClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    if (transport.type === 'fallback')
        return new providers.FallbackProvider(
            (transport.transports).map(
                ({ value }) => new providers.JsonRpcProvider(value?.url, network),
            ),
        )
    return new providers.JsonRpcProvider(transport.url, network)
}

export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
    const publicClient = usePublicClient({ chainId })
    return React.useMemo(() => publicClientToProvider(publicClient), [publicClient])
}

export function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }

    // Force disable type checking of transport
    // See https://github.com/wagmi-dev/viem/discussions/792#discussioncomment-6297530
    const provider = new providers.Web3Provider(transport as unknown, network)
    const signer = provider.getSigner(account.address)
    return signer
}

export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { data: walletClient } = useWalletClient({ chainId })
    return React.useMemo(
        () => (walletClient ? walletClientToSigner(walletClient) : undefined),
        [walletClient],
    )
}