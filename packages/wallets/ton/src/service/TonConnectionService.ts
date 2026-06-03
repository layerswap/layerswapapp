import type {
    InternalConnector,
    NetworkWithTokens,
    Wallet,
    WalletConnectionProvider,
    WalletModalConnector,
} from '@layerswap/widget/types'
import { connectModalStore, walletIconResolver } from '@layerswap/widget/internal'
import {
    isWalletInfoCurrentlyInjected,
    isWalletInfoInjectable,
    isWalletInfoRemote,
    type Wallet as TonWallet,
    type WalletInfo,
    type WalletInfoInjectable,
    type WalletInfoRemote,
} from '@tonconnect/sdk'
import { Address } from '@ton/core'
import { name as PROVIDER_NAME, id as PROVIDER_ID, tonNames } from '../constants'
import { getTonConnect } from './getTonConnect'
import { snapshotFromTonWallet, type TonWalletSnapshot, useTonStore } from './tonStore'

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
    isMobilePlatform?: boolean
}

export class TonConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _networksKey = ''
    private _deps: RuntimeDeps = {}

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networksKey = key
    }

    configure(deps: RuntimeDeps): void {
        this._deps = { ...this._deps, ...deps }
    }

    getNetworkIcon(): string | undefined {
        return this._networks.find(n => tonNames.some(name => name === n.name))?.logo
    }

    getProviderIcon(): string | undefined {
        return this.getNetworkIcon()
    }

    getAvailableConnectors(): InternalConnector[] {
        const wallets = useTonStore.getState().wallets
        return dedupeTonWallets(wallets).map(walletInfoToInternalConnector)
    }

    resolveWallet(snapshot: TonWalletSnapshot | undefined): Wallet | undefined {
        if (!snapshot?.address) return undefined
        const normalizedAddress = Address.parse(snapshot.address).toString({ bounceable: false })
        const walletId = snapshot.walletName || snapshot.appName
        if (!walletId) return undefined

        return {
            id: walletId,
            displayName: `${walletId} - Ton`,
            addresses: [normalizedAddress],
            address: normalizedAddress,
            providerName: PROVIDER_NAME,
            isActive: true,
            icon: walletIconResolver(PROVIDER_NAME, snapshot.imageUrl || normalizedAddress),
            disconnect: () => this.disconnectWallets(),
            withdrawalSupportedNetworks: tonNames,
            autofillSupportedNetworks: tonNames,
            asSourceSupportedNetworks: tonNames,
            networkIcon: this.getNetworkIcon(),
        }
    }

    getConnectedWallets(snapshot: TonWalletSnapshot | undefined): Wallet[] {
        const wallet = this.resolveWallet(snapshot)
        return wallet ? [wallet] : []
    }

    async disconnectWallets(): Promise<void> {
        try {
            const tonConnect = getTonConnect()
            if (tonConnect.connected) {
                await tonConnect.disconnect()
            }
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async connectWallet({ connector }: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        const tonConnect = getTonConnect()
        const setSelectedConnector = this._deps.setSelectedConnector
        const isMobilePlatform = this._deps.isMobilePlatform ?? false

        if (tonConnect.connected) {
            await this.disconnectWallets()
        }

        const walletInfo = useTonStore.getState().wallets.find(w => w.appName === connector.id)
        if (!walletInfo) throw new Error('TON wallet not found')

        // Set up the status-change promise first so we don't miss an instant
        // injected connect that resolves before we set the listener.
        const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined
        let unsubscribeStatus: (() => void) | undefined
        let unsubscribeModal: (() => void) | undefined
        const connectionResultPromise = new Promise<TonWallet>((resolve, reject) => {
            unsubscribeStatus = tonConnect.onStatusChange(
                (wallet) => {
                    if (wallet) {
                        resolve(wallet)
                    }
                },
                (err) => {
                    reject(err)
                },
            )
            unsubscribeModal = connectModalStore.subscribe(() => {
                const modal = connectModalStore.getSnapshot()
                if (!modal.isWalletModalOpen || modal.selectedConnector?.id !== connector.id) {
                    abortController?.abort()
                    reject(new Error('TON wallet connection cancelled'))
                }
            })
        })

        try {
            if (isWalletInfoCurrentlyInjected(walletInfo) || (isWalletInfoInjectable(walletInfo) && walletInfo.injected)) {
                const injectable = walletInfo as WalletInfoInjectable
                tonConnect.connect({ jsBridgeKey: injectable.jsBridgeKey }, { signal: abortController?.signal })
            } else if (isWalletInfoRemote(walletInfo)) {
                const remote = walletInfo as WalletInfoRemote
                // Loading state for the QR view while the bridge handshakes.
                setSelectedConnector?.({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true })

                const universalLink = tonConnect.connect({
                    universalLink: remote.universalLink,
                    bridgeUrl: remote.bridgeUrl,
                }, { signal: abortController?.signal }) as string

                // Prefer the wallet's native scheme (e.g. `tonkeeper-tc://`) for the
                // open-in-app button — it launches the desktop wallet directly. Falls
                // back to the universal link (e.g. https://t.me/wallet?...) when the
                // wallet doesn't publish a native scheme (Telegram Wallet, Tonhub).
                const nativeDeepLink = remote.deepLink
                    ? appendTonConnectParamsToDeepLink(remote.deepLink, universalLink)
                    : universalLink

                if (isMobilePlatform) {
                    try {
                        window.location.href = nativeDeepLink
                    } catch {
                        setSelectedConnector?.({ ...connector, qr: { state: 'fetched', value: universalLink, deepLink: nativeDeepLink }, showQrCode: true })
                    }
                } else {
                    setSelectedConnector?.({ ...connector, qr: { state: 'fetched', value: universalLink, deepLink: nativeDeepLink }, showQrCode: true })
                }
            } else if (isWalletInfoInjectable(walletInfo)) {
                // Injectable but not currently injected → tell the UI the extension is missing.
                setSelectedConnector?.({ ...connector, extensionNotFound: true })
                throw new Error(`${walletInfo.name} extension is not installed`)
            } else {
                throw new Error('Unsupported TON wallet connection source')
            }

            const tonWallet = await connectionResultPromise
            const snapshot = snapshotFromTonWallet(tonWallet)
            return this.resolveWallet(snapshot)
        } catch (e) {
            if (e instanceof Error) throw e
            throw new Error(String(e))
        } finally {
            unsubscribeStatus?.()
            unsubscribeModal?.()
        }
    }

    buildProvider(snapshot: TonWalletSnapshot | undefined): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets(snapshot)
        const activeWallet = connectedWallets[0]
        const ready = useTonStore.getState().ready

        // While the wallet-list fetch is in flight (SSR + first client paint),
        // expose empty supported-network lists so the widget's provider filter
        // drops TON out of `isProvidersReady`. Once `ready` flips to true, the
        // store emits and the snapshot recomputes with the real network list,
        // exactly like the previous hook-bridge adapter behaved.
        const supportedNetworks = ready ? tonNames : []

        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),

            availableConnectors: this.getAvailableConnectors(),
            connectedWallets,
            activeWallet,
            withdrawalSupportedNetworks: supportedNetworks,
            autofillSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            ready,
        }
    }
}

