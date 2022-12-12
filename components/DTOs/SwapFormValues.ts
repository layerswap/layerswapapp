import { SwapType } from "../../lib/layerSwapApiClient";
import { CryptoNetwork } from "../../Models/CryptoNetwork";
import { Currency } from "../../Models/Currency";
import { Exchange } from "../../Models/Exchange";
import { SelectMenuItem } from "../Select/selectMenuItem";


export interface SwapFormValues {
  swapType: SwapType;
  destination_address: string;
  network?: SelectMenuItem<CryptoNetwork>;
  currency?: SelectMenuItem<Currency>;
  exchange?: SelectMenuItem<Exchange>;
}