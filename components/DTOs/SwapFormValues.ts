import { Currency } from "../../Models/Currency";
import { Layer } from "../../Models/Layer";


export type SwapFormValues = {
  amount?: string | null;
  destination_address?: string | null;
  currency?: Currency | null;
  refuel?: boolean | null | null;
  from?: Layer | null;
  to?: Layer | null;
}
