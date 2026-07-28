import type { TonConnect } from '@tonconnect/sdk'

let _instance: TonConnect | null = null
let _tonApiKey: string | undefined = undefined

export function setTonConnect(instance: TonConnect | null): void {
    _instance = instance
}

export function getTonConnect(): TonConnect {
    if (!_instance) {
        throw new Error('TonConnect requested before initTonProvider ran')
    }
    return _instance
}

export function hasTonConnect(): boolean {
    return _instance !== null
}

export function setTonApiKey(apiKey: string | undefined): void {
    _tonApiKey = apiKey
}

export function getTonApiKey(): string | undefined {
    return _tonApiKey
}
