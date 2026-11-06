import type { GasWithToken } from '@layerswap/widget-types';
import type { AmountMode } from '@/lib/amountPresets';
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { Exchange } from "@/Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  amountMode?: AmountMode;
  /** Scope of the user's amount preset; changing the funding account or asset resets it. */
  amountPresetSource?: string;
  amountPresetError?: string;
  amountPresetPending?: boolean;
  /** Balance associated with the preset calculation, including pending/error results. */
  amountPresetBalance?: number;
  /** Fee verified by the same calculation as the preset amount. */
  amountPresetGas?: GasWithToken;
  destination_address?: string;
  //TODO: refactor
  fromAsset?: NetworkRouteToken & { manuallySet?: boolean };
  toAsset?: NetworkRouteToken & { manuallySet?: boolean };
  refuel?: boolean;
  from?: NetworkRoute;
  to?: NetworkRoute;
  fromExchange?: Exchange;
  toExchange?: Exchange;
  depositMethod?: 'wallet' | 'deposit_address',
  validatingSource?: boolean;
  validatingDestination?: boolean;
  /** Additional wallet sources consolidated into the same destination; the primary source stays in `from`/`fromAsset`/`amount`. */
  extraSources?: ConsolidationSource[];
}

export type ConsolidationSource = {
  id: string;
  from: NetworkRoute;
  fromAsset: NetworkRouteToken;
  amount: string;
}


export type SwapDirection = "from" | "to";
