import type { DisplayUriSource } from '@layerswap/wallet-core'
import type { WalletConnectConfig } from '@layerswap/widget-types'
import { ModuleType, Networks, type ModuleInterface } from '@creit.tech/stellar-wallets-kit/types'
import type { AppKit } from '@reown/appkit/core'
import type SignClientClass from '@walletconnect/sign-client'

type SignClient = InstanceType<typeof SignClientClass>
type WalletConnectSession = SignClient['session']['values'][number]
type ClientFactory = () => Promise<SignClient>
type AppKitFactory = () => Promise<AppKit>

export type StellarWalletConnectPresentation = 'layerswap' | 'appkit'

const STELLAR_WALLET_CONNECT_STORAGE_PREFIX = 'layerswapStellarWalletConnect'

export const STELLAR_WALLET_CONNECT_ID = 'wallet_connect'

export const StellarWalletConnectChain = {
    Public: 'stellar:pubnet',
    Testnet: 'stellar:testnet',
} as const

const StellarWalletConnectMethod = {
    Sign: 'stellar_signXDR',
    SignAndSubmit: 'stellar_signAndSubmitXDR',
    SignMessage: 'stellar_signMessage',
    SignAuthEntry: 'stellar_signAuthEntry',
} as const

const stellarAccounts = (session: WalletConnectSession): string[] =>
    session.namespaces.stellar?.accounts
        ?.map(account => account.split(':')[2])
        .filter((address): address is string => !!address) ?? []

const stellarAccount = (
    session: WalletConnectSession,
    expectedAddress?: string,
): string | undefined => {
    const accounts = stellarAccounts(session)
    return expectedAddress
        ? accounts.find(address => address === expectedAddress)
        : accounts[0]
}

/**
 * Stellar Wallets Kit module backed directly by WalletConnect SignClient.
 * The Kit still owns wallet selection and signing dispatch, while Layerswap owns
 * presentation of the emitted `wc:` URI through its shared QR modal.
 */
export class StellarWalletConnectModule implements ModuleInterface, DisplayUriSource {
    readonly moduleType = ModuleType.BRIDGE_WALLET
    readonly productId = STELLAR_WALLET_CONNECT_ID
    readonly productName = 'WalletConnect'
    readonly productUrl = 'https://walletconnect.com/'
    readonly productIcon = 'https://stellar.creit.tech/wallet-icons/walletconnect.png'

    private client: SignClient | undefined
    private clientPromise: Promise<SignClient> | undefined
    private readonly displayUriListeners = new Set<(uri: string) => void>()
    private readonly sessionDeleteListeners = new Set<() => void>()
    private sessionEndedHandler: ((event: { topic: string }) => void) | undefined
    private activeTopic: string | undefined
    private appKit: AppKit | undefined
    private appKitPromise: Promise<AppKit> | undefined
    private nextPresentation: StellarWalletConnectPresentation = 'layerswap'

    constructor(
        private readonly config: WalletConnectConfig,
        private readonly clientFactory: ClientFactory = async () => {
            const { SignClient } = await import('@walletconnect/sign-client')
            return SignClient.init({
                projectId: config.projectId,
                metadata: {
                    name: config.name,
                    description: config.description,
                    url: config.url,
                    icons: config.icons,
                },
                customStoragePrefix: STELLAR_WALLET_CONNECT_STORAGE_PREFIX,
            })
        },
        private readonly appKitFactory: AppKitFactory = async () => {
            const [{ createAppKit }, { mainnet }] = await Promise.all([
                import('@reown/appkit/core'),
                import('@reown/appkit/networks'),
            ])
            return createAppKit({
                projectId: config.projectId,
                metadata: { name: config.name, description: config.description, url: config.url, icons: config.icons, },
                manualWCControl: true,
                networks: [mainnet],
                featuredWalletIds: [
                    '997a355c8f682468706a76cff1b004a7115f505fb962dac54b6e9b442dd1c380', // Freighter
                    '76a3d548a08cf402f5c7d021f24fd2881d767084b387a5325df88bc3d4b6f21b', // Lobstr
                ],
            })
        },
    ) { }

    async isAvailable(): Promise<boolean> {
        return typeof window !== 'undefined'
    }

