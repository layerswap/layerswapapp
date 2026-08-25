import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";

export function resolveDepositAddress(
    network: { type?: string } | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || depositActions.length === 0) return undefined;
    const transfers = depositActions.filter(action =>
        (action.type === 'transfer' || action.type === 'manual_transfer') && action.to_address
    );
    if (!network) return transfers[0]?.to_address;
    const match = transfers.find(action => action.network?.type === network.type);
    return match?.to_address ?? transfers[0]?.to_address;
}
