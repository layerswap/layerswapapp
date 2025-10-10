import {
  type AbiMap,
  Address,
  type Asset,
  type BytesLike,
  type ConnectorMetadata,
  FuelConnector,
  FuelConnectorEventTypes,
  type HashableMessage,
  type JsonAbi,
  type Network,
  type SelectNetworkArguments,
  type TransactionRequestLike,
  type TransactionResponse,
  type Version,
  ZeroBytes32,
  bn,
  calculateGasFee,
  concat,
  transactionRequestify,
} from 'fuels';

import { PredicateFactory, getMockedSignatureIndex } from './PredicateFactory';
import type { PredicateWalletAdapter } from './PredicateWalletAdapter';
import type {
  ConnectorConfig,
  Maybe,
  MaybeAsync,
  PredicateConfig,
  PredicateVersion,
  PredicateVersionWithMetadata,
  PreparedTransaction,
  ProviderDictionary,
  SignedMessageCustomCurve,
} from './types';

const SELECTED_PREDICATE_KEY = 'fuel_selected_predicate_version';

export abstract class PredicateConnector extends FuelConnector {
  public connected = false;
  public installed = false;
  external = true;
  public events = FuelConnectorEventTypes;
  protected predicateAddress!: string;
  protected customPredicate: Maybe<PredicateConfig>;
  protected predicateAccount: Maybe<PredicateFactory> = null;
  protected subscriptions: Array<() => void> = [];
  protected hasProviderSucceeded = true;
  protected selectedPredicateVersion: Maybe<string> = null;

  private _predicateVersions!: Array<PredicateFactory>;

  public abstract name: string;
  public abstract metadata: ConnectorMetadata;

  public abstract sendTransaction(
    address: string,
    transaction: TransactionRequestLike,
  ): Promise<string | TransactionResponse>;
  public abstract connect(): Promise<boolean>;

