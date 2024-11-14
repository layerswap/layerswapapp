import {
    type Maybe,
    PredicateConnector,
    type PredicateVersion,
    type PredicateWalletAdapter,
    type ProviderDictionary,
    SolanaWalletAdapter,
    getMockedSignatureIndex,
    getOrThrow,
    getProviderUrl,
  } from '@fuel-connectors/common';
  import { ApiController } from '@web3modal/core';
  import type { Web3Modal } from '@web3modal/solana';
  import type { Provider as SolanaProvider } from '@web3modal/solana/dist/types/src/utils/scaffold';
  import {
    CHAIN_IDS,
    type ConnectorMetadata,
    FuelConnectorEventTypes,
    Provider as FuelProvider,
    type TransactionRequestLike,
    hexlify,
    toUtf8Bytes,
  } from 'fuels';
  import { HAS_WINDOW, SOLANA_ICON } from './constants';
  import { PREDICATE_VERSIONS } from './generated/predicates';
  import type { SolanaConfig } from './types';
  import { type SolanaPredicateRoot, txIdEncoders } from './utils';
  import { createSolanaConfig, createSolanaWeb3ModalInstance } from './web3Modal';
  
  export class SolanaConnector extends PredicateConnector {
    name = 'Solana Wallets';
    events = FuelConnectorEventTypes;
    metadata: ConnectorMetadata = {
      image: SOLANA_ICON,
      install: {
        action: 'Install',
        description: 'Install Solana Wallet to connect to Fuel',
        link: 'https://solana.com/ecosystem/explore?categories=wallet',
      },
    };
  
    protected fuelProvider!: FuelProvider;
  
    private web3Modal!: Web3Modal;
    private config: SolanaConfig = {};
    private svmAddress: string | null = null;
  
    constructor(config: SolanaConfig) {
      super();
      this.customPredicate = config.predicateConfig || null;
      if (HAS_WINDOW) {
        this.configProviders(config);
      }
    }
  
    private async _emitDisconnect() {
      this.svmAddress = null;
      await this.setupPredicate();
      this.emit(this.events.connection, false);
      this.emit(this.events.accounts, []);
      this.emit(this.events.currentAccount, null);
    }
  
    private async _emitConnected() {
      await this.setupPredicate();
      const address = this.web3Modal.getAddress();
      if (!address || !this.predicateAccount) return;
      this.svmAddress = address;
      this.emit(this.events.connection, true);
      const predicate = this.predicateAccount.getPredicateAddress(address);
      this.emit(this.events.currentAccount, predicate);
      const accounts = await this.walletAccounts();
      const _accounts = this.predicateAccount?.getPredicateAddresses(accounts);
      this.emit(this.events.accounts, _accounts);
    }
  
    private modalFactory(config?: SolanaConfig) {
      const solanaConfig = createSolanaConfig(config?.projectId);
  
      return createSolanaWeb3ModalInstance({
        projectId: config?.projectId,
        solanaConfig,
      });
    }
  
    private providerFactory(config?: SolanaConfig) {
      const network = getProviderUrl(config?.chainId ?? CHAIN_IDS.fuel.testnet);
      return config?.fuelProvider || FuelProvider.create(network);
    }
  
    // Solana Web3Modal is Canary and not yet stable
    // It shares the same events as WalletConnect, hence validations must be made in order to avoid running connections with EVM Addresses instead of Solana Addresses
    private setupWatchers() {
      this.subscribe(
        this.web3Modal.subscribeEvents((event) => {
          switch (event.data.event) {
            case 'MODAL_OPEN':
              // Ensures that the Solana Web3Modal config is applied over pre-existing states (e.g. WC Connect Web3Modal)
              this.createModal();
              break;
            case 'CONNECT_SUCCESS': {
              const address = this.web3Modal.getAddress() || '';
              if (!address || address.startsWith('0x')) {
                return;
              }
              this._emitConnected();
              break;
            }
            case 'DISCONNECT_SUCCESS': {
              this._emitDisconnect();
              break;
            }
          }
        }),
      );
  
      // Poll for account changes due a problem with the event listener not firing on account changes
      const interval = setInterval(async () => {
        if (!this.web3Modal) {
          return;
        }
        const address = this.web3Modal.getAddress();
        if (address && address !== this.svmAddress) {
          this._emitConnected();
        }
        if (!address && this.svmAddress) {
          this._emitDisconnect();
        }
      }, 300);
  
      this.subscribe(() => clearInterval(interval));
    }
  
    // createModal re-instanciates the modal to update singletons from web3modal
    private createModal() {
      this.clearSubscriptions();
      const web3Modal = this.modalFactory(this.config);
      this.web3Modal = web3Modal;
      ApiController.prefetch();
      this.setupWatchers();
    }
  
    protected async requireConnection() {
      if (!this.web3Modal) this.createModal();
    }
  
    protected getWalletAdapter(): PredicateWalletAdapter {
      return new SolanaWalletAdapter();
    }
  
    protected getPredicateVersions(): Record<string, PredicateVersion> {
      return PREDICATE_VERSIONS;
    }
  
    protected async configProviders(config: SolanaConfig = {}) {
      const network = getProviderUrl(config.chainId ?? CHAIN_IDS.fuel.testnet);
      this.config = Object.assign(config, {
        fuelProvider: config.fuelProvider || FuelProvider.create(network),
      });
    }
  
    protected walletAccounts(): Promise<Array<string>> {
      if (!this.web3Modal) {
        return Promise.resolve([]);
      }
      return new Promise((resolve) => {
        const acc = this.web3Modal.getAddress();
        resolve(acc ? [acc] : []);
      });
    }
  
    protected getAccountAddress(): Maybe<string> {
      if (!this.web3Modal) return null;
  
      return this.web3Modal.getAddress();
    }
  
    protected async getProviders(): Promise<ProviderDictionary> {
      if (!this.config?.fuelProvider) {
        this.config = Object.assign(this.config, {
          fuelProvider: this.providerFactory(this.config),
        });
      }
      if (!this.fuelProvider) {
        this.fuelProvider = getOrThrow(
          await this.config.fuelProvider,
          'Fuel provider not found',
        );
      }
  
      return {
        fuelProvider: this.fuelProvider,
      };
    }
  
    public async connect(): Promise<boolean> {
      this.createModal();
      return new Promise((resolve) => {
        this.web3Modal.open();
        const unsub = this.web3Modal.subscribeEvents(async (event) => {
          switch (event.data.event) {
            case 'CONNECT_SUCCESS': {
              resolve(true);
              unsub();
              break;
            }
            case 'MODAL_CLOSE':
            case 'CONNECT_ERROR': {
              resolve(false);
              unsub();
              break;
            }
          }
        });
      });
    }
  
    public async disconnect(): Promise<boolean> {
      this.web3Modal.disconnect();
      this._emitDisconnect();
      return this.isConnected();
    }
  
    private isValidPredicateAddress(
      address: string,
    ): address is SolanaPredicateRoot {
      return address in txIdEncoders;
    }
  
    private async encodeTxId(txId: string): Promise<Uint8Array> {
      if (!this.isValidPredicateAddress(this.predicateAddress)) {
        throw new Error(`Unknown predicate address ${this.predicateAddress}`);
      }
  
      const encoder = txIdEncoders[this.predicateAddress];
      return encoder.encodeTxId(txId);
    }
  
    public async sendTransaction(
      address: string,
      transaction: TransactionRequestLike,
    ): Promise<string> {
      const { predicate, transactionId, transactionRequest } =
        await this.prepareTransaction(address, transaction);
  
      const predicateSignatureIndex = getMockedSignatureIndex(
        transactionRequest.witnesses,
      );
  
      const txId = await this.encodeTxId(transactionId);
      const provider: Maybe<SolanaProvider> =
        this.web3Modal.getWalletProvider() as SolanaProvider;
      if (!provider) {
        throw new Error('No provider found');
      }
  
      const signedMessage: Uint8Array = (await provider.signMessage(
        txId,
      )) as Uint8Array;
      transactionRequest.witnesses[predicateSignatureIndex] = signedMessage;
  
      // Send transaction
      await predicate.provider.estimatePredicates(transactionRequest);
  
      const response = await predicate.sendTransaction(transactionRequest);
  
      return response.id;
    }
  
    async signMessageCustomCurve(message: string) {
      const provider: Maybe<SolanaProvider> =
        this.web3Modal.getWalletProvider() as SolanaProvider;
      if (!provider) {
        throw new Error('No provider found');
      }
      const signedMessage: Uint8Array = (await provider.signMessage(
        toUtf8Bytes(message),
      )) as Uint8Array;
      return {
        curve: 'edDSA',
        signature: hexlify(signedMessage),
      };
    }
  }