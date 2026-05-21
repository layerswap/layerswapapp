import type { TonConnectUI } from '@tonconnect/ui-react'

let _instance: TonConnectUI | null = null

export function setTonConnectUI(instance: TonConnectUI | null): void {
    _instance = instance
}

export function getTonConnectUI(): TonConnectUI {
    if (!_instance) {
        throw new Error('TonConnectUI requested before TonConnectProvider mounted')
    }
    return _instance
}

export function hasTonConnectUI(): boolean {
    return _instance !== null
}