    async isPlatformWrapper(): Promise<boolean> {
        if (typeof window === 'undefined') return false
        const stellar = (window as Window & {
            stellar?: { provider?: string; platform?: string }
        }).stellar
        return stellar?.provider === 'freighter' && stellar.platform === 'mobile'
    }

    onDisplayUri(listener: (uri: string) => void): () => void {
        this.displayUriListeners.add(listener)
        return () => this.displayUriListeners.delete(listener)
    }

    onSessionDelete(listener: () => void): () => void {
        this.sessionDeleteListeners.add(listener)
        return () => this.sessionDeleteListeners.delete(listener)
    }

    warmup(): void {
        void this.getClient().catch(() => {
            // A real connect attempt reports initialization failures to the UI.
        })
    }

    setNextPresentation(presentation: StellarWalletConnectPresentation): void {
        this.nextPresentation = presentation
    }

    async getAddress(): Promise<{ address: string }> {
        const presentation = this.nextPresentation
        this.nextPresentation = 'layerswap'
        const client = await this.getClient()
        const chains = [StellarWalletConnectChain.Public, StellarWalletConnectChain.Testnet]
        const { uri, approval } = await client.connect({
            requiredNamespaces: {
                stellar: {
                    chains,
                    methods: [StellarWalletConnectMethod.Sign],
                    events: [],
                },
            },
            optionalNamespaces: {
                stellar: {
                    chains,
                    methods: [
                        StellarWalletConnectMethod.SignAndSubmit,
                        StellarWalletConnectMethod.SignAuthEntry,
                        StellarWalletConnectMethod.SignMessage,
                    ],
                    events: [],
                },
            },
        })
        const modal = presentation === 'appkit' && uri ? await this.getAppKit() : undefined
        if (uri) {
            if (modal) {
                await modal.open({ uri })
            } else {
                for (const listener of this.displayUriListeners) listener(uri)
            }
        }
        let session: WalletConnectSession
        let unsubscribeModalState: (() => void) | undefined
        try {
            if (modal?.subscribeState) {
                const approvalPromise = approval()
                approvalPromise.catch(() => {})
                session = await Promise.race([
                    approvalPromise,
                    new Promise<never>((_, reject) => {
                        unsubscribeModalState = modal.subscribeState(state => {
                            if (!state.open) reject(new Error('The wallet connection request was cancelled'))
                        })
                    }),
                ])
            } else {
                session = await approval()
            }
        } finally {
            unsubscribeModalState?.()
            if (presentation === 'appkit') await this.closeAppKit()
        }

        const address = stellarAccount(session)
        if (!address) {
            await client.disconnect({
                topic: session.topic,
                reason: { code: -1, message: 'Session approved without a Stellar account' },
            })
            throw new Error('The approved WalletConnect session has no Stellar account')
        }
        this.activeTopic = session.topic
        return { address }
    }

    async getConnectedAddress(expectedAddress?: string): Promise<{ address: string }> {
        const client = await this.getClient()
        const session = this.findSession(client, expectedAddress)
        const address = session && stellarAccount(session, expectedAddress)
        if (!address) {
            throw new Error('The Stellar WalletConnect session expired; reconnect the wallet')
        }
        this.activeTopic = session.topic
        return { address }
    }

    async signTransaction(
        xdr: string,
        opts?: { networkPassphrase?: string; address?: string; path?: string },
    ): Promise<{ signedTxXdr: string; signerAddress?: string }> {
        const result = await this.request<{ signedXDR: string }>(
            StellarWalletConnectMethod.Sign,
            { xdr },
            opts?.networkPassphrase,
            opts?.address,
        )
        if (!result?.signedXDR) throw new Error('WalletConnect wallet returned no signed Stellar XDR')
        return { signedTxXdr: result.signedXDR, signerAddress: opts?.address }
    }

    async signAndSubmitTransaction(
        xdr: string,
        opts?: { networkPassphrase?: string; address?: string },
    ): Promise<{ status: 'success' | 'pending' }> {
        const result = await this.request<{ status: string }>(
            StellarWalletConnectMethod.SignAndSubmit,
            { xdr },
            opts?.networkPassphrase,
            opts?.address,
        )
        if (result.status !== 'success' && result.status !== 'pending') {
            throw new Error(`Unexpected Stellar WalletConnect status: ${result.status}`)
        }
        return { status: result.status }
    }

