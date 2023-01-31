import { SwapType } from "../../lib/layerSwapApiClient";
import { CryptoNetwork } from "../../Models/CryptoNetwork";
import { Currency } from "../../Models/Currency";
import { Exchange } from "../../Models/Exchange";
import { SelectMenuItem } from "../Select/selectMenuItem";


export type SwapFormValues =  {
  amount: string;
  destination_address: string;
  currency?: SelectMenuItem<Currency>;
} & SwapFormProductsData


export type SwapFormProductsData = {
  swapType: SwapType.OffRamp;
  from?: SelectMenuItem<CryptoNetwork>;
  to?: SelectMenuItem<Exchange>;
} | {
  swapType: SwapType.OnRamp;
  from?: SelectMenuItem<Exchange>;
  to?: SelectMenuItem<CryptoNetwork>;
} | {
  swapType: SwapType.CrossChain;
  from?: SelectMenuItem<CryptoNetwork>;
  to?: SelectMenuItem<CryptoNetwork>;
}