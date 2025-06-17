import { NetworkRoute, NetworkRouteToken } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  //TODO: refactor
  fromAsset?: NetworkRouteToken & { manuallySet?: boolean };
  toAsset?: NetworkRouteToken & { manuallySet?: boolean };
  refuel?: boolean;
  from?: NetworkRoute;
  to?: NetworkRoute;
  fromExchange?: Exchange;
  toExchange?: Exchange;
  currencyGroup?: ExchangeToken & { manuallySet?: boolean };
  depositMethod?: 'wallet' | 'deposit_address',
  validatingSource?: boolean;
  validatingDestination?: boolean;
  validatingCurrencyGroup?: boolean;
}


export type SwapDirection = "from" | "to";