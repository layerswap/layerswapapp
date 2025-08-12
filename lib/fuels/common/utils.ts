import {
  Address,
  type BytesLike,
  type JsonAbi,
  Predicate,
  getPredicateRoot,
} from 'fuels';
import type { Hex } from 'viem';
import type { Maybe, PredicateConfig } from './types';

export const getOrThrow = <T>(value: Maybe<T>, message: string): T => {
  if (!value) throw new Error(message);
  return value;
};

export const getFuelPredicateAddresses = ({
  signerAddress,
  predicate: { abi, bin },
}: {
  signerAddress: string;
  predicate: PredicateConfig;
}): Hex => {
  // @ts-expect-error processPredicateData is only available in the Predicate class
  const { predicateBytes } = Predicate.processPredicateData(bin, abi, {
    SIGNER: signerAddress,
  });
  return Address.fromB256(getPredicateRoot(predicateBytes)).toString() as Hex;
};
