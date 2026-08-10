import { type Refuel } from '@layerswap/widget-types';
import { Network, NetworkWithTokens, Token, Metadata } from "@layerswap/utils";

export { Network, NetworkWithTokens, Token, Metadata };

export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[]
}

export class NetworkRouteToken extends Token {
    refuel?: Refuel
}
