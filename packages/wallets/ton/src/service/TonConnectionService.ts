import type {
    InternalConnector,
    NetworkWithTokens,
    Wallet,
    WalletConnectionProvider,
} from '@layerswap/widget/types'
import { walletIconResolver } from '@layerswap/widget/internal'
import type { ConnectedWallet } from '@tonconnect/ui-react'
import { name as PROVIDER_NAME, id as PROVIDER_ID, tonNames } from '../constants'
import { Address } from '@ton/core'
import { getTonConnectUI } from './getTonConnectUI'
import { snapshotFromTonWallet, type TonWalletSnapshot, useTonStore } from './tonStore'

const TON_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALSSURBVHgB7ZoxUxNBGIa/YEhITJRRG61ig40wjlJpExttsbWCX0DyC5L8AqCzQxpbMmNlFxtoYIYRGipS6YwjMxkxxkRE7r0Z7vYWyIXdb8NsZp8qN3N3e+++u9+7t7kEvfv+n0aYMRpxnEDbcQJtxwm0HSfQdpxA23ECbWfkBSZJk8l0gp7cSVIhf4M4aR79o8a3v6SLlsC5QppWizlPpJmBAJHljTbVm11SRfnJivfHaf31LWPiAEYF2kBbqig/3dLzHA2LyuxNUkVpiE6mvHl3L7y0ftCl8uavvtesv7odXNP42qOFxlHf80vTGVqczvq/iw/GPTfHvCF7QldFTaA0LD97xSCu8VYvuvUTd76KmItQGqKY/K1u+ACLXm+jmnKCe4btnSgLVp6DK3ud4DeKQelxhrjAnBNjZ22/Q6ooC1z+0om6OJNlcRHC5qfSwTGcW967BoGYU+XNdnCMwlN5ql7tzqg8y0bcq223vY5U37rVCrH3+3+8ihiuNkozGa0Vje/eo4ngGO6hDR20Uxo9LLJazJMqcE/k5ccW6aItEA6uCb2MzFJZecwVUhH34ByqtS4s66zq9u9IwVFZecgro5p3Tw5YBKKnxdiAi/NTEwNfj3MjhWWrzeIeYFspIzbEMF56kRs4Niqz4dzDPapM7gE2gX5sbITrS8TGIOEvh7pctHRhfdepN3uR2IgLfznUdw6PtWNBhv1lTnQgzkU51N98+kncsAuEgyu74Ry6zEU51LliQcbI63h1K4yNy1wUQx2FpcZYWESMCETBEWPDdzEVuljIJyPuwXET7oGEyY8QDt7e9d/E+wH3Hn44JFMY3RddaMQXDe5YkDEqEAVHjA0ZFBbuWJAxvrPdb3PJVGERMS7QX6funhdiKhZkhvLfhBgbwGQsyAxFIGIDQ3Xnx7HvGorPMNwDCfetmuU4gbbjBNqOE2g7TqDtOIG2cwq0XR5LWK5AWAAAAABJRU5ErkJggg=='

export class TonConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _networksKey = ''

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networksKey = key
    }

    getNetworkIcon(): string | undefined {
        return this._networks.find(n => tonNames.some(name => name === n.name))?.logo
    }

    getProviderIcon(): string | undefined {
        return this.getNetworkIcon()
    }

    getAvailableConnectors(): InternalConnector[] {
        return [{
            id: PROVIDER_ID,
            name: PROVIDER_NAME,
            icon: TON_LOGO,
            extensionNotFound: false,
            providerName: PROVIDER_NAME,
        }]
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
            const tonConnectUI = getTonConnectUI()
            await tonConnectUI.disconnect()
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async connectWallet(): Promise<Wallet | undefined> {
        const tonConnectUI = getTonConnectUI()

        if (useTonStore.getState().tonWallet) {
            await this.disconnectWallets()
        }

        const status = await new Promise<ConnectedWallet>((resolve, reject) => {
            let unsubscribeModal: (() => void) | undefined
            let unsubscribeStatus: (() => void) | undefined
            const cleanup = () => {
                unsubscribeModal?.()
                unsubscribeStatus?.()
            }
            try {
                tonConnectUI.openModal()

                unsubscribeModal = tonConnectUI.onModalStateChange((state) => {
                    if (state.status === 'closed' && state.closeReason === 'action-cancelled') {
                        cleanup()
                        reject(new Error("You've declined the wallet connection request"))
                    }
                })

                unsubscribeStatus = tonConnectUI.onStatusChange((s) => {
                    if (s) {
                        cleanup()
                        resolve(s)
                    }
                })
            } catch (error) {
                cleanup()
                console.error('Error connecting:', error)
                reject(error as Error)
            }
        })

        const snapshot = snapshotFromTonWallet(status)
        return this.resolveWallet(snapshot)
    }

    buildProvider(snapshot: TonWalletSnapshot | undefined): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets(snapshot)
        const activeWallet = connectedWallets[0]

        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),

            availableConnectors: this.getAvailableConnectors(),
            connectedWallets,
            activeWallet,
            withdrawalSupportedNetworks: tonNames,
            autofillSupportedNetworks: tonNames,
            asSourceSupportedNetworks: tonNames,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            ready: useTonStore.getState().ready,
        }
    }
}

export const tonConnectionService = new TonConnectionService()
