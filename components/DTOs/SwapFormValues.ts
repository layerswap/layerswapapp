import { CryptoNetwork, Token } from "../../Models/Network";
import { Exchange } from "../../Models/Exchange";
import { AssetGroup } from "../Input/CEXCurrencyFormField";

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
  currencyGroup?: AssetGroup
  depositMethod?: string
}