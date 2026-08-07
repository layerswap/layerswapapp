import { Refuel } from "../lib/apiClients/layerSwapApiClient";
import { Network, NetworkWithTokens, Token, Metadata, NetworkType } from "@layerswap/utils";

export { Network, NetworkWithTokens, Token, Metadata, NetworkType };

export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[]
}

export class NetworkRouteToken extends Token {
    refuel?: Refuel
}
