import type { AmountInput, AmountMode } from '@/lib/amountPresets';
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { Exchange } from "@/Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  amountInput?: AmountInput;
  amountMode?: AmountMode;
  /** Scope of the user's amount preset; changing the funding account or asset resets it. */
  amountPresetSource?: string;
  amountPresetError?: string;
  amountPresetPending?: boolean;
  /** Balance associated with the preset calculation, including pending/error results. */
  amountPresetBalance?: number;
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
}


export type SwapDirection = "from" | "to";
