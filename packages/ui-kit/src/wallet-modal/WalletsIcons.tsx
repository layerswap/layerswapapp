'use client'
import { type Wallet } from '@layerswap/widget-types';
import WalletIconView from "./WalletIconView"

type WalletsIconsProps = {
    wallets: {
        id: string;
        displayName?: string;
        icon?: string;
        address?: string;
    }[]
}

const ConnectedWalletIcon = ({ wallet }: { wallet: WalletsIconsProps["wallets"][number] }) => (
    <span className="rounded-md border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6 overflow-hidden">
        <WalletIconView wallet={wallet as Wallet} className="h-full w-full" size={24} />
    </span>
)

export const WalletsIcons = ({ wallets }: WalletsIconsProps) => {

    const uniqueWallets = wallets.filter((wallet, index, self) => index === self.findIndex((t) => t.id === wallet.id))

    const firstWallet = uniqueWallets[0]
    const secondWallet = uniqueWallets[1]

    return (
        <div className="-space-x-2 flex" aria-label="Connected wallets">
            {
                firstWallet?.displayName &&
                <ConnectedWalletIcon wallet={firstWallet} />
            }
            {
                secondWallet?.displayName &&
                <ConnectedWalletIcon wallet={secondWallet} />
            }
            {
                uniqueWallets.length > 2 &&
                <div className="h-6 w-6 shrink-0 rounded-md justify-center p-1 bg-secondary-600 text-primary-text text-xs">
                    <span><span>+</span>{uniqueWallets.length - 2}</span>
                </div>
            }
        </div>
    )
}
