import * as Starknet from 'starknet';

import type { ParadexConfig } from './config';
import * as starknetSigner from './starknet-signer';
import type { Hex } from './types';

export interface Account extends Starknet.Account {}

interface FromEthSignerParams {
  readonly provider: Starknet.ProviderOptions | Starknet.ProviderInterface;
  readonly config: ParadexConfig;
}

interface FromStarknetAccountParams {
  readonly provider: Starknet.ProviderOptions | Starknet.ProviderInterface;
  readonly config: ParadexConfig;
  readonly account: Starknet.AccountInterface;
}

/**
 * Generates a Paradex account from a Starknet signer.
 * @returns The generated Paradex account.
 */
export async function fromStarknetAccount({
  provider,
  config,
  account,
}: FromStarknetAccountParams): Promise<Account> {
  const starknetChainId = config.l2ChainId;
  const starkKeyTypedData =
    starknetSigner.buildStarknetStarkKeyTypedData(starknetChainId);
  const signature = await account.signMessage(starkKeyTypedData);
  const seed = starknetSigner.getSeedFromStarknetSignature(signature);
  const [privateKey, publicKey] =
    await starknetSigner.getStarkKeypairFromStarknetSignature(seed);
  const address = generateAccountAddress({
    publicKey: `0x${publicKey}`,
    accountClassHash: config.paraclearAccountHash,
    accountProxyClassHash: config.paraclearAccountProxyHash,
  });
  return new Starknet.Account(provider, address, `0x${privateKey}`);
}

interface GenerateAccountAddressParams {
  /** The hash of the account contract in hex format */
  readonly accountClassHash: Hex;
  /** The hash of the account proxy contract in hex format */
  readonly accountProxyClassHash: Hex;
  /** The public key of the account in hex format */
  readonly publicKey: Hex;
}

/**
 * Generates an account address based on the account contract and public key.
 */
function generateAccountAddress({
  accountClassHash,
  accountProxyClassHash,
  publicKey,
}: GenerateAccountAddressParams): Hex {
  const callData = Starknet.CallData.compile({
    implementation: accountClassHash,
    selector: Starknet.hash.getSelectorFromName('initialize'),
    calldata: Starknet.CallData.compile({
      signer: publicKey,
      guardian: '0',
    }),
  });

  const address = Starknet.hash.calculateContractAddressFromHash(
    publicKey,
    accountProxyClassHash,
    callData,
    0,
  );

  return address as Hex;
}