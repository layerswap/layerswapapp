import { Exchange } from "./Exchange";
import { NetworkRouteToken, NetworkRoute } from "./Network";

export type NetworkElement = {
    type: 'network';
    route: NetworkRoute;
}
export type NetworkTokenElement = {
    type: 'network_token' | 'suggested_token';
    route: {
        token: NetworkRouteToken;
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
