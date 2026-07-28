import { Fuel } from '@fuel-ts/account'
import { BakoSafeConnector } from './connectors/bako-safe'
import { BakoRequestAPI } from './connectors/bako-safe/Bako'
import { FuelWalletConnector } from './connectors/fuel-wallet'
import { FueletWalletConnector } from './connectors/fuelet-wallet'
import { hasFuelInstance, setFuelInstance } from './service/getFuel'
import { attachFuelSync } from './service/syncFuel'

const HOST_URL = 'https://api.bako.global'

let _initialized = false

/**
 * One-shot initialization of the Fuel SDK + store sync.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initFuelProvider(): void {
    if (_initialized) return
    if (typeof window === 'undefined') return

    if (hasFuelInstance()) {
        _initialized = true
        return
    }

    const fuel = new Fuel({
        connectors: [
            new FuelWalletConnector(),
            new BakoSafeConnector({ api: new BakoRequestAPI(HOST_URL) }),
            new FueletWalletConnector(),
        ],
    })

    setFuelInstance(fuel)
    attachFuelSync(fuel)

    _initialized = true
}

/** Visible for tests. Resets the singleton init so a fresh init can run. */
export function _resetFuelInit(): void {
    _initialized = false
    setFuelInstance(null)
}
