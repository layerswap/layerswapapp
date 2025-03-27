import { Exchange, ExchangeToken } from "./Exchange";
import { NetworkRouteToken, NetworkRoute } from "./Network";

export type RouteToken = NetworkRouteToken | ExchangeToken
export type Route = { cex: true } & Exchange | { cex?: false } & NetworkRoute

export class RoutesGroup {
    name: string;
    routes: Route[];
}