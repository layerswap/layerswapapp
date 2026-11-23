import { Exchange } from "./Exchange";
import { Token, NetworkRoute } from "@layerswap/widget-types";

export type NetworkElement = {
    type: 'network';
    route: NetworkRoute;
}
export type NetworkTokenElement = {
    type: 'network_token' | 'suggested_token';
    route: {
        token: Token;
        route: NetworkRoute
    }
}
export type TitleElement = {
    type: 'group_title';
    text: string
}
export type GroupedTokenElement = {
    type: 'grouped_token';
    symbol: string;
    asset: string;
    items: NetworkTokenElement[];
}
export type TokenSceletonElement = {
    type: 'sceleton_token';
}
export type RowElement = {}
    & (NetworkElement
        | NetworkTokenElement
        | TitleElement
        | GroupedTokenElement
        | TokenSceletonElement);
