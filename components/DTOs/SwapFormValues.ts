import { NetworkCurrency } from "../../Models/CryptoNetwork";
import { Layer } from "../../Models/Layer";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: NetworkCurrency;
  toCurrency?: NetworkCurrency;
  refuel?: boolean;
  from?: Layer;
  to?: Layer;
}
