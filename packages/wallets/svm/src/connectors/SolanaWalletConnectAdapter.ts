import {
    BaseSignerWalletAdapter,
    WalletAdapterNetwork,
    WalletDisconnectionError,
    WalletName,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletReadyState,
    WalletSignMessageError,
    WalletSignTransactionError,
    isVersionedTransaction,
} from "@solana/wallet-adapter-base"
import { PublicKey, Transaction, VersionedTransaction, TransactionVersion } from "@solana/web3.js"
import type { UniversalProvider as UniversalProviderClass } from "@walletconnect/universal-provider"
import type { SessionTypes, SignClientTypes } from "@walletconnect/types"
import { parseAccountId } from "@walletconnect/utils"
import base58 from "bs58"

type UniversalProviderType = InstanceType<typeof UniversalProviderClass>

const Methods = {
    signTransaction: "solana_signTransaction",
    signMessage: "solana_signMessage",
    signAndSendTransaction: "solana_signAndSendTransaction",
    signAllTransactions: "solana_signAllTransactions",
} as const

const ChainIDs = {
    Mainnet: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    Devnet: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    DeprecatedMainnet: "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
    DeprecatedDevnet: "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K",
} as const

const WALLET_CONNECT_ICON =
    'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE4NSIgdmlld0JveD0iMCAwIDMwMCAxODUiIHdpZHRoPSIzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0ibTYxLjQzODU0MjkgMzYuMjU2MjYxMmM0OC45MTEyMjQxLTQ3Ljg4ODE2NjMgMTI4LjIxMTk4NzEtNDcuODg4MTY2MyAxNzcuMTIzMjA5MSAwbDUuODg2NTQ1IDUuNzYzNDE3NGMyLjQ0NTU2MSAyLjM5NDQwODEgMi40NDU1NjEgNi4yNzY1MTEyIDAgOC42NzA5MjA0bC0yMC4xMzY2OTUgMTkuNzE1NTAzYy0xLjIyMjc4MSAxLjE5NzIwNTEtMy4yMDUzIDEuMTk3MjA1MS00LjQyODA4MSAwbC04LjEwMDU4NC03LjkzMTE0NzljLTM0LjEyMTY5Mi0zMy40MDc5ODE3LTg5LjQ0Mzg4Ni0zMy40MDc5ODE3LTEyMy41NjU1Nzg4IDBsLTguNjc1MDU2MiA4LjQ5MzYwNTFjLTEuMjIyNzgxNiAxLjE5NzIwNDEtMy4yMDUzMDEgMS4xOTcyMDQxLTQuNDI4MDgwNiAwbC0yMC4xMzY2OTQ5LTE5LjcxNTUwMzFjLTIuNDQ1NTYxMi0yLjM5NDQwOTItMi40NDU1NjEyLTYuMjc2NTEyMiAwLTguNjcwOTIwNHptMjE4Ljc2Nzc5NjEgNDAuNzczNzQ0OSAxNy45MjE2OTcgMTcuNTQ2ODk3YzIuNDQ1NTQ5IDIuMzk0Mzk2OSAyLjQ0NTU2MyA2LjI3NjQ3NjkuMDAwMDMxIDguNjcwODg5OWwtODAuODEwMTcxIDc5LjEyMTEzNGMtMi40NDU1NDQgMi4zOTQ0MjYtNi40MTA1ODIgMi4zOTQ0NTMtOC44NTYxNi4wMDAwNjItLjAwMDAxLS4wMDAwMTAtLjAwMDAyMi0uMDAwMDIyLS4wMDAwMzItLjAwMDAzMmwtNTcuMzU0MTQzLTU2LjE1NDU3MmMtLjYxMTM5LS41OTg2MDItMS42MDI2NS0uNTk4NjAyLTIuMjE0MDQgMC0uMDAwMDA0LjAwMDAwNC0uMDAwMDA3LjAwMDAwOC0uMDAwMDExLjAwMDAxMWwtNTcuMzUyOTIxMiA1Ni4xNTQ1MzFjLTIuNDQ1NTM2OCAyLjM5NDQzMi02LjQxMDU3NTUgMi4zOTQ0NzItOC44NTYxNjEyLjAwMDA4Ny0uMDAwMDE0My0uMDAwMDE0LS4wMDAwMjk2LS4wMDAwMjgtLjAwMDA0NDktLjAwMDA0NGwtODAuODEyNDE5NDMtNzkuMTIyMTg1Yy0yLjQ0NTU2MDIxLTIuMzk0NDA4LTIuNDQ1NTYwMjEtNi4yNzY1MTE1IDAtOC42NzA5MTk3bDE3LjkyMTcyOTYzLTE3LjU0Njg2NzNjMi40NDU1NjAyLTIuMzk0NDA4MiA2LjQxMDU5ODktMi4zOTQ0MDgyIDguODU2MTYwMiAwbDU3LjM1NDk3NzUgNTYuMTU1MzU3Yy42MTEzOTA4LjU5ODYwMiAxLjYwMjY0OS41OTg2MDIgMi4yMTQwMzk4IDAgLjAwMDAwOTItLjAwMDAwOS4wMDAwMTc0LS4wMDAwMTcuMDAwMDI2NS0uMDAwMDI0bDU3LjM1MjEwMzEtNTYuMTU1MzMzYzIuNDQ1NTA1LTIuMzk0NDYzMyA2LjQxMDU0NC0yLjM5NDU1MzEgOC44NTYxNjEtLjAwMDIuMDAwMDM0LjAwMDAzMzYuMDAwMDY4LjAwMDA2NzMuMDAwMTAxLjAwMDEwMWw1Ny4zNTQ5MDIgNTYuMTU1NDMyYy42MTEzOS41OTg2MDEgMS42MDI2NS41OTg2MDEgMi4yMTQwNCAwbDU3LjM1Mzk3NS01Ni4xNTQzMjQ5YzIuNDQ1NTYxLTIuMzk0NDA5MiA2LjQxMDU5OS0yLjM5NDQwOTIgOC44NTYxNiAweiIgZmlsbD0iIzNiOTlmYyIvPjwvc3ZnPg=='

