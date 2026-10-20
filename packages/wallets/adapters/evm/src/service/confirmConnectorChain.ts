import type { Connector } from '@wagmi/core'
import { numberToHex } from 'viem'

/** Synchronize wagmi and WalletConnect's approved-chain bookkeeping after verification. */
export async function confirmConnectorChain(connector: Connector, chainId: number): Promise<void> {
    connector.onChainChanged(numberToHex(chainId))
    const walletConnect = connector as Connector & {
        getRequestedChainsIds?: () => Promise<number[]>
        setRequestedChainsIds?: (ids: number[]) => void | Promise<void>
    }
    if (walletConnect.getRequestedChainsIds && walletConnect.setRequestedChainsIds) {
        const ids = await walletConnect.getRequestedChainsIds()
        if (!ids.includes(chainId)) await walletConnect.setRequestedChainsIds([...ids, chainId])
    }
}
