import { Connector, ConnectorNotConnectedError, UserNotConnectedError } from '@starknet-react/core'
import { RpcMessage, RequestFnCall, RpcTypeToMessageMap } from '@starknet-io/types-js'
import { starknetConnectorManager } from './service/starknetConnectorManager'
import { starknetConnectionService } from './service/StarknetConnectionService'

let _initialized = false
let _loadPromise: Promise<void> | null = null

class DiscoveryConnector extends Connector {
    #wallet: any
    #store: 'android' | 'ios'

    constructor(wallet: any, store: 'android' | 'ios') {
        super()
        this.#wallet = wallet
        this.#store = store
    }

    get id() { return `${this.#wallet.id}-mobile` }
    get icon() { return { dark: this.#wallet.icon, light: this.#wallet.icon } }
    get name() { return `${this.#wallet.name} (mobile)` }

    available() { return true }
    connect(): any {
        window.open(this.#wallet.downloads[this.#store], '_blank')
        return undefined
    }
    get wallet(): any { throw new ConnectorNotConnectedError() }
    disconnect(): any { throw new UserNotConnectedError() }
    account(): any { throw new ConnectorNotConnectedError() }
    ready(): Promise<boolean> { throw new Error('Method not implemented.') }
    chainId(): Promise<bigint> { throw new Error('Method not implemented.') }
    request<T extends RpcMessage['type']>(_call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]['result']> {
        throw new Error('Method not implemented.')
    }
}

/**
 * One-shot initialization of the Starknet connectors + manager.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initStarknetProvider(): void {
    if (_initialized || _loadPromise) return
    if (typeof window === 'undefined') return

    _loadPromise = (async () => {
        // @ts-ignore
        const injectedModule = await import('starknetkit/injected')
        // @ts-ignore
        const webWalletModule = await import('starknetkit/webwallet')
        // @ts-ignore
        const controllerModule = await import('starknetkit/controller')

        const InjectedConnector = (injectedModule as any).InjectedConnector
        const WebWalletConnector = (webWalletModule as any).WebWalletConnector
        const ControllerConnector = (controllerModule as any).ControllerConnector

        const isSafari = typeof window !== 'undefined'
            ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
            : false
        const isAndroid = !!navigator.userAgent.match(/Android/i)
        const isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i)

        const defaultConnectors: Connector[] = []

        if (!isSafari) {
            defaultConnectors.push(new InjectedConnector({ options: { id: 'argentX' } }))
            defaultConnectors.push(new InjectedConnector({ options: { id: 'keplr' } }))
            defaultConnectors.push(new InjectedConnector({ options: { id: 'braavos' } }))
            defaultConnectors.push(new InjectedConnector({ options: { id: 'xverse' } }))
        }

        if ((isAndroid || isIOS) && !defaultConnectors.some(c => c.id === 'braavos')) {
            const starknet = (await import('@starknet-io/get-starknet-core')).default
            const discoverWallets = (await starknet.getDiscoveryWallets()).filter(w => {
                return (isAndroid && (w.downloads as any)['android']) || (isIOS && (w.downloads as any)['ios'])
            })
            if (discoverWallets.length) {
                defaultConnectors.push(...discoverWallets.map(w => new DiscoveryConnector(w, isAndroid ? 'android' : 'ios')))
            }
        }

        defaultConnectors.push(new ControllerConnector())
        defaultConnectors.push(new WebWalletConnector())

        starknetConnectorManager.register(defaultConnectors)
        starknetConnectionService.hydrateStoredWallets().catch(() => { /* swallow */ })

        _initialized = true
    })()

    _loadPromise.catch(() => {
        _loadPromise = null
    })
}

/** Visible for tests. Resets singleton init so a fresh init can run. */
export function _resetStarknetInit(): void {
    _initialized = false
    _loadPromise = null
    starknetConnectorManager.dispose()
}
