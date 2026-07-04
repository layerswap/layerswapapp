import { NetworkRoute } from "@/Models/Network";
import { RealRouteRef } from "./types";

export function realRoutePresent(routes: NetworkRoute[], real: RealRouteRef, depositMethod: string): boolean {
    return routes.some(r =>
        r.name === real.networkName
        && r.deposit_methods?.includes(depositMethod)
        && r.tokens?.some(t => t.symbol === real.tokenSymbol && t.status === 'active'))
}

export function realDepositAddressRoutePresent(routes: NetworkRoute[], real: RealRouteRef): boolean {
    return realRoutePresent(routes, real, 'deposit_address')
}
