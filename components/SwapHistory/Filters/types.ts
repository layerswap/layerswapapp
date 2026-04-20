import { Wallet } from '@/Models/WalletProvider'

export type FilterNetworkOption = {
    name: string
    display_name: string
    logo: string
}

export type FilterOpts = {
    walletAddrs: string[] | null
    networks: string[] | null
}

export const walletIdOf = (w: Wallet): string => w.internalId ?? w.address
