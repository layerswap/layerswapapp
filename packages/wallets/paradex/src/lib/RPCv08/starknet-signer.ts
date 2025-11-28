import { keyDerivation } from '@starkware-industries/starkware-crypto-utils';
import type { Signature, SignerInterface, TypedData } from 'starknet';
import * as Starknet from 'starknet';

import { STARKNET_MAINNET_CHAIN_ID } from '../constants';
import { AccountSupport } from './starknet-account-support';

export type { SignerInterface as Signer, TypedData, Signature };

export function buildStarknetStarkKeyTypedData(
  starknetChainId: string,
): TypedData {
  return {
    domain: {
      name: 'Paradex',
      chainId: starknetChainId,
      version: '1',
    },
    primaryType: 'Constant',
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'version', type: 'felt' },
        { name: 'chainId', type: 'felt' },
      ],
      Constant: [{ name: 'action', type: 'felt' }],
    },
    message: {
      action: 'STARK Key',
    },
  };
}

type StarknetKeypair = [string, string];

/**
 * This function borrows from starkware-crypto-utils's implementation
 * of `getPrivateKeyFromEthSignature()` where a deterministic
 * signature R segment, is hex encoded as the `keySeed` for
 * `grindKey()` along the Stark curve.
 */
export async function getStarkKeypairFromStarknetSignature(
  signatureR: string,
): Promise<StarknetKeypair> {
  const curve = keyDerivation.StarkExEc;
  if (curve == null) {
    throw new Error('StarkExEc curve is not defined');
  }
  const r = signatureR.replace(/^0x/u, '');
  const privateKey = keyDerivation.grindKey(r, curve);
  const publicKey = keyDerivation.privateToStarkKey(privateKey);
  return [privateKey, publicKey];
}

export async function getAccountSupport(
  account: Starknet.AccountInterface,
  starknetProvider: Starknet.ProviderInterface,
): Promise<AccountSupport> {
  const classHash = await getAccountClassHash(
    starknetProvider,
    account.address,
  );

  const contract = await buildAccountContract(
    starknetProvider,
    account.address,
  );

  const accountSupport = new AccountSupport(contract, classHash);

  try {
    const supportCheckResult = await accountSupport.check();

    if (!supportCheckResult.ok) {
      const message =
        supportCheckResult.reason ??
        'Unspecified error checking account support';
      throw new Error(message);
    }
  } catch (cause) {
    const message = 'Error checking account support. Please try again.';
    throw new Error(message);
  }

  return accountSupport;
}

export function getPublicProvider(chainId: string, nodeUrl: string): Starknet.ProviderInterface {
  if (!nodeUrl) throw new Error('No public provider defined');
  const provider = new Starknet.RpcProvider({ nodeUrl });
  return provider;
}

async function getAccountClassHash(
  provider: Starknet.ProviderInterface,
  accountAddress: string,
): Promise<string> {
  try {
    const classHash = await provider.getClassHashAt(accountAddress);
    return classHash;
  } catch (cause) {
    const message =
      'Cannot determine account type. Make sure your' +
      ' account contract is deployed and try again.';
    throw new Error(message);
  }
}

async function buildAccountContract(
  provider: Starknet.ProviderInterface,
  accountAddress: string,
): Promise<Starknet.Contract> {
  const accountClass = await provider.getClassAt(accountAddress);
  const contract = new Starknet.Contract(
    accountClass.abi,
    accountAddress,
    provider,
  );
  return contract;
}