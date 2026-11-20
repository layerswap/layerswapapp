import type { createEVMClient } from '@metamask/connect-evm'
import { ChainNotConfiguredError, createConnector, extractRpcUrls } from '@wagmi/core'
import { getAddress, numberToHex, type AddEthereumChainParameter } from 'viem'
import { ensureEvmChain } from '../service/ensureEvmChain'

type Client = Awaited<ReturnType<typeof createEVMClient>>
type MetaMaskConnectParameters = Pick<Parameters<typeof createEVMClient>[0], 'dapp'>

/**
 * MetaMask Connect's public EIP-1193/lifecycle API adapted to Wagmi 2.
 * SDK initialization restores the session before authorization is inspected.
 * No SDK internals, provider cache mutations, or Wagmi 3 APIs are used.
 */
export function metaMaskConnect(parameters: MetaMaskConnectParameters) {
    return createConnector<ReturnType<Client['getProvider']>>((config) => {
        let clientPromise: Promise<Client> | undefined
        const getClient = (): Promise<Client> => {
            if (!clientPromise) {
                clientPromise = import('@metamask/connect-evm')
                    .then(({ createEVMClient }) => createEVMClient({
                        ...parameters,
                        skipAutoAnnounce: true,
                        api: {
                            supportedNetworks: Object.fromEntries(config.chains.map(chain => [
                                numberToHex(chain.id),
                                extractRpcUrls({ chain, transports: config.transports })[0],
                            ])),
                        },
                        eventHandlers: {
                            accountsChanged: accounts => connector.onAccountsChanged(accounts),
                            chainChanged: chainId => connector.onChainChanged(chainId),
                            connect: ({ accounts, chainId }) => {
                                if (accounts.length) config.emitter.emit('connect', {
                                    accounts: accounts.map(address => getAddress(address)),
                                    chainId: Number(chainId),
                                })
                            },
                            disconnect: () => connector.onDisconnect(),
                            displayUri: uri => config.emitter.emit('message', { type: 'display_uri', data: uri }),
                        },
                    }))
                    .catch(error => {
                        // A failed import/initialization must not poison subsequent connects.
                        clientPromise = undefined
                        throw error
                    })
            }
            return clientPromise
        }

        const connector = {
            // Preserve the ID used by wallet selection, icons and persisted Wagmi state.
            id: 'metaMaskSDK',
            name: 'MetaMask',
            type: 'metaMask',
            rdns: ['io.metamask', 'io.metamask.mobile'],
            async connect({ chainId, isReconnecting }: { chainId?: number; isReconnecting?: boolean } = {}) {
                if (chainId && !config.chains.some(chain => chain.id === chainId)) throw new ChainNotConfiguredError()
                const client = await getClient()
                let accounts = client.accounts.map(address => getAddress(address))
                if (!isReconnecting) {
                    const chainIds = chainId
                        ? [chainId, ...config.chains.filter(chain => chain.id !== chainId).map(chain => chain.id)]
                        : config.chains.map(chain => chain.id)
                    const result = await client.connect({ chainIds: chainIds.map(id => numberToHex(id)) })
                    accounts = result.accounts.map(address => getAddress(address))
                }
                if (!accounts.length) throw new Error('MetaMask session is no longer connected')
                if (chainId && await connector.getChainId() !== chainId) await connector.switchChain({ chainId })
                return { accounts, chainId: await connector.getChainId() }
            },
            async disconnect() {
                // Wagmi can call disconnect before the first connect. Do not load the SDK
                // for that no-op, or revoke an already disconnected session a second time.
                if (!clientPromise) return
                const client = await clientPromise
                if (client.status !== 'disconnected') await client.disconnect()
            },
            async getAccounts() {
                return (await getClient()).accounts.map(address => getAddress(address))
            },
            async getChainId() {
                const chainId = Number((await getClient()).getChainId())
                if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error('MetaMask has no selected network')
                return chainId
            },
            async getProvider() {
                return (await getClient()).getProvider()
            },
            async isAuthorized() {
                try { return (await connector.getAccounts()).length > 0 } catch { return false }
            },
            async switchChain({ chainId, addEthereumChainParameter }: {
                chainId: number
                addEthereumChainParameter?: Partial<AddEthereumChainParameter>
            }) {
                const chain = config.chains.find(chain => chain.id === chainId)
                if (!chain) throw new ChainNotConfiguredError()
                await ensureEvmChain({
                    chain,
                    addEthereumChainParameter,
                    getProvider: connector.getProvider,
                    onReady: () => connector.onChainChanged(numberToHex(chain.id)),
                })
                return chain
            },
            onAccountsChanged(accounts: string[]) {
                if (!accounts.length) connector.onDisconnect()
                else config.emitter.emit('change', { accounts: accounts.map(address => getAddress(address)) })
            },
            onChainChanged(chainId: string) {
                config.emitter.emit('change', { chainId: Number(chainId) })
            },
            onDisconnect() {
                config.emitter.emit('disconnect')
            },
        }
        return connector
    })
}
