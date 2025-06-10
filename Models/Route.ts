import { Exchange, ExchangeToken } from "./Exchange";
import { NetworkRouteToken, NetworkRoute } from "./Network";

export type NetworkElement = {
    type: 'network';
    route: NetworkRoute;
}
export type NetworkTokenElement = {
    type: 'network_token';
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
export type RowElement = {}
    & (NetworkElement
        | NetworkTokenElement
        | TitleElement
        | GroupedTokenElement)

export type GroupTokensResult = (GroupedTokenElement | NetworkElement | NetworkTokenElement)[];


export type _Route =
    ({
        route_type: 'network';
    } & NetworkRoute)
    | ({
        route_type: 'token';
    } & {
        token: NetworkRouteToken;
        network: NetworkRoute;
    })

export type _RoutesGroup = {
    name: string;
} & (
        {
            type: 'network';
            routes: NetworkRoute[];
        }
        |
        {
            type: 'token'
            routes: {
                token: NetworkRouteToken;
                network: NetworkRoute;
            }[]
        }
    )
