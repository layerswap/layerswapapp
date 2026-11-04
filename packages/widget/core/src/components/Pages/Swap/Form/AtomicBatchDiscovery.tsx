import { useContext } from 'react'
import { useFormikContext } from 'formik'
import { SwapDataStateContext } from '@/context/swap'
import { useSelectedAccount } from '@/context/swapAccounts'
import useWallet from '@/hooks/useWallet'
import { useAtomicBatchCapability } from '@/hooks/useAtomicBatchCapability'
import { Address } from '@/lib/address/Address'
import type { SwapFormValues } from './SwapFormValues'

/** Warm the shared wallet capability query directly from the live form. */
export default function AtomicBatchDiscovery() {
    const { values: { from, fromAsset } } = useFormikContext<SwapFormValues>()
    const swapId = useContext(SwapDataStateContext)?.swapId
    const account = useSelectedAccount('from', from?.name)
    const { wallets } = useWallet(from, 'asSource')
    const wallet = from && account
        ? (account.provider?.connectedWallets ?? wallets).find(wallet => wallet.id === account.id
            && (wallet.addresses?.some(address => Address.equals(address, account.address, from))
                || Address.equals(wallet.address, account.address, from)))
        : undefined
    useAtomicBatchCapability(
        !swapId && from?.type === 'evm' && wallet?.asSourceSupportedNetworks?.includes(from.name) ? from : undefined,
        fromAsset ?? from?.token, wallet, account?.address,
    )
    return null
}
