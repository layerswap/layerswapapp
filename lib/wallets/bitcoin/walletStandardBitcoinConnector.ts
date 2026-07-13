import { MethodNotSupportedRpcError, ProviderNotFoundError, UserRejectedRequestError } from '@bigmi/core'
import type { CreateConnectorFn } from '@bigmi/client'
import { getWallets } from '@wallet-standard/app'
import type { IdentifierString, Wallet, WalletAccount } from '@wallet-standard/base'

type WalletStandardBitcoinParams = {
    chainId: number
    walletName: string
    walletId: string
    /** wallet-standard registered name to match against, if it differs from the display name */
    standardName?: string
    walletStandardChain?: IdentifierString
    icon?: string
    shimDisconnect?: boolean
}

const BITCOIN_CONNECT = 'bitcoin:connect'
const BITCOIN_DISCONNECT = 'bitcoin:disconnect'
const BITCOIN_SIGN_TRANSACTION = 'bitcoin:signTransaction'
const BITCOIN_EVENTS = 'bitcoin:events'
const STANDARD_EVENTS = 'standard:events'

type BitcoinSigHash = 'ALL' | 'NONE' | 'SINGLE' | 'ALL|ANYONECANPAY' | 'NONE|ANYONECANPAY' | 'SINGLE|ANYONECANPAY'

type AccountsChangeEvent = { accounts?: readonly WalletAccount[] }

type BitcoinSignTransactionFeature = {
    signTransaction: (...inputs: {
        psbt: Uint8Array
        inputsToSign: readonly { account: WalletAccount, signingIndexes: readonly number[], sigHash?: BitcoinSigHash }[]
        chain?: IdentifierString
    }[]) => Promise<readonly { signedPsbt: Uint8Array }[]>
}

type SignPsbtParams = {
    psbt: string
    inputsToSign: readonly { signingIndexes: number[], sigHash?: number }[]
}

const feature = <T>(wallet: Wallet, name: string) => wallet.features[name as IdentifierString] as T | undefined

const supportsWallet = (wallet: Wallet, walletName: string, chain: IdentifierString) =>
    wallet.name.toLowerCase() === walletName.toLowerCase()
    && BITCOIN_CONNECT in wallet.features
    && BITCOIN_SIGN_TRANSACTION in wallet.features
    && wallet.chains.includes(chain)

const SIGHASH_FLAGS: Record<number, BitcoinSigHash> = {
    0x01: 'ALL',
    0x02: 'NONE',
    0x03: 'SINGLE',
    0x81: 'ALL|ANYONECANPAY',
    0x82: 'NONE|ANYONECANPAY',
    0x83: 'SINGLE|ANYONECANPAY',
}

const mapSigHash = (sigHash?: number): BitcoinSigHash | undefined =>
    sigHash === undefined ? undefined : SIGHASH_FLAGS[sigHash]

