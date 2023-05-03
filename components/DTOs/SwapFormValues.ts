import { Currency } from "../../Models/Currency";
import { Layer } from "../../Models/Layer";


export type SwapFormValues =  {
  amount: string;
  destination_address: string;
  currency?: Currency;
  refuel?: boolean;
  from?: Layer;
  to?: Layer;
}
