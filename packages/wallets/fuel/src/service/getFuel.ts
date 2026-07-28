import type { Fuel } from '@fuel-ts/account'

let _instance: Fuel | null = null

export function setFuelInstance(instance: Fuel | null): void {
    _instance = instance
}

export function getFuelInstance(): Fuel {
    if (!_instance) {
        throw new Error('Fuel instance requested before initFuelProvider() ran')
    }
    return _instance
}

export function hasFuelInstance(): boolean {
    return _instance !== null
}
