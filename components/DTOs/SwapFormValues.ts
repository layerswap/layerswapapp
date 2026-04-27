import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { Exchange } from "@/Models/Exchange";

export type SwapValuesRoute = {
  network: NetworkRoute;
  token: NetworkRouteToken
};

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  source?: SwapValuesRoute;
  destination?: SwapValuesRoute;
  refuel?: boolean;
  fromExchange?: Exchange;
  toExchange?: Exchange;
  depositMethod?: 'wallet' | 'deposit_address',
}

export type SwapDirection = "from" | "to";