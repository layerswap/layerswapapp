import type { ImtblPassportConfig } from '..'
import { useImtblPassportStore } from './imtblPassportStore'

export class ImtblPassportService {
    private _config: ImtblPassportConfig | undefined
    private _initializing: Promise<void> | undefined

    setConfig(config: ImtblPassportConfig | undefined): void {
        this._config = config
    }

    hasInstance(): boolean {
        return useImtblPassportStore.getState().instance !== undefined
    }

    getInstance(): unknown {
        const instance = useImtblPassportStore.getState().instance
        if (!instance) {
            throw new Error('Passport instance requested before initialization')
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
        if (!publishableKey || !clientId || !redirectUri || !logoutRedirectUri) return

        const passport = (await import('@imtbl/sdk')).passport
        const sdkConfig = (await import('@imtbl/sdk')).config

        const instance = new passport.Passport({
            baseConfig: {
                environment: publishableKey.includes('pk_imapik-test')
                    ? sdkConfig.Environment.SANDBOX
                    : sdkConfig.Environment.PRODUCTION,
                publishableKey,
            },
            clientId,
            audience: 'platform_api',
            scope: 'openid offline_access email transact',
            redirectUri,
            logoutRedirectUri,
            logoutMode: 'silent',
        })

        useImtblPassportStore.getState()._setInstance(instance)
    }

    async ensureEvmConnected(): Promise<void> {
        if (!this.hasInstance()) await this.initialize()
        const instance = this.getInstance() as { connectEvm: () => Promise<unknown> | unknown }
        await instance.connectEvm()
    }

    async loginCallback(): Promise<void> {
        if (!this.hasInstance()) await this.initialize()
        const instance = this.getInstance() as { loginCallback: () => Promise<void> | void }
        await instance.loginCallback()
    }
}

export const imtblPassportService = new ImtblPassportService()