export function walletStandardBitcoinConnector(params: WalletStandardBitcoinParams): CreateConnectorFn {
    const { chainId, walletName, walletId, standardName = walletName, walletStandardChain = 'bitcoin:mainnet', icon: fallbackIcon, shimDisconnect = true } = params

    let account: WalletAccount | undefined
    let eventsOff: (() => void) | undefined

    const resolveWallet = (): Wallet | undefined => {
        if (typeof window === 'undefined') return undefined
        return getWallets().get().find(w => supportsWallet(w, standardName, walletStandardChain))
    }

    const requireWallet = (): Wallet => {
        const wallet = resolveWallet()
        if (!wallet) throw new ProviderNotFoundError()
        return wallet
    }

    return (config) => ({
        id: walletId,
        name: walletName,
        type: 'UTXO',
        get icon() {
            return resolveWallet()?.icon ?? fallbackIcon
        },

        async getProvider() {
            if (!resolveWallet()) return undefined
            return {
                request: (args: { method: string, params: SignPsbtParams }) => this.request(args),
            }
        },

        async request({ method, params }: { method: string, params: SignPsbtParams }) {
            switch (method) {
                case 'signPsbt': {
                    const wallet = requireWallet()
                    const signFeature = feature<BitcoinSignTransactionFeature>(wallet, BITCOIN_SIGN_TRANSACTION)
                    if (!signFeature) throw new MethodNotSupportedRpcError()
                    const signingAccount = account ?? wallet.accounts[0]
                    if (!signingAccount) throw new ProviderNotFoundError()

                    const [output] = await signFeature.signTransaction({
                        psbt: new Uint8Array(Buffer.from(params.psbt, 'hex')),
                        inputsToSign: params.inputsToSign.map(input => ({
                            account: signingAccount,
                            signingIndexes: input.signingIndexes,
                            sigHash: mapSigHash(input.sigHash),
                        })),
                        chain: walletStandardChain,
                    })

                    return Buffer.from(output.signedPsbt).toString('hex')
                }
                default:
                    throw new MethodNotSupportedRpcError()
            }
        },

        async connect(parameters?: { chainId?: number, isReconnecting?: boolean }) {
            const wallet = requireWallet()
            const connectFeature = feature<{ connect: (input?: { purposes?: readonly ('payment' | 'ordinals')[] }) => Promise<{ accounts: readonly WalletAccount[] }> }>(wallet, BITCOIN_CONNECT)
            if (!connectFeature) throw new ProviderNotFoundError()
            try {
                const { accounts } = await connectFeature.connect({ purposes: ['payment'] })
                account = accounts[0]
                if (!account) throw new Error('No account returned')

                type Events = { on: (event: 'change', listener: (event: AccountsChangeEvent) => void) => () => void }
                const eventsFeature = feature<Events>(wallet, BITCOIN_EVENTS) ?? feature<Events>(wallet, STANDARD_EVENTS)
                if (eventsFeature?.on && !eventsOff) {
                    eventsOff = eventsFeature.on('change', ({ accounts: changedAccounts }) => {
                        if (!changedAccounts) return
                        const next = changedAccounts[0]
                        if (!next) {
                            this.onDisconnect()
                        } else {
                            account = next
                            config.emitter.emit('change', { accounts: [next.address] })
                        }
                    })
                }

                if (shimDisconnect) {
                    await Promise.all([
                        config.storage?.setItem(`${this.id}.connected`, true),
                        config.storage?.removeItem(`${this.id}.disconnected`),
                    ])
                }

                return { accounts: [account.address], chainId }
            } catch (error) {
                // A failed silent reconnect means authorization was revoked wallet-side;
                // clear the shim so the next refresh doesn't prompt again.
                if (parameters?.isReconnecting && shimDisconnect) {
                    await Promise.all([
                        config.storage?.setItem(`${this.id}.disconnected`, true),
                        config.storage?.removeItem(`${this.id}.connected`),
                    ])
                }
                throw new UserRejectedRequestError(error instanceof Error ? error.message : String(error))
            }
        },

        async disconnect() {
            const wallet = resolveWallet()
            try {
                if (wallet) await feature<{ disconnect: () => Promise<void> }>(wallet, BITCOIN_DISCONNECT)?.disconnect()
            } catch {
                // the wallet may not support programmatic disconnect
            }
            if (eventsOff) {
                eventsOff()
                eventsOff = undefined
            }
            account = undefined
            if (shimDisconnect) {
                await Promise.all([
                    config.storage?.setItem(`${this.id}.disconnected`, true),
                    config.storage?.removeItem(`${this.id}.connected`),
                ])
            }
        },

        async getAccounts() {
            return requireWallet().accounts.map(a => a.address)
        },

        async getChainId() {
            return chainId
        },

        async isAuthorized() {
            try {
                const isDisconnected = shimDisconnect && (await config.storage?.getItem(`${this.id}.disconnected`))
                if (isDisconnected) return false
                const wallet = resolveWallet()
                if (!wallet) return false
                if (wallet.accounts.length > 0) {
                    account = wallet.accounts[0]
                    return true
                }
                const wasConnected = shimDisconnect && (await config.storage?.getItem(`${this.id}.connected`))
                return Boolean(wasConnected)
            } catch {
                return false
            }
        },

        async onAccountsChanged(accounts: string[]) {
            if (accounts.length === 0) {
                this.onDisconnect()
            } else {
                config.emitter.emit('change', { accounts })
            }
        },

        onChainChanged() {
            return
        },

        async onDisconnect() {
            if (eventsOff) {
                eventsOff()
                eventsOff = undefined
            }
            account = undefined
            config.emitter.emit('disconnect')
        },
    })
}
