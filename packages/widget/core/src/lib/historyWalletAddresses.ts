import { Wallet } from "@/types/wallet"
import { Address } from "./address/Address"

export const MAX_HISTORY_ADDRESSES = 6

type NetworkForHistoryAddress = {
    chain_id?: string | number | null
    name: string
}

export type HistoryWalletAddress = {
    address: string
    rawAddress: string
    wallet: Wallet
    network: NetworkForHistoryAddress | null
}

export function getHistoryWalletAddresses(wallets: Wallet[], networks: NetworkForHistoryAddress[],): HistoryWalletAddress[] {
    const seen = new Set<string>()
    const addresses: HistoryWalletAddress[] = []

    for (const wallet of wallets) {
        const network = networks.find(item => item.chain_id == wallet.chainId) ?? null

        for (const rawAddress of wallet.addresses) {
            const address = new Address(rawAddress, network, wallet.providerName).normalized
            if (seen.has(address)) continue

            seen.add(address)
            addresses.push({ address, rawAddress, wallet, network })
        }
    }

    return addresses
}