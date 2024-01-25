import { NetworkCurrency } from "../../Models/CryptoNetwork";
import { Exchange } from "../../Models/Exchange";
import { Layer } from "../../Models/Layer";
import { AssetGroup } from "../Input/CEXCurrencyFormField";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: NetworkCurrency;
  toCurrency?: NetworkCurrency;
  refuel?: boolean;
  from?: Layer;
  to?: Layer;
  fromExchange?: Exchange,
  toExchange?: Exchange,
  currencyGroup?: AssetGroup
}
