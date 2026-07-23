'use client'
import { FC } from 'react'
import AddressIcon from '@/components/Common/AddressIcon'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import WalletIcon from '@/components/Icons/WalletIcon'
import type { Wallet } from '@/types'

type Props = {
    wallet: Pick<Wallet, 'icon' | 'address' | 'displayName' | 'id'>
    className?: string
    size?: number
}

/**
 * Renders a wallet's icon. After the contract migration to `Wallet.icon: string`,
 * use this component everywhere instead of `<wallet.icon />`. Falls back to a
 * generative AddressIcon when the wallet didn't ship an icon URL.
 */
const WalletIconView: FC<Props> = ({ wallet, className, size = 24 }) => {
    if (wallet.icon) {
        return (
            <ImageWithFallback
                src={wallet.icon}
                alt={wallet.displayName ?? wallet.id}
                width={size}
                height={size}
                className={className}
            />
        )
    }
    if (wallet.address) {
        return <AddressIcon address={wallet.address} size={size} className={className} />
    }
    return <WalletIcon className={className} />
}

export default WalletIconView
