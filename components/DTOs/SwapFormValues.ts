import { RouteNetwork, RouteToken } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  //TODO: refactor
  fromCurrency?: string;
  toCurrency?: string;
  refuel?: boolean;
  from?: string;
  to?: string;
  fromExchange?: string;
  toExchange?: string;
  currencyGroup?: string;
  depositMethod?: 'wallet' | 'deposit_address',
  validatingSource?: boolean;
  validatingDestination?: boolean;
  validatingCurrencyGroup?: boolean;
}


export type SwapDirection = "from" | "to";