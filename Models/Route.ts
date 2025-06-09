import { Exchange, ExchangeToken } from "./Exchange";
import { NetworkRouteToken, NetworkRoute } from "./Network";

export type RouteToken = NetworkRouteToken | ExchangeToken
export type Route = ({ cex: true } & Exchange | { cex?: false } & NetworkRoute)

export type NetworkElement = {
    type: 'network';
    route: NetworkRoute & { cex: false };
}
export type ExchangeElement = {
    type: 'exchange';
    route: Exchange & { cex: true };
}
export type NetworkTokenElement = {
    type: 'network_token';
    route: {
        token: RouteToken;
        route: NetworkRoute & { cex: false };
    }
}
export type ExchangeTokenElement = {
    type: 'exchange_token';
    route: {
        token: RouteToken;
        route: Exchange & { cex: true };
    }
}
export type TitleElement = {
    type: 'group_title';
    text: string
}
export type GroupedTokenElement = {
    type: 'grouped_token';
    symbol: string;
    items: (NetworkTokenElement | ExchangeTokenElement)[];
}
export type RowElement = {}
    & (NetworkElement
        | ExchangeElement
        | NetworkTokenElement
        | ExchangeTokenElement
        | TitleElement
        | GroupedTokenElement)

export type GroupTokensResult = (GroupedTokenElement | NetworkElement | ExchangeElement | NetworkTokenElement | ExchangeTokenElement)[];


export type _Route =
    ({
        route_type: 'network';
    } & NetworkRoute)
    | ({
        route_type: 'exchange';
    } & Exchange)
    | ({
        route_type: 'token';
    } & {
        token: RouteToken;
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
            type: 'exchange';
            routes: Exchange[];
        }
        |
        {
            type: 'token'
            routes: {
                token: RouteToken;
                network: NetworkRoute;
            }[]
        }
    )
