import {
  type Account,
  type Address,
  type BtcRpcRequestFn,
  ChainId,
  getAddressInfo,
  MethodNotSupportedRpcError,
  ProviderNotFoundError,
  type RpcParameters,
  type SignPsbtParameters,
  type UTXOSchema,
  type UTXOWalletSchema,
  UserRejectedRequestError,
} from '@bigmi/core'
import {
  ChainNotSupportedError,
  type CreateConnectorFn,
  type UTXOConnectorParameters,
} from '@bigmi/client'

type ProviderRequestParams = RpcParameters<
  [...UTXOWalletSchema, ...UTXOSchema]
>

type UTXOWalletProvider = {
  request: BtcRpcRequestFn<UTXOWalletSchema>
}

function createConnector<
  provider,
  properties extends Record<string, unknown> = Record<string, unknown>,
  storageItem extends Record<string, unknown> = Record<string, unknown>,
  createConnectorFn extends CreateConnectorFn<
    provider,
    properties,
    storageItem
  > = CreateConnectorFn<provider, properties, storageItem>,
>(createConnectorFn: createConnectorFn): createConnectorFn {
  return createConnectorFn
}

function createBidirectionalMap<
  T extends string | number,
  U extends string | number,
>(
  mappings: readonly (readonly [T, U])[]
): {
  forward: Record<T, U>
  reverse: Partial<Record<U, T>>
} {
  const forward = Object.fromEntries(mappings) as Record<T, U>
  const reverse = Object.fromEntries(
    mappings.map(([key, value]) => [value, key])
  ) as Partial<Record<U, T>>

  return { forward, reverse }
}

export enum UnisatBitcoinChainEnum {
  BITCOIN_MAINNET = 'BITCOIN_MAINNET',
  BITCOIN_TESTNET = 'BITCOIN_TESTNET',
  BITCOIN_TESTNET4 = 'BITCOIN_TESTNET4',
  BITCOIN_SIGNET = 'BITCOIN_SIGNET',
  FRACTAL_BITCOIN_MAINNET = 'FRACTAL_BITCOIN_MAINNET',
  FRACTAL_BITCOIN_TESTNET = 'FRACTAL_BITCOIN_TESTNET',
}

export type UnisatBitcoinNetwork = 'livenet' | 'testnet'

export type UnisatBitcoinChain = {
  enum: UnisatBitcoinChainEnum
  name: string
  network: UnisatBitcoinNetwork
}

export type UnisatBitcoinEventMap = {
  accountsChanged(accounts: Address[]): void
  networkChanged(network: UnisatBitcoinNetwork): void
}

export type UnisatBitcoinEvents = {
  addListener<TEvent extends keyof UnisatBitcoinEventMap>(
    event: TEvent,
    listener: UnisatBitcoinEventMap[TEvent]
  ): void
  removeListener<TEvent extends keyof UnisatBitcoinEventMap>(
    event: TEvent,
    listener: UnisatBitcoinEventMap[TEvent]
  ): void
}

type UnisatConnectorProperties = {
  getAccounts(): Promise<readonly Account[]>
  onAccountsChanged(accounts: Address[]): void
  getInternalProvider(): Promise<UnisatBitcoinProvider>
} & UTXOWalletProvider

type UnisatBitcoinProvider = {
  requestAccounts(): Promise<Address[]>
  getAccounts(): Promise<Address[]>
  getPublicKey(): Promise<string>
  signPsbt(
    psbtHex: string,
    options: {
      toSignInputs: {
        index: number
        address: string
        sighashTypes?: number[]
      }[]
      autoFinalized?: boolean
    }
  ): Promise<string>
  getChain(): Promise<UnisatBitcoinChain>
  switchChain(chain: UnisatBitcoinChainEnum): Promise<UnisatBitcoinChain>
} & UnisatBitcoinEvents

export function unisat(
  parameters: UTXOConnectorParameters = {}
): CreateConnectorFn<
  UTXOWalletProvider | undefined,
  UnisatConnectorProperties
