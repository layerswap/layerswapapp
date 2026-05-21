type TronAdapterApi = {
    select: (name: string) => void
    connect: () => Promise<void>
    disconnect: () => Promise<void>
}

let _api: TronAdapterApi | null = null

export function setTronAdapterApi(api: TronAdapterApi | null): void {
    _api = api
}

export function getTronAdapterApi(): TronAdapterApi {
    if (!_api) {
        throw new Error('Tron adapter API requested before TronProvider mounted')
    }
    return _api
}

export function hasTronAdapterApi(): boolean {
    return _api !== null
}