export const tonConnectionService = new TonConnectionService()

/**
 * Display-name overrides for wallets where the TonConnect registry's `name`
 * field is ambiguous (e.g. Telegram's bot wallet is published as just "Wallet").
 * Mirrors how `@tonconnect/ui-react`'s modal labels them.
 */
const TON_WALLET_DISPLAY_NAMES: Record<string, string> = {
    'telegram-wallet': 'Wallet in Telegram',
}

/**
 * The TonConnect registry sometimes contains multiple entries that resolve to
 * the same wallet — most notably OKX, which publishes both `okxWallet` and
 * `okxTonWallet` with the same `jsBridgeKey: "okxTonWallet"`. Collapse to the
 * first entry we encounter per jsBridgeKey so the user only sees one tile.
 */
function dedupeTonWallets(wallets: readonly WalletInfo[]): WalletInfo[] {
    const seenBridgeKeys = new Set<string>()
    const result: WalletInfo[] = []
    for (const wallet of wallets) {
        const key = isWalletInfoInjectable(wallet) ? wallet.jsBridgeKey : undefined
        if (key) {
            if (seenBridgeKeys.has(key)) continue
            seenBridgeKeys.add(key)
        }
        result.push(wallet)
    }
    return result
}

function walletInfoToInternalConnector(info: WalletInfo): InternalConnector {
    const isInjectable = isWalletInfoInjectable(info)
    const isInjected = isWalletInfoCurrentlyInjected(info)
    const hasBrowserExtension = isInjectable
    const isMobileSupported = isWalletInfoRemote(info)
    const displayName = TON_WALLET_DISPLAY_NAMES[info.appName] ?? info.name

    return {
        id: info.appName,
        name: displayName,
        icon: info.imageUrl,
        type: isInjected ? 'injected' : 'other',
        hasBrowserExtension,
        extensionNotFound: isInjectable && !isInjected,
        isMobileSupported,
        installUrl: info.aboutUrl,
        providerName: PROVIDER_NAME,
    }
}

/**
 * TonConnect's `connect({ universalLink, bridgeUrl })` returns a `tc://`-style
 * universal link. For wallets that publish a native deep-link (e.g. tonkeeper://),
 * we splice the TonConnect query params onto the wallet's own deep-link so
 * mobile redirects open the wallet directly.
 */
function appendTonConnectParamsToDeepLink(deepLink: string, universalLink: string): string {
    const qIdx = universalLink.indexOf('?')
    if (qIdx === -1) return deepLink
    const params = universalLink.slice(qIdx)
    return deepLink.includes('?')
        ? `${deepLink}&${params.slice(1)}`
        : `${deepLink}${params}`
}