    async signAuthEntry(
        authEntry: string,
        opts?: { networkPassphrase?: string; address?: string; path?: string },
    ): Promise<{ signedAuthEntry: string; signerAddress?: string }> {
        return this.request(
            StellarWalletConnectMethod.SignAuthEntry,
            { entryXdr: authEntry },
            opts?.networkPassphrase,
            opts?.address,
        )
    }

    async signMessage(
        message: string,
        opts?: { networkPassphrase?: string; address?: string; path?: string },
    ): Promise<{ signedMessage: string; signerAddress?: string }> {
        const result = await this.request<{ signature: string; signerAddress?: string }>(
            StellarWalletConnectMethod.SignMessage,
            { message },
            opts?.networkPassphrase,
            opts?.address,
        )
        return { signedMessage: result.signature, signerAddress: result.signerAddress }
    }

    async getNetwork(): Promise<{ network: string; networkPassphrase: string }> {
        throw new Error('WalletConnect does not expose the active Stellar network')
    }

    async disconnect(): Promise<void> {
        const client = this.client
        if (!client) return
        const sessions = client.session.values.filter(session => stellarAccount(session))
        await Promise.all(sessions.map(session => client.disconnect({
            topic: session.topic,
            reason: { code: -1, message: 'Session closed' },
        })))
    }

    dispose(): void {
        if (this.client && this.sessionEndedHandler) {
            this.client.off('session_delete', this.sessionEndedHandler)
            this.client.off('session_expire', this.sessionEndedHandler)
        }
        this.displayUriListeners.clear()
        this.sessionDeleteListeners.clear()
        this.sessionEndedHandler = undefined
        this.activeTopic = undefined
        this.client = undefined
        this.clientPromise = undefined
        void this.closeAppKit()
        this.appKit = undefined
        this.appKitPromise = undefined
        this.nextPresentation = 'layerswap'
    }

    private async getAppKit(): Promise<AppKit> {
        if (this.appKit) return this.appKit
        if (!this.appKitPromise) {
            this.appKitPromise = this.appKitFactory().then(modal => {
                this.appKit = modal
                return modal
            }).finally(() => {
                this.appKitPromise = undefined
            })
        }
        return this.appKitPromise
    }

    private async closeAppKit(): Promise<void> {
        try {
            await this.appKit?.close()
        } catch {
            // Closing presentation is best-effort and must not mask the
            // WalletConnect approval result.
        }
    }

    private async getClient(): Promise<SignClient> {
        if (this.client) return this.client
        if (!this.clientPromise) {
            this.clientPromise = this.clientFactory().then(client => {
                this.client = client
                this.sessionEndedHandler = event => {
                    if (this.activeTopic && event.topic !== this.activeTopic) return
                    this.activeTopic = undefined
                    for (const listener of this.sessionDeleteListeners) listener()
                }
                client.on('session_delete', this.sessionEndedHandler)
                client.on('session_expire', this.sessionEndedHandler)
                return client
            }).finally(() => {
                this.clientPromise = undefined
            })
        }
        return this.clientPromise
    }

    private async request<Result>(
        method: string,
        params: Record<string, unknown>,
        networkPassphrase?: string,
        address?: string,
    ): Promise<Result> {
        const client = await this.getClient()
        const session = this.findSession(client, address)
        if (!session) {
            throw new Error('No active Stellar WalletConnect session for the selected address')
        }
        this.activeTopic = session.topic
        const chainId = networkPassphrase === Networks.PUBLIC
            ? StellarWalletConnectChain.Public
            : StellarWalletConnectChain.Testnet
        return client.request<Result>({
            topic: session.topic,
            chainId,
            request: { method, params },
        })
    }

    private findSession(client: SignClient, address?: string): WalletConnectSession | undefined {
        const active = this.activeTopic
            ? client.session.values.find(session => (
                session.topic === this.activeTopic && stellarAccount(session, address)
            ))
            : undefined
        if (active) return active
        return [...client.session.values]
            .reverse()
            .find(session => stellarAccount(session, address))
    }
}
