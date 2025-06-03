import { Exchange } from "./Exchange";
import { RouteNetwork } from "./Network";

export class RoutesGroup {
    name: string;
    routes: Route[];
}
export type Route = ({ cex: true } & Exchange | { cex?: false } & RouteNetwork)
