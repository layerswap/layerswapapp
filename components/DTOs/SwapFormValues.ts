import { RouteNetwork, RouteToken } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  //TODO: refactor
  fromCurrency?: RouteToken & { manuallySet?: boolean };
  toCurrency?: RouteToken & { manuallySet?: boolean };
  refuel?: boolean;
  from?: RouteNetwork;
  to?: RouteNetwork;
  fromExchange?: Exchange;
  toExchange?: Exchange;
  currencyGroup?: ExchangeToken & { manuallySet?: boolean };
  depositMethod?: 'wallet' | 'deposit_address',
  validatingSource?: boolean;
  validatingDestination?: boolean;
}


export type SwapDirection = "from" | "to";