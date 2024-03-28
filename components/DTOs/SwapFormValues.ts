import { CryptoNetwork, Token } from "../../Models/Network";
import { Exchange, ExchangeToken } from "../../Models/Exchange";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: Token;
  toCurrency?: Token;
  refuel?: boolean;
  from?: CryptoNetwork;
  to?: CryptoNetwork;
  fromExchange?: Exchange,
  toExchange?: Exchange,
  currencyGroup?: ExchangeToken
  depositMethod?: string
}