import BigNumber from 'bignumber.js';
import * as Starknet from 'starknet-old';

import type { Account } from './account';
import type { ParadexConfig } from './config';
import type { ParaclearProvider } from './paraclear-provider';
import type { Hex } from './types';

const MAX_FEE = BigNumber('5e17'); // 5e17 WEI = 0.5 ETH

interface GetBalanceParams {
  readonly config: ParadexConfig;
  readonly provider: Pick<ParaclearProvider, 'callContract'>;
  /**
   * Account to get the balance for.
   */
  readonly account: Pick<Account, 'address'>;
  /**
   * Token symbol.
   * @example 'USDC'
   */
  readonly token: string;
}

interface GetBalanceResult {
  /**
   * Token balance as a decimal string.
   * @example '100.45'
   * @example '45.2'
   */
  readonly size: string;
}

/**
 * Get the Paraclear balance of the given token for the given account.
 */
export async function getTokenBalance(
  params: GetBalanceParams,
): Promise<GetBalanceResult> {
  const token = params.config.bridgedTokens[params.token];

  if (token == null) {
    throw new Error(`Token ${params.token} is not supported`);
  }

  const result = await params.provider.callContract(
    {
      contractAddress: params.config.paraclearAddress,
      entrypoint: 'getTokenAssetBalance',
      calldata: Starknet.CallData.compile([
        params.account.address,
        token.l2TokenAddress,
      ]),
    },
    'latest',
  );

  const value = result?.[0];

  if (value == null) {
    throw new Error('Failed to get token balance');
  }

  const valueBn = new BigNumber(value);
  if (valueBn.isNaN()) {
    throw new Error('Failed to parse token balance');
  }

  const chainSizeBn = valueBn;

  const sizeBn = fromChainSize(chainSizeBn, params.config.paraclearDecimals);

  return { size: sizeBn.toString() };
}

interface GetSocializedLossFactorParams {
  readonly config: ParadexConfig;
  readonly provider: Pick<ParaclearProvider, 'callContract'>;
}

interface GetSocializedLossFactorResult {
  readonly socializedLossFactor: string;
}

/**
 * Socialized losses happen when Paradex Insurance Fund is bankrupt
 * due to large amounts of unprofitable liquidations. When socialized
 * losses are active, (socialized loss factor > 0), the amount that
 * the user will receive when withdrawing will be smaller than the
 * requested amount.
 */
export async function getSocializedLossFactor(
  params: GetSocializedLossFactorParams,
): Promise<GetSocializedLossFactorResult> {
  const result = await params.provider.callContract({
    contractAddress: params.config.paraclearAddress,
    entrypoint: 'getSocializedLossFactor',
  });

  const value = result?.[0];

  if (value == null) {
    throw new Error('Failed to get socialized loss factor');
  }

  const valueBn = new BigNumber(value);
  if (valueBn.isNaN()) {
    throw new Error('Failed to parse socialized loss factor');
  }

  const chainFactorBn = valueBn;

  const factorBn = fromChainSize(
    chainFactorBn,
    params.config.paraclearDecimals,
  );

  return { socializedLossFactor: factorBn.toString() };
}

interface GetReceivableAmountParams {
  readonly config: ParadexConfig;
  readonly provider: Pick<ParaclearProvider, 'callContract'>;
  /**
   * Token symbol.
   * @example 'USDC'
   */
  readonly token: string;
  /**
   * Amount of to withdraw from Paradex, as a decimal string.
   * The receivable amount will be calculated based on this amount and
   * can be less than the requested amount if socialized loss is active.
   */
  readonly amount: string;
}

interface GetReceivableAmountResult {
  /**
   * Amount that will be received from Paradex, after socialized loss,
   * if applicable, after a withdrawal of the given amount parameter.
   * Decimal string.
   * @example '99.45'
   */
  readonly receivableAmount: string;
  /**
   * The receivable amount, converted to be used in chain calls,
   * using the Paraclear decimals.
   * @example '9945000000'
   */
  readonly receivableAmountChain: string;
  /**
   * Socialized loss factor used to calculate the receivable amount.
   * Decimal string.
   * @example '0.05'
   */
  readonly socializedLossFactor: string;
}

