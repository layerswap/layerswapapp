import { SwapType } from "../../lib/layerSwapApiClient";
import { CryptoNetwork } from "../../Models/CryptoNetwork";
import { Currency } from "../../Models/Currency";
import { Exchange } from "../../Models/Exchange";
import { Layer } from "../../Models/Layer";
import { SelectMenuItem } from "../Select/selectMenuItem";


export type SwapFormValues =  {
  amount: string;
  destination_address: string;
  currency?: SelectMenuItem<Currency>;
  refuel?: boolean;
  from?: SelectMenuItem<Layer>;
  to?: SelectMenuItem<Layer>;
}
