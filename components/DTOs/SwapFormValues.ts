import { RouteNetwork, RouteToken } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import { Wallet } from "../../stores/walletStore";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  without_source_wallet?: boolean;
  source_wallet?: Wallet;
  fromCurrency?: RouteToken;
  toCurrency?: RouteToken;
  refuel?: boolean;
  from?: RouteNetwork;
  to?: RouteNetwork;
  fromExchange?: Exchange,
  toExchange?: Exchange,
  currencyGroup?: ExchangeToken
  depositMethod?: string,
}


export type SwapDirection = "from" | "to";