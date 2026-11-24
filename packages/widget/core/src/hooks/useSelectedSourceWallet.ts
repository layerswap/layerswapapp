import type { Network } from '@layerswap/widget-types'
import { useSelectedAccount } from '@/context/swapAccounts'
import { Address } from '@/lib/address/Address'
import useWallet from './useWallet'

/** The connected wallet behind the selected source account. */
export function useSelectedSourceWallet(network: Network | undefined) {
    const account = useSelectedAccount('from', network?.name)
    const { wallets } = useWallet(network, 'asSource')
    return account?.address && network
        ? (account.provider?.connectedWallets ?? wallets).find(wallet => wallet.id === account.id
            && (wallet.addresses?.some(address => Address.equals(address, account.address, network))
                || Address.equals(wallet.address, account.address, network)))
        : undefined
}
