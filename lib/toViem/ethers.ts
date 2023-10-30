import { type PublicClient, usePublicClient, type WalletClient, useWalletClient } from 'wagmi'
import { providers } from 'ethers'
import { type HttpTransport } from 'viem'
import { useMemo } from 'react'

export function publicClientToProvider(publicClient: PublicClient) {
    const { chain, transport } = publicClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    if (transport.type === 'fallback')
        return new providers.FallbackProvider(
            (transport.transports as ReturnType<HttpTransport>[]).map(
                ({ value }) => new providers.JsonRpcProvider(value?.url, network),
            ),
        )
    return new providers.Web3Provider(transport.url, network)
}

/** Hook to convert a viem Public Client to an ethers.js Provider. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
    const publicClient = usePublicClient({ chainId })
    return useMemo(() => publicClientToProvider(publicClient), [publicClient])
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
    const provider = new providers.Web3Provider(transport as any, network)
    const signer = provider.getSigner(account.address)
    return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { data: walletClient } = useWalletClient({ chainId })
    return useMemo(
        () => (walletClient ? walletClientToSigner(walletClient) : undefined),
        [walletClient],
    )
}