export const SolanaWalletConnectWalletName = "WalletConnect" as WalletName<"WalletConnect">

export type SolanaWalletConnectAdapterConfig = {
    network: WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet
    options: SignClientTypes.Options
}

type DisplayUriListener = (uri: string) => void

export class SolanaWalletConnectAdapter extends BaseSignerWalletAdapter {
    name = SolanaWalletConnectWalletName
    url = "https://walletconnect.org"
    icon = WALLET_CONNECT_ICON

    readonly supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy" as TransactionVersion, 0 as TransactionVersion])

    private _publicKey: PublicKey | null
    private _connecting: boolean
    private _provider: UniversalProviderType | undefined
    private _providerInitPromise: Promise<UniversalProviderType> | undefined
    private _session: SessionTypes.Struct | undefined
    private _config: SolanaWalletConnectAdapterConfig
    private _readyState: WalletReadyState
    private _network: string
    private _onSessionDelete: () => void
    private _displayUriListeners: Set<DisplayUriListener> = new Set()
    private _internalDisplayUriHandler: ((uri: string) => void) | undefined

    constructor(config: SolanaWalletConnectAdapterConfig) {
        super()
        this._config = config
        this._publicKey = null
        this._connecting = false
        this._readyState = typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable
        this._network = config.network === WalletAdapterNetwork.Mainnet ? ChainIDs.Mainnet : ChainIDs.Devnet
        this._onSessionDelete = () => {
            this.disconnect()
        }
    }

    get publicKey(): PublicKey | null {
        return this._publicKey
    }

    get connecting(): boolean {
        return this._connecting
    }

    get readyState(): WalletReadyState {
        return this._readyState
    }

    onDisplayUri(listener: DisplayUriListener): () => void {
        this._displayUriListeners.add(listener)
        return () => this._displayUriListeners.delete(listener)
    }

    /**
     * Fire-and-forget hint that the user is about to connect — eagerly runs
     * the `UniversalProvider.init()` so the actual `connect()` doesn't block
     * on a cold import + init when the user clicks a WC wallet tile.
     */
    warmup(): void {
        if (this._readyState !== WalletReadyState.Loadable) return
        if (this._provider || this._providerInitPromise) return
        this.getProvider().catch(() => { /* next connect() will surface the real error */ })
    }

