import type { Auth } from '@imtbl/auth'
import type { ImtblPassportConfig } from '..'
import { useImtblPassportStore } from './imtblPassportStore'

export class ImtblPassportService {
    private _config: ImtblPassportConfig | undefined
    private _initializing: Promise<void> | undefined
    private _evmConnected = false

    setConfig(config: ImtblPassportConfig | undefined): void {
        this._config = config
    }

    hasInstance(): boolean {
        return useImtblPassportStore.getState().instance !== undefined
    }

    getInstance(): Auth {
        const instance = useImtblPassportStore.getState().instance
        if (!instance) {
            throw new Error('Passport auth instance requested before initialization')
        }
        return instance
    }

    async initialize(config?: ImtblPassportConfig): Promise<void> {
        const cfg = config ?? this._config
        if (this._initializing) return this._initializing
        if (this.hasInstance()) return

        this._initializing = this._doInitialize(cfg).finally(() => {
            this._initializing = undefined
        })
        return this._initializing
    }

    private async _doInitialize(config: ImtblPassportConfig | undefined): Promise<void> {
        const { publishableKey, clientId, redirectUri, logoutRedirectUri } = config || {}
        // publishableKey is not required by the Auth SDK — it is only sniffed
        // below to pick the sandbox vs production Passport domain.
        if (!clientId || !redirectUri || !logoutRedirectUri) return

        const { Auth } = await import('@imtbl/auth')
        const isSandbox = publishableKey?.includes('pk_imapik-test') === true
        const passportDomain = isSandbox
            ? 'https://passport.sandbox.immutable.com'
            : 'https://passport.immutable.com'

        const instance = new Auth({
            clientId,
            redirectUri,
            popupRedirectUri: redirectUri,
            logoutRedirectUri,
            logoutMode: 'silent',
            audience: 'platform_api',
            scope: 'openid offline_access email transact',
            authenticationDomain: 'https://auth.immutable.com',
            passportDomain,
        })

        useImtblPassportStore.getState()._setInstance(instance)
    }

    async ensureEvmConnected(): Promise<void> {
        const clientId = this._config?.clientId
        if (this._evmConnected || !clientId) return
        this._evmConnected = true

        if (!this.hasInstance()) await this.initialize()
        const auth = this.getInstance()

        const { connectWallet, IMMUTABLE_ZKEVM_MAINNET_CHAIN, IMMUTABLE_ZKEVM_TESTNET_CHAIN } = await import('@imtbl/wallet')
        const isSandbox = this._config?.publishableKey?.includes('pk_imapik-test') === true
        const selectedChain = isSandbox ? IMMUTABLE_ZKEVM_TESTNET_CHAIN : IMMUTABLE_ZKEVM_MAINNET_CHAIN
        await connectWallet({
            clientId,
            chains: [selectedChain],
            initialChainId: selectedChain.chainId,
            getUser: async (forceRefresh, options) => {
                if (forceRefresh) return auth.forceUserRefresh()
                if (options?.silent) return auth.getUser()
                return auth.getUserOrLogin()
            },
            announceProvider: true, // EIP-6963
        })
    }

    async loginCallback(): Promise<void> {
        if (!this.hasInstance()) await this.initialize()
        await this.getInstance().loginCallback()
    }
}

export const imtblPassportService = new ImtblPassportService()
