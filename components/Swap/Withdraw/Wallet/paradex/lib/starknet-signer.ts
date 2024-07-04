import { keyDerivation } from '@starkware-industries/starkware-crypto-utils';
import type { Signature, SignerInterface, TypedData } from 'starknet';
import * as Starknet from 'starknet';

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

/**
 * Extracts the R segment from a Starknet signature for key derivation.
 *  * ArgentX signatures have 2 segments: [R, S]
 *  * Braavos signatures have 3 segments: [Recovery, R, S]
 */
export function getSeedFromStarknetSignature(
  signature: Starknet.Signature,
): string {
  const segments = Starknet.stark.signatureToHexArray(signature);

  if (segments.length === 2) {
    const [r, _s] = segments;
    if (r == null) throw new Error('Starknet signature is missing R segment');
    return r;
  }

  if (segments.length === 3) {
    const [_recovery, r, _s] = segments;
    if (r == null) throw new Error('Starknet signature is missing R segment');
    return r;
  }

  throw new Error('Invalid Starknet signature');
}