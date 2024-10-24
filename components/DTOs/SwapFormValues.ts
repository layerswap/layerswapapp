import { RouteNetwork, RouteToken } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import { Wallet } from "../../stores/walletStore";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: RouteToken;
  toCurrency?: RouteToken;
  refuel?: boolean;
  from?: RouteNetwork;
  to?: RouteNetwork;
  fromExchange?: Exchange,
  toExchange?: Exchange,
  currencyGroup?: ExchangeToken
  depositMethod?: 'wallet' | 'deposit_address',
}


export type SwapDirection = "from" | "to";