    private async getProvider(): Promise<UniversalProviderType> {
        if (this._provider) return this._provider
        if (!this._providerInitPromise) {
            this._providerInitPromise = (async () => {
                try {
                    const { UniversalProvider: UP } = await import("@walletconnect/universal-provider")
                    const provider = await UP.init(this._config.options)
                    this._provider = provider
                    if (!this._internalDisplayUriHandler) {
                        this._internalDisplayUriHandler = (uri: string) => {
                            for (const cb of this._displayUriListeners) {
                                try { cb(uri) } catch (e) { /* swallow listener errors */ }
                            }
                        }
                        provider.on("display_uri", this._internalDisplayUriHandler)
                    }
                    return provider
                } finally {
                    this._providerInitPromise = undefined
                }
            })()
        }
        return this._providerInitPromise
    }

    /**
     * Override the base `autoConnect` so we never start a NEW WC pairing from
     * wallet-adapter-react's auto-reconnect path. A new pairing requires the
     * user to scan a QR, which isn't available during auto-reconnect; calling
     * `provider.connect()` there hangs with `_connecting = true` until the
     * internal timeout, blocking any subsequent user-initiated connect
     * (`connect()` early-returns on `this.connecting`). Only resume an
     * existing session here; a real connect always goes through `connect()`.
     */
    async autoConnect(): Promise<void> {
        if (this._readyState !== WalletReadyState.Loadable) return
        try {
            const provider = await this.getProvider()
            if (provider.session) await this.connect()
        } catch { /* silent — the user can still connect manually */ }
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return
            if (this._readyState !== WalletReadyState.Loadable) throw new WalletNotReadyError()

            this._connecting = true
            const provider = await this.getProvider()

            // Reuse existing session when available
            const existing = provider.session
            if (existing) {
                this._session = existing
                provider.setDefaultChain(this._network)
                this._publicKey = this.publicKeyFromSession(existing)
                this.bindSessionListeners()
                this.emit("connect", this._publicKey)
                return
            }

            const chains = this._network === ChainIDs.Mainnet
                ? [ChainIDs.Mainnet, ChainIDs.DeprecatedMainnet]
                : [ChainIDs.Devnet, ChainIDs.DeprecatedDevnet]

            const session = await provider.connect({
                optionalNamespaces: {
                    solana: {
                        chains,
                        methods: [
                            Methods.signTransaction,
                            Methods.signMessage,
                            Methods.signAndSendTransaction,
                            Methods.signAllTransactions,
                        ],
                        events: [],
                    },
                },
            })

            if (!session) throw new Error("WalletConnect Solana: empty session")
            this._session = session
            provider.setDefaultChain(this._network)
            this._publicKey = this.publicKeyFromSession(session)
            this.bindSessionListeners()
            this.emit("connect", this._publicKey)
        } catch (error: any) {
            throw error
        } finally {
            this._connecting = false
        }
    }

    private bindSessionListeners() {
        if (!this._provider) return
        // Avoid duplicate listeners — re-bind cleanly each connect cycle
        try { this._provider.client.off("session_delete", this._onSessionDelete) } catch { /* no-op */ }
        this._provider.client.on("session_delete", this._onSessionDelete)
    }

    private publicKeyFromSession(session: SessionTypes.Struct): PublicKey {
        const account = session.namespaces["solana"]?.accounts?.[0]
        if (!account) throw new Error("WalletConnect Solana: no Solana account in session")
        const { address } = parseAccountId(account)
        return new PublicKey(address)
    }

    async disconnect(): Promise<void> {
        const provider = this._provider
        let providerDisconnectThrew = false
        if (provider) {
            try { provider.client.off("session_delete", this._onSessionDelete) } catch { /* no-op */ }
            try {
                if (provider.session) await provider.disconnect()
            } catch (error: any) {
                providerDisconnectThrew = true
                this.emit("error", new WalletDisconnectionError(error?.message, error))
            }
        }
        this._publicKey = null
        this._session = undefined

        // Keep `_provider` warm across the disconnect → reconnect path. UP's
        // `disconnect()` awaits `cleanup()` which clears `provider.session`, so
        // the next `connect()` will take the fresh-pairing branch and emit
        // `display_uri` immediately — no cold `UP.init()` to wait for, which
        // is what previously made the QR spinner hang on the first reconnect.
        // Only tear down the provider if its own `disconnect()` threw, because
        // then `provider.session` may still be set.
        if (providerDisconnectThrew && provider) {
            if (this._internalDisplayUriHandler) {
                try { provider.off("display_uri", this._internalDisplayUriHandler) } catch { /* no-op */ }
            }
            this._provider = undefined
            this._providerInitPromise = undefined
            this._internalDisplayUriHandler = undefined
            if (this._readyState === WalletReadyState.Loadable) {
                this.getProvider().catch(() => { /* next connect() will surface the real error */ })
            }
        }

        this.emit("disconnect")
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        try {
            if (!this._provider || !this._session || !this._publicKey) throw new WalletNotConnectedError()
            try {
                const isVersioned = isVersionedTransaction(transaction)
                const serialized = this.serialize(transaction)
                const result = await this._provider.client.request<{ signature: string, transaction?: string }>({
                    chainId: this._network,
                    topic: this._session.topic,
                    request: {
                        method: Methods.signTransaction,
                        params: {
                            ...(isVersioned ? {} : (transaction as any).toJSON?.() ?? {}),
                            transaction: serialized,
                        },
                    },
                })
                if (result.transaction) {
                    return this.deserialize(result.transaction, isVersioned) as T
                }
                // Legacy WC wallets return only the signature. `Transaction.addSignature` has a
                // different contract than `VersionedTransaction.addSignature` (and blind-attaching
                // a single signature to a v0 tx can silently drop required co-signers), so we
                // refuse the partial result and surface a clear error.
                if (isVersioned) {
                    throw new WalletSignTransactionError(
                        "Wallet returned only a signature for a versioned transaction; full signed transaction required",
                    )
                }
                ;(transaction as Transaction).addSignature(this._publicKey, Buffer.from(base58.decode(result.signature)))
                return transaction
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error)
            }
        } catch (error: any) {
            this.emit("error", error)
            throw error
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            if (!this._provider || !this._session || !this._publicKey) throw new WalletNotConnectedError()
            try {
                const result = await this._provider.client.request<{ signature: string }>({
                    chainId: this._network,
                    topic: this._session.topic,
                    request: {
                        method: Methods.signMessage,
                        params: {
                            pubkey: this._publicKey.toString(),
                            message: base58.encode(message),
                        },
                    },
                })
                return base58.decode(result.signature)
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error)
            }
        } catch (error: any) {
            this.emit("error", error)
            throw error
        }
    }

    async signAndSendTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<string> {
        try {
            if (!this._provider || !this._session) throw new WalletNotConnectedError()
            try {
                const result = await this._provider.client.request<{ signature: string }>({
                    chainId: this._network,
                    topic: this._session.topic,
                    request: {
                        method: Methods.signAndSendTransaction,
                        params: { transaction: this.serialize(transaction) },
                    },
                })
                return result.signature
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error)
            }
        } catch (error: any) {
            this.emit("error", error)
            throw error
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        if (!this._provider || !this._session) {
            const error = new WalletNotConnectedError()
            this.emit("error", error)
            throw error
        }
        try {
            const serialized = transactions.map(t => this.serialize(t))
            const result = await this._provider.client.request<{ transactions: string[] }>({
                chainId: this._network,
                topic: this._session.topic,
                request: {
                    method: Methods.signAllTransactions,
                    params: { transactions: serialized },
                },
            })
            return transactions.map((t, i) => {
                const isVersioned = isVersionedTransaction(t)
                return this.deserialize(result.transactions[i] ?? "", isVersioned) as T
            })
        } catch (batchError: any) {
            // Only fall back to per-transaction signing when the wallet genuinely
            // doesn't support the batch method. For user rejections or other
            // failures, surface the original error — otherwise a declined batch
            // would re-prompt the user once per transaction.
            const msg = (batchError?.message ?? '').toLowerCase()
            const isUnsupported =
                batchError?.code === 4200 ||
                msg.includes('not supported') ||
                msg.includes('method not found') ||
                msg.includes('unsupported')
            if (!isUnsupported) {
                this.emit("error", batchError)
                throw batchError
            }
            // signTransaction handles its own "error" emission, so we don't
            // re-emit here to avoid firing listeners twice for the same failure.
            return await Promise.all(transactions.map(t => this.signTransaction(t)))
        }
    }

    private serialize(transaction: Transaction | VersionedTransaction): string {
        return Buffer.from(transaction.serialize({ verifySignatures: false } as any)).toString("base64")
    }

    private deserialize(serializedTransaction: string, versioned = false): Transaction | VersionedTransaction {
        if (versioned) {
            return VersionedTransaction.deserialize(Buffer.from(serializedTransaction, "base64"))
        }
        return Transaction.from(Buffer.from(serializedTransaction, "base64"))
    }
}