  /**
   * Derived classes MUST call `await super.disconnect();` as part of their
   * disconnection logic. They remain responsible for their specific
   * disconnection procedures (e.g., from the underlying wallet),
   * updating `this.connected` status, and emitting events such as
   * `connection`, `currentAccount`, and `accounts`.
   * @returns A promise that resolves to true if the base cleanup is successful.
   */
  public async disconnect(): Promise<boolean> {
    this.selectedPredicateVersion = null;
    this.predicateAccount = null; // Ensure predicate is fully re-setup on next connect

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SELECTED_PREDICATE_KEY);
      }
    } catch (error) {
      console.error(
        'Failed to clear selected predicate version from localStorage during disconnect:',
        error,
      );
    }
    return true;
  }

  protected abstract configProviders(config: ConnectorConfig): MaybeAsync<void>;
  protected abstract getWalletAdapter(): PredicateWalletAdapter;
  protected abstract getPredicateVersions(): Record<string, PredicateVersion>;
  protected abstract getAccountAddress(): MaybeAsync<Maybe<string>>;
  protected abstract getProviders(): Promise<ProviderDictionary>;
  protected abstract requireConnection(): MaybeAsync<void>;
  protected abstract walletAccounts(): Promise<Array<string>>;
  abstract signMessageCustomCurve(
    _message: string,
  ): Promise<SignedMessageCustomCurve>;

  constructor() {
    super();

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedVersion = window.localStorage.getItem(
          SELECTED_PREDICATE_KEY,
        );
        if (savedVersion) {
          this.selectedPredicateVersion = savedVersion;
        }
      }
    } catch (error) {
      console.error('Failed to load saved predicate version:', error);
    }
  }

  protected async emitAccountChange(
    address: string,
    connected = true,
  ): Promise<void> {
    await this.setupPredicate();
    this.emit(this.events.connection, connected);
    this.emit(
      this.events.currentAccount,
      this.predicateAccount?.getPredicateAddress(address),
    );
    this.emit(
      this.events.accounts,
      this.predicateAccount?.getPredicateAddresses(await this.walletAccounts()),
    );
  }

  protected get predicateVersions(): Array<PredicateFactory> {
    if (!this._predicateVersions) {
      this._predicateVersions = Object.entries(this.getPredicateVersions())
        .map(
          ([key, pred]) =>
            new PredicateFactory(
              this.getWalletAdapter(),
              pred.predicate,
              key,
              pred.generatedAt,
            ),
        )
        .sort((a, b) => a.sort(b));
    }

    return this._predicateVersions;
  }

  public getAvailablePredicateVersions(): Array<{
    id: string;
    generatedAt: number;
  }> {
    return this.predicateVersions.map((factory) => ({
      id: factory.getRoot(),
      generatedAt: factory.getGeneratedAt(),
    }));
  }

  /**
   * Get all predicate versions including metadata
   * @returns Promise that resolves to the array of predicate versions with complete metadata
   */
  public async getAllPredicateVersionsWithMetadata(): Promise<
    PredicateVersionWithMetadata[]
  > {
    const walletAccount = await this.getAccountAddress();

    const result: PredicateVersionWithMetadata[] = this.predicateVersions.map(
      (factory, index) => {
        const metadata: PredicateVersionWithMetadata = {
          id: factory.getRoot(),
          generatedAt: factory.getGeneratedAt(),
          isActive: false,
          isSelected: factory.getRoot() === this.selectedPredicateVersion,
          isNewest: index === 0,
        };

        if (walletAccount) {
          metadata.accountAddress = factory.getPredicateAddress(walletAccount);
        }

        return metadata;
      },
    );

    try {
      // Check which versions have balances
      const balancePromises = this.predicateVersions.map(async (factory) => {
        try {
          const address = await this.getAccountAddress();
          if (!address) return { hasBalance: false };

          const { fuelProvider } = await this.getProviders();
          const predicate = factory.build(address, fuelProvider, [1]);
          const balanceResult = await predicate.getBalances();

          if (balanceResult.balances && balanceResult.balances.length > 0) {
            const firstBalance = balanceResult.balances[0];
            if (firstBalance) {
              return {
                hasBalance: true,
                balance: firstBalance.amount.format(),
                assetId: firstBalance.assetId,
              };
            }
          }

          return { hasBalance: false };
        } catch (_error) {
          return { hasBalance: false };
        }
      });

      // Wait for all balance checks to complete
      const balanceResults = await Promise.all(balancePromises);

      balanceResults.forEach((balanceInfo, index) => {
        if (index < result.length) {
          // Use a local variable to satisfy TypeScript
          const item = result[index];
          if (item) {
            item.isActive = balanceInfo.hasBalance;
            if (balanceInfo.hasBalance) {
              item.balance = balanceInfo.balance;
              item.assetId = balanceInfo.assetId;
            }
          }
        }
      });
    } catch (error) {
      // If balance checks fail, we still return the result with isActive as false
      console.error('Failed to check predicate balances:', error);
    }

    return result;
  }

  public setSelectedPredicateVersion(versionId: string): void {
    const versionExists = this.predicateVersions.some(
      (factory) => factory.getRoot() === versionId,
    );

    if (versionExists) {
      this.selectedPredicateVersion = versionId;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(SELECTED_PREDICATE_KEY, versionId);
        }
      } catch (error) {
        console.error(
          'Failed to save predicate version to localStorage:',
          error,
        );
      }
    } else {
      throw new Error(`Predicate version ${versionId} not found`);
    }
  }

  public getSelectedPredicateVersion(): Maybe<string> {
    return this.selectedPredicateVersion;
  }

  public async getSmartDefaultPredicateVersion(): Promise<Maybe<string>> {
    try {
      const predicateWithBalance = await this.getCurrentUserPredicate();
      if (predicateWithBalance) {
        return predicateWithBalance.getRoot();
      }

      const newestPredicate = this.getNewestPredicate();
      return newestPredicate?.getRoot() || null;
    } catch (error) {
      console.error(
        'Error determining smart default predicate version:',
        error,
      );
      const newestPredicate = this.getNewestPredicate();
      return newestPredicate?.getRoot() || null;
    }
  }

  public async switchPredicateVersion(versionId: string): Promise<void> {
    this.setSelectedPredicateVersion(versionId);
    await this.setupPredicate();
    const address = await this.getAccountAddress();
    if (!address) {
      throw new Error(
        'No account address found after switching predicate version',
      );
    }
    await this.emitAccountChange(address, true);
  }

  protected isAddressPredicate(b: BytesLike, walletAccount: string): boolean {
    return this.predicateVersions.some(
      (predicate) => predicate.getPredicateAddress(walletAccount) === b,
    );
  }

  protected async getCurrentUserPredicate(): Promise<Maybe<PredicateFactory>> {
    const oldFirstPredicateVersions = [...this.predicateVersions].reverse();
    for (const predicateInstance of oldFirstPredicateVersions) {
      const address = await this.getAccountAddress();
      if (!address) {
        continue;
      }

      const { fuelProvider } = await this.getProviders();
      const predicate = predicateInstance.build(address, fuelProvider, [1]);

      const { balances } = await predicate.getBalances();
      if (balances?.length > 0) {
        return predicateInstance;
      }
    }

    return null;
  }

  protected getNewestPredicate(): Maybe<PredicateFactory> {
    return this.predicateVersions[0];
  }

  protected getPredicateByVersion(versionId: string): Maybe<PredicateFactory> {
    return (
      this.predicateVersions.find(
        (factory) => factory.getRoot() === versionId,
      ) || null
    );
  }

  protected async setupPredicate(): Promise<PredicateFactory> {
    if (this.customPredicate?.abi && this.customPredicate?.bin) {
      this.predicateAccount = new PredicateFactory(
        this.getWalletAdapter(),
        this.customPredicate,
        'custom',
      );
      this.predicateAddress = 'custom';

      return this.predicateAccount;
    }

    if (this.selectedPredicateVersion) {
      const selectedPredicate = this.getPredicateByVersion(
        this.selectedPredicateVersion,
      );
      if (selectedPredicate) {
        this.predicateAddress = selectedPredicate.getRoot();
        this.predicateAccount = selectedPredicate;
        return this.predicateAccount;
      }
    }

    const predicate =
      (await this.getCurrentUserPredicate()) ?? this.getNewestPredicate();
    if (!predicate) throw new Error('No predicate found');

    this.predicateAddress = predicate.getRoot();
    this.predicateAccount = predicate;

    this.selectedPredicateVersion = predicate.getRoot();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          SELECTED_PREDICATE_KEY,
          predicate.getRoot(),
        );
      }
    } catch (error) {
      console.error(
        'Failed to save auto-selected predicate version to localStorage:',
        error,
      );
    }

    return this.predicateAccount;
  }

  protected subscribe(listener: () => void) {
    this.subscriptions.push(listener);
  }

  protected async prepareTransaction(
    address: string,
    transaction: TransactionRequestLike,
  ): Promise<PreparedTransaction> {
    if (!(await this.isConnected())) {
      throw Error('No connected accounts');
    }

    if (!this.predicateAccount) {
      throw Error('No predicate account found');
    }

    const b256Address = Address.fromDynamicInput(address).toString();
    const { fuelProvider } = await this.getProviders();
    const chainId = await fuelProvider.getChainId();
    const walletAccount = this.predicateAccount.getAccountAddress(
      b256Address,
      await this.walletAccounts(),
    );
    if (!walletAccount) {
      throw Error(`No account found for ${b256Address}`);
    }

    const transactionRequest = transactionRequestify(transaction);
    const transactionFee = transactionRequest.maxFee.toNumber();
    const predicateSignatureIndex = getMockedSignatureIndex(
      transactionRequest.witnesses,
    );

    // Create a predicate and set the witness index to call in predicate`
    const predicate = this.predicateAccount.build(walletAccount, fuelProvider, [
      predicateSignatureIndex,
    ]);
    predicate.connect(fuelProvider);

    // To each input of the request, attach the predicate and its data
    const requestWithPredicateAttached =
      predicate.populateTransactionPredicateData(transactionRequest);

    const maxGasUsed =
      await this.predicateAccount.getMaxPredicateGasUsed(fuelProvider);

    let predictedGasUsedPredicate = bn(0);
    requestWithPredicateAttached.inputs.forEach((input) => {
      if ('predicate' in input && input.predicate) {
        input.witnessIndex = 0;
        predictedGasUsedPredicate = predictedGasUsedPredicate.add(maxGasUsed);
      }
    });

    // Add a placeholder for the predicate signature to count on bytes measurement from start. It will be replaced later
    requestWithPredicateAttached.witnesses[predicateSignatureIndex] = concat([
      ZeroBytes32,
      ZeroBytes32,
    ]);

    const { gasPriceFactor } = await predicate.provider.getGasConfig();
    const { maxFee, gasPrice } = await predicate.provider.estimateTxGasAndFee({
      transactionRequest: requestWithPredicateAttached,
    });

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: predictedGasUsedPredicate,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    const feeWithFat = maxFee.add(predicateSuccessFeeDiff);
    const isNeededFatFee = feeWithFat.gt(transactionFee);

    if (isNeededFatFee) {
      // add more 10 just in case sdk fee estimation is not accurate
      requestWithPredicateAttached.maxFee = feeWithFat.add(10);
    }

    // Attach missing inputs (including estimated predicate gas usage) / outputs to the request
    await predicate.provider.estimateTxDependencies(
      requestWithPredicateAttached,
    );

    return {
      predicate,
      request: requestWithPredicateAttached,
      transactionId: requestWithPredicateAttached.getTransactionId(chainId),
      account: walletAccount,
      transactionRequest,
    };
  }

  public clearSubscriptions() {
    if (!this.subscriptions) {
      return;
    }
    this.subscriptions.forEach((listener) => listener());
    this.subscriptions = [];
  }

  public async ping(): Promise<boolean> {
    this.getProviders()
      .catch(() => {
        this.hasProviderSucceeded = false;
      })
      .then(() => {
        this.hasProviderSucceeded = true;
      });
    return this.hasProviderSucceeded;
  }

  public async version(): Promise<Version> {
    return { app: '0.0.0', network: '0.0.0' };
  }

  public async isConnected(): Promise<boolean> {
    await this.requireConnection();
    const accounts = await this.accounts();
    return accounts.length > 0;
  }

  public async accounts(): Promise<Array<string>> {
    if (!this.predicateAccount) {
      return [];
    }

    const accs = await this.walletAccounts();
    return this.predicateAccount.getPredicateAddresses(accs);
  }

  public async currentAccount(): Promise<string | null> {
    if (!(await this.isConnected())) {
      throw Error('No connected accounts');
    }
    if (!this.predicateAccount) {
      throw Error('No predicate account found');
    }

    const account = await this.getAccountAddress();
    return account ? this.predicateAccount.getPredicateAddress(account) : null;
  }

  public async networks(): Promise<Network[]> {
    return [await this.currentNetwork()];
  }

  public async currentNetwork(): Promise<Network> {
    const { fuelProvider } = await this.getProviders();
    const chainId = await fuelProvider.getChainId();

    return { url: fuelProvider.url, chainId: chainId };
  }

  public async signMessage(
    _address: string,
    _message: HashableMessage,
  ): Promise<string> {
    throw new Error('A predicate account cannot sign messages');
  }

  public async addAssets(_assets: Asset[]): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async addAsset(_asset: Asset): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async assets(): Promise<Array<Asset>> {
    return [];
  }

  public async addNetwork(_networkUrl: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async selectNetwork(
    _network: SelectNetworkArguments,
  ): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async addAbi(_abiMap: AbiMap): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public async getAbi(_contractId: string): Promise<JsonAbi> {
    throw Error('Cannot get contractId ABI for a predicate');
  }

  public async hasAbi(_contractId: string): Promise<boolean> {
    throw Error('A predicate account cannot have an ABI');
  }
}
