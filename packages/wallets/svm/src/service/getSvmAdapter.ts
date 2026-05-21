import type { Wallet as SvmWallet } from '@solana/wallet-adapter-react'

type SvmAdapterApi = {
    select: (name: string) => void
    disconnect: () => Promise<void>
    getWallets: () => readonly SvmWallet[]
}

let _api: SvmAdapterApi | null = null

export function setSvmAdapterApi(api: SvmAdapterApi | null): void {
    _api = api
}

export function getSvmAdapterApi(): SvmAdapterApi {
    if (!_api) {
        throw new Error('SVM adapter API requested before SolanaProvider mounted')
    }
    return _api
}

export function hasSvmAdapterApi(): boolean {
    return _api !== null
}
