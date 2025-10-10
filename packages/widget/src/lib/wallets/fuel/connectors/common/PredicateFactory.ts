import { arrayify } from '@ethersproject/bytes';
import {
  type B256Address,
  type BN,
  type BytesLike,
  type InputValue,
  type JsonAbi,
  Predicate,
  type Provider,
  ScriptTransactionRequest,
  ZeroBytes32,
  bn,
} from 'fuels';
import memoize from 'memoizee';
import type { PredicateWalletAdapter } from './PredicateWalletAdapter';
import type { Maybe, PredicateConfig } from './types';
import { getFuelPredicateAddresses } from './utils';

export class PredicateFactory {
  private abi: JsonAbi;
  private bytecode: BytesLike;
  private adapter: PredicateWalletAdapter;
  private root: string;
  private generatedAt: number = Date.now();

  constructor(
    adapter: PredicateWalletAdapter,
    { abi, bin }: PredicateConfig,
    root: string,
    generatedAt: number = Date.now(),
  ) {
    this.adapter = adapter;
    this.abi = abi;
    this.bytecode = bin;
    this.root = root;
    this.generatedAt = generatedAt;
  }

  getRoot = (): string => this.root;

  getGeneratedAt = (): number => this.generatedAt;

  getPredicateAddress = memoize((address: string | B256Address): string => {
    const predicateAddress = getFuelPredicateAddresses({
      signerAddress: this.adapter.convertAddress(address),
      predicate: { abi: this.abi, bin: this.bytecode },
    });
    return predicateAddress;
  });

  build = memoize(
    <T extends InputValue[]>(
      address: string | B256Address,
      provider: Provider,
      data?: T,
    ): Predicate<InputValue[], { [name: string]: unknown }> =>
      new Predicate({
        bytecode: arrayify(this.bytecode),
        abi: this.abi,
        provider,
        configurableConstants: {
          SIGNER: this.adapter.convertAddress(address),
        },
        data,
      }) as Predicate<InputValue[], { [name: string]: unknown }>,
  );

  getAccountAddress = (
    address: string,
    accounts: Array<string> = [],
  ): Maybe<string> =>
    accounts.find(
      (account: string) => this.getPredicateAddress(account) === address,
    );

  getPredicateAddresses = (accounts: Array<string> = []): Array<string> =>
    accounts.map((account) => this.getPredicateAddress(account));

  getMaxPredicateGasUsed = memoize(async (provider: Provider): Promise<BN> => {
    const fakeAccount = this.adapter.generateFakeAccount();
    const chainId = await provider.getChainId();
    const fakePredicate = this.build(fakeAccount.getAddress(), provider, [0]);
    const request = new ScriptTransactionRequest();
    request.addCoinInput({
      id: ZeroBytes32,
      assetId: ZeroBytes32,
      amount: bn(),
      owner: fakePredicate.address,
      blockCreated: bn(),
      txCreatedIdx: bn(),
    });
    fakePredicate.populateTransactionPredicateData(request);
    const txId = request.getTransactionId(chainId);
    //
    const signature = await fakeAccount.signMessage(txId);
    request.witnesses = this.adapter.buildWitnessData(fakeAccount, signature);
    //
    await fakePredicate.provider.estimatePredicates(request);
    const predicateInput = request.inputs[0];
    if (predicateInput && 'predicate' in predicateInput) {
      return bn(predicateInput.predicateGasUsed);
    }

    return bn();
  });

  equals = (predicate: Maybe<PredicateFactory>): boolean =>
    !!predicate && predicate.root === this.root;

  sort = (predicate: PredicateFactory): number =>
    predicate.generatedAt - this.generatedAt;
}

/**
 * Since the predicate resources were fetched and added to the TransactionRequest before the predicate
 * was instantiated, it is very likely that they were fetched and added as normal account resources,
 * resulting in a witness placeholder being added to the witnesses of the TransactionRequest to
 * later be replaced with an actual signature. Since predicate resources do not require a signature,
 * this placeholder witness will be removed when calling `Predicate.populateTransactionPredicateData`.
 * However, we need to validate if this placeholder witness was added here in order to instantiate the
 * predicate with the correct witness index argument.
 */
export const getMockedSignatureIndex = (witnesses: BytesLike[]) => {
  const placeholderWitnessIndex = witnesses.findIndex(
    (item) =>
      item instanceof Uint8Array &&
      item.length === 64 &&
      item.every((value) => value === 0),
  );
  const hasPlaceholderWitness = placeholderWitnessIndex !== -1;
  // if it is a placeholder witness, we can safely replace it, otherwise we will consider a new element.
  return hasPlaceholderWitness ? placeholderWitnessIndex : witnesses.length;
};
