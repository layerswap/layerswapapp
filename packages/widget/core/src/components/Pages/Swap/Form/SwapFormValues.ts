import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { Exchange } from "@/Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  amountMode?: 'manual' | 'max';
  /** Scope of the user's Max choice; changing the funding account or asset resets it. */
  maxAmountSource?: string;
  maxAmountError?: string;
  maxAmountPending?: boolean;
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