> {
  const UnisatBitcoinNetworkChainIdMap: Record<UnisatBitcoinNetwork, ChainId> =
    {
      livenet: ChainId.BITCOIN_MAINNET,
      testnet: ChainId.BITCOIN_TESTNET,
    }

  const { forward: UnisatBitcoinChainIdMap, reverse: ChainIdToUnisatMap } =
    createBidirectionalMap<UnisatBitcoinChainEnum, ChainId>([
      [UnisatBitcoinChainEnum.BITCOIN_MAINNET, ChainId.BITCOIN_MAINNET],
      [UnisatBitcoinChainEnum.BITCOIN_TESTNET, ChainId.BITCOIN_TESTNET],
      [UnisatBitcoinChainEnum.BITCOIN_TESTNET4, ChainId.BITCOIN_TESTNET4],
      [UnisatBitcoinChainEnum.BITCOIN_SIGNET, ChainId.BITCOIN_SIGNET],
      [
        UnisatBitcoinChainEnum.FRACTAL_BITCOIN_MAINNET,
        ChainId.FRACTAL_BITCOIN_MAINNET,
      ],
      [
        UnisatBitcoinChainEnum.FRACTAL_BITCOIN_TESTNET,
        ChainId.FRACTAL_BITCOIN_TESTNET,
      ],
    ] as const)
  const { shimDisconnect = true } = parameters
  let accountsChanged: ((accounts: Address[]) => void) | undefined
  let chainChanged: ((network: UnisatBitcoinNetwork) => void) | undefined
  return createConnector<
    UTXOWalletProvider | undefined,
    UnisatConnectorProperties
  >((config) => ({
    id: 'unisat',
    name: 'Unisat',
    type: unisat.type,
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0i5Zu+5bGCIDIiIHZpZXdCb3g9IjAgMCAxMTUuNzcgMTQ3LjciPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDE9IjMzNzkuMDMiIHgyPSIzNDE1LjQ4IiB5MT0iLTIxMDIiIHkyPSItMjE5OC4xMSIgZGF0YS1uYW1lPSLmnKrlkb3lkI3nmoTmuJDlj5ggNSIgZ3JhZGllbnRUcmFuc2Zvcm09InJvdGF0ZSgtMTM0LjczIDIxODcuNjY3IC0zNTMuNDI3KSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzIwMWMxYiIvPjxzdG9wIG9mZnNldD0iLjM2IiBzdG9wLWNvbG9yPSIjNzczOTBkIi8+PHN0b3Agb2Zmc2V0PSIuNjciIHN0b3AtY29sb3I9IiNlYTgxMDEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmNGI4NTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjMzODQuMjMiIHgyPSIzMzMwLjY0IiB5MT0iLTIyMzEuNDIiIHkyPSItMjEzMS4yOSIgZGF0YS1uYW1lPSLmnKrlkb3lkI3nmoTmuJDlj5ggNCIgZ3JhZGllbnRUcmFuc2Zvcm09InJvdGF0ZSgtMTM0LjczIDIxODcuNjY3IC0zNTMuNDI3KSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzFmMWQxYyIvPjxzdG9wIG9mZnNldD0iLjM3IiBzdG9wLWNvbG9yPSIjNzczOTBkIi8+PHN0b3Agb2Zmc2V0PSIuNjciIHN0b3AtY29sb3I9IiNlYTgxMDEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmNGZiNTIiLz48L2xpbmVhckdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iYyIgY3g9IjUzLjAxIiBjeT0iNDUuODQiIHI9IjExLjEzIiBkYXRhLW5hbWU9IuacquWRveWQjeeahOa4kOWPmCA2IiBmeD0iNTMuMDEiIGZ5PSI0NS44NCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y0Yjg1MiIvPjxzdG9wIG9mZnNldD0iLjMzIiBzdG9wLWNvbG9yPSIjZWE4MTAxIi8+PHN0b3Agb2Zmc2V0PSIuNjQiIHN0b3AtY29sb3I9IiM3NzM5MGQiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMyMTFjMWQiLz48L3JhZGlhbEdyYWRpZW50PjwvZGVmcz48ZyBkYXRhLW5hbWU9IuWbvuWxgiAxIj48cGF0aCBmaWxsPSJ1cmwoI2EpIiBkPSJtODEuNjYgMTMuMjkgMzAuMzEgMzAuMDJjMi41OCAyLjU1IDMuODUgNS4xMyAzLjgxIDcuNzMtLjA0IDIuNi0xLjE1IDQuOTctMy4zMiA3LjEyLTIuMjcgMi4yNS00LjcyIDMuMzktNy4zNCAzLjQ0LTIuNjIuMDQtNS4yMi0xLjIyLTcuOC0zLjc3bC0zMS0zMC43Yy0zLjUyLTMuNDktNi45Mi01Ljk2LTEwLjE5LTcuNDEtMy4yNy0xLjQ1LTYuNzEtMS42OC0xMC4zMS0uNjgtMy42MS45OS03LjQ4IDMuNTQtMTEuNjMgNy42NC01LjcyIDUuNjctOC40NSAxMC45OS04LjE3IDE1Ljk2LjI4IDQuOTcgMy4xMiAxMC4xMyA4LjUxIDE1LjQ2bDMxLjI1IDMwLjk2YzIuNjEgMi41OCAzLjg5IDUuMTYgMy44NSA3LjcyLS4wNCAyLjU3LTEuMTYgNC45NC0zLjM3IDcuMTMtMi4yIDIuMTgtNC42MyAzLjMyLTcuMjcgMy40MS0yLjY0LjA5LTUuMjctMS4xNi03Ljg3LTMuNzRMMjAuODEgNzMuNTZjLTQuOTMtNC44OC04LjQ5LTkuNS0xMC42OC0xMy44Ni0yLjE5LTQuMzYtMy4wMS05LjI5LTIuNDQtMTQuNzkuNTEtNC43MSAyLjAyLTkuMjcgNC41NC0xMy42OSAyLjUxLTQuNDIgNi4xMS04Ljk0IDEwLjc4LTEzLjU3IDUuNTYtNS41MSAxMC44Ny05LjczIDE1LjkzLTEyLjY3QzQzLjk5IDIuMDQgNDguODguNDEgNTMuNi4wN2M0LjczLS4zNCA5LjM5LjYgMTQgMi44MiA0LjYxIDIuMjIgOS4yOSA1LjY4IDE0LjA1IDEwLjRaIi8+PHBhdGggZmlsbD0idXJsKCNiKSIgZD0iTTM0LjExIDEzNC40MiAzLjgxIDEwNC40QzEuMjMgMTAxLjg0LS4wNCA5OS4yNyAwIDk2LjY3Yy4wNC0yLjYgMS4xNS00Ljk3IDMuMzItNy4xMiAyLjI3LTIuMjUgNC43Mi0zLjM5IDcuMzQtMy40NCAyLjYyLS4wNCA1LjIyIDEuMjEgNy44IDMuNzdsMzAuOTkgMzAuN2MzLjUzIDMuNDkgNi45MiA1Ljk2IDEwLjE5IDcuNDEgMy4yNyAxLjQ1IDYuNzEgMS42NyAxMC4zMi42OCAzLjYxLS45OSA3LjQ4LTMuNTQgMTEuNjMtNy42NSA1LjcyLTUuNjcgOC40NS0xMC45OSA4LjE3LTE1Ljk2LS4yOC00Ljk3LTMuMTItMTAuMTMtOC41MS0xNS40N0w2NC42IDczLjI0Yy0yLjYxLTIuNTgtMy44OS01LjE2LTMuODUtNy43Mi4wNC0yLjU3IDEuMTYtNC45NCAzLjM3LTcuMTMgMi4yLTIuMTggNC42My0zLjMyIDcuMjctMy40MSAyLjY0LS4wOSA1LjI3IDEuMTYgNy44NyAzLjc0bDE1LjcgMTUuNDFjNC45MyA0Ljg4IDguNDkgOS41IDEwLjY4IDEzLjg2IDIuMTkgNC4zNiAzLjAxIDkuMjkgMi40NCAxNC43OS0uNTEgNC43MS0yLjAyIDkuMjctNC41NCAxMy42OS0yLjUxIDQuNDItNi4xMSA4Ljk0LTEwLjc4IDEzLjU3LTUuNTYgNS41MS0xMC44NyA5LjczLTE1LjkzIDEyLjY3LTUuMDYgMi45NC05Ljk1IDQuNTgtMTQuNjggNC45Mi00LjczLjM0LTkuMzktLjYtMTQtMi44Mi00LjYxLTIuMjItOS4yOS01LjY4LTE0LjA1LTEwLjRaIi8+PGNpcmNsZSBjeD0iNTMuMDEiIGN5PSI0NS44MyIgcj0iMTEuMTMiIGZpbGw9InVybCgjYykiLz48L2c+PC9zdmc+',
    async setup() {
      //
    },
    async getInternalProvider() {
      if (typeof window === 'undefined') {
        return
      }
      if ('unisat' in window) {
        const anyWindow: any = window
        if (anyWindow.unisat?.isBinance || anyWindow.unisat?.isBitKeep) {
          return
        }
        return anyWindow.unisat
      }
    },
    async getProvider() {
      debugger
      const internalProvider = await this.getInternalProvider()
      if (!internalProvider) {
        return
      }
      const provider = {
        request: this.request.bind(internalProvider),
      }
      return provider
    },
    async request(
      this: UnisatBitcoinProvider,
      { method, params }: ProviderRequestParams
    ): Promise<any> {
      switch (method) {
        case 'signPsbt': {
          const { psbt, ...options } = params as SignPsbtParameters
          const toSignInputs = options.inputsToSign.flatMap(
            ({ sigHash, address, signingIndexes }) =>
              signingIndexes.map((index) => ({
                index,
                address,
                sighashTypes: sigHash !== undefined ? [sigHash] : undefined,
              }))
          )
          const signedPsbt = await this.signPsbt(psbt, {
            toSignInputs,
            autoFinalized: options.finalize,
          })
          return signedPsbt
        }
        default:
          throw new MethodNotSupportedRpcError()
      }
    },
    async connect({ isReconnecting = false } = {}) {
      const provider = await this.getInternalProvider()
      if (!provider) {
        throw new ProviderNotFoundError()
      }
      try {
        // requestAccounts opens the UniSat extension. Reconnect runs on app mount,
        // so it must only inspect accounts that are already authorized.
        if (!isReconnecting) {
          await provider.requestAccounts()
        }

        const accounts = await this.getAccounts()
        if (accounts.length === 0) {
          throw new Error('No authorized UniSat accounts found.')
        }

        const chainId = await this.getChainId()

        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this)
          provider.addListener('accountsChanged', accountsChanged)
        }

        if (!chainChanged) {
          chainChanged = (network: UnisatBitcoinNetwork) =>
            this.onChainChanged(UnisatBitcoinNetworkChainIdMap[network])
          provider.addListener('networkChanged', chainChanged)
        }

        // Remove disconnected shim if it exists
        if (shimDisconnect) {
          await Promise.all([
            config.storage?.setItem(`${this.id}.connected`, true),
            config.storage?.removeItem(`${this.id}.disconnected`),
          ])
        }
        return { accounts, chainId }
      } catch (error: any) {
        throw new UserRejectedRequestError(error.message)
      }
    },
    async disconnect() {
      const provider = await this.getInternalProvider()

      if (accountsChanged) {
        provider?.removeListener('accountsChanged', accountsChanged)
        accountsChanged = undefined
      }

      if (chainChanged) {
        provider?.removeListener('networkChanged', chainChanged)
        chainChanged = undefined
      }

      // Add shim signalling connector is disconnected
      if (shimDisconnect) {
        await Promise.all([
          config.storage?.setItem(`${this.id}.disconnected`, true),
          config.storage?.removeItem(`${this.id}.connected`),
        ])
      }
    },
    async getAccounts() {
      const provider = await this.getInternalProvider()
      if (!provider) {
        throw new ProviderNotFoundError()
      }
      const accounts = await provider.getAccounts()
      const address = accounts[0]
      if (!address) {
        return []
      }

      const publicKey = await provider.getPublicKey()
      const { type, purpose } = getAddressInfo(address)

      const account: Account = {
        address,
        addressType: type,
        publicKey,
        purpose,
      }
      return [account]
    },
    async getChainId() {
      const provider = await this.getInternalProvider()
      if (!provider) {
        throw new ProviderNotFoundError()
      }
      const chain = await provider.getChain()
      return UnisatBitcoinChainIdMap[chain.enum]
    },
    async isAuthorized() {
      try {
        const isConnected =
          shimDisconnect &&
          // check storage to see if a connection exists already
          Boolean(await config.storage?.getItem(`${this.id}.connected`))
        if (!isConnected) {
          return false
        }

        const provider = await this.getInternalProvider()
        if (!provider) {
          return false
        }

        const accounts = await provider.getAccounts()
        return accounts.length > 0
      } catch {
        return false
      }
    },
    async switchChain({ chainId }) {
      try {
        const provider = await this.getInternalProvider()
        if (!provider) {
          throw new ProviderNotFoundError()
        }

        const unisatChainId = ChainIdToUnisatMap[chainId]
        if (!unisatChainId) {
          throw new ChainNotSupportedError(chainId, unisat.name)
        }

        const chain = await provider.switchChain(unisatChainId)
        return Boolean(chain)
      } catch {
        return false
      }
    },
    async onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        this.onDisconnect()
      } else {
        const newAccounts = await this.getAccounts()
        config.emitter.emit('change', {
          accounts: newAccounts,
        })
      }
    },
    async onChainChanged() {
      const chainId = await this.getChainId()
      const accounts = await this.getAccounts()
      config.emitter.emit('change', { chainId, accounts })
    },
    async onDisconnect(_error) {
      // No need to remove `${this.id}.disconnected` from storage because `onDisconnect` is typically
      // only called when the wallet is disconnected through the wallet's interface, meaning the wallet
      // actually disconnected and we don't need to simulate it.
      config.emitter.emit('disconnect')
    },
  }))
}

export declare namespace unisat {
  export var type: 'UTXO'
}

unisat.type = 'UTXO' as const