/**
 * The receivable amount is calculated based on the current
 * socialized loss factor: amount * (1 - socializedLossFactor)
 *
 * If the socialized loss factor is 0, the receivable amount
 * will be equal to the requested amount.
 */
export async function getReceivableAmount(
  params: GetReceivableAmountParams,
): Promise<GetReceivableAmountResult> {
  const amountBn = new BigNumber(params.amount);

  if (amountBn.isNaN()) {
    throw new Error('Invalid amount');
  }

  const token = params.config.bridgedTokens[params.token];

  if (token == null) {
    throw new Error(`Token ${params.token} is not supported`);
  }

  const { socializedLossFactor } = await getSocializedLossFactor({
    config: params.config,
    provider: params.provider,
  });

  const receivableAmount = amountBn.times(
    BigNumber(1).minus(socializedLossFactor),
  );

  const receivableAmountChainBn = toChainSize(
    receivableAmount.toString(),
    token.decimals,
  );

  return {
    receivableAmount: receivableAmount.toString(),
    receivableAmountChain: receivableAmountChainBn.toString(),
    socializedLossFactor,
  };
}

interface WithdrawParams {
  readonly config: ParadexConfig;
  /**
   * Account to withdraw from.
   */
  readonly account: Account;
  /**
   * Token symbol.
   * @example 'USDC'
   */
  readonly token: string;
  /**
   * Amount to withdraw from Paradex.
   * Note that this amount can be less than the amount that will be
   * received if socialized loss is active. Use {@link getReceivableAmount}
   * to calculate the amount that will be received.
   * Decimal string.
   * @example '100.45'
   * @example '45.2'
   */
  readonly amount: string;
  /**
   * Call to transfer funds to the bridge. This transaction will be called
   * as the second transaction of the withdrawal transactions batch.
   *
   * The bridge call must be made with the receivable amount calculated
   * using {@link getReceivableAmount}.
   */
  readonly bridgeCall: Starknet.Call | readonly Starknet.Call[];
}

interface TransactionResult {
  readonly hash: Hex;
}

/**
 * Withdraw funds from Paraclear for the given account.
 *
 * Automatically make a batch transaction with `initiate_withdrawal`
 * call to the Paraclear contract along with the transaction passed
 * as `params.bridgeCall` The batch call is atomic. If either of
 * the transactions fail, the entire batch gets reverted.
 *
 * If socialized loss is active, the bridge call must be constructed
 * with an amount that accounts for the loss. To calculate that amount,
 * use {@link getReceivableAmount}. Failing to do so can result in a
 * failed withdrawal.
 */
export async function withdraw(
  params: WithdrawParams,
): Promise<TransactionResult> {
  const token = params.config.bridgedTokens[params.token];

  if (token == null) {
    throw new Error(`Token ${params.token} is not supported`);
  }

  const chainAmountBn = toChainSize(
    params.amount,
    params.config.paraclearDecimals,
  );

  // ensure unique txn hash on subsequent calls via `intNoise`
  const maxFee = MAX_FEE.plus(intNoise(10_000));

  const result = await params.account.execute(
    [
      {
        contractAddress: params.config.paraclearAddress,
        entrypoint: 'withdraw',
        calldata: [token.l2TokenAddress, chainAmountBn.toString()],
      },
      ...(Array.isArray(params.bridgeCall)
        ? params.bridgeCall
        : [params.bridgeCall]),
    ],
    { maxFee: maxFee.toString() },
  );

  return { hash: result.transaction_hash as Hex };
}

function fromChainSize(size: BigNumber, decimals: number): BigNumber {
  return new BigNumber(size).div(10 ** decimals);
}

function toChainSize(size: string, decimals: number): BigNumber {
  return new BigNumber(size)
    .times(10 ** decimals)
    .integerValue(BigNumber.ROUND_FLOOR);
}

/**
 * Generates a pseudorandom integer between 0 and `max`.
 * @param max Maximum value for the noise.
 */
function intNoise(max: number): number {
  return Math.round(Math.random() * max);
}