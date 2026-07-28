import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";

export function resolveDepositAddress(
    network: { type?: string } | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || depositActions.length === 0) return undefined;
    if (!network) return depositActions[0].to_address;
    const match = depositActions.find(a => a.network?.type === network.type);
    return match?.to_address ?? depositActions[0].to_address;
}
