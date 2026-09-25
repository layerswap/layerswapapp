import type { DepositAction, SignDepositAction, TransferDepositAction } from "@/lib/apiClients/layerSwapApiClient";

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

export const isSignAction = (action: DepositAction): action is SignDepositAction => action.type === 'sign'

export const isTransferAction = (action: DepositAction): action is TransferDepositAction =>
    action.type === 'transfer' || action.type === 'manual_transfer'

export const getActionableDepositAction = (actions: DepositAction[] | undefined): SignDepositAction | TransferDepositAction | undefined => {
    if (!actions?.length) return undefined

    const current = actions.find(action =>
        action.status === 'action_required' && (isSignAction(action) || isTransferAction(action))
    )
    if (current && (isSignAction(current) || isTransferAction(current))) return current

    const legacy = actions.find(action =>
        !action.status && (isSignAction(action) || isTransferAction(action))
    )
    return legacy && (isSignAction(legacy) || isTransferAction(legacy)) ? legacy : undefined
}

const DEPOSIT_ACTION_LABELS: Record<string, string> = {
    approve_permit2: 'Approve token',
    sign: 'Sign to swap',
    publish: 'Confirm swap',
    deposit: 'Send from wallet',
}

export const getDepositActionLabel = (action: DepositAction): string =>
    action.step ? DEPOSIT_ACTION_LABELS[action.step] ?? 'Continue' : 'Continue'

export const getDepositActionDescription = (action: DepositAction): string | undefined => {
    switch (action.step) {
        case 'approve_permit2':
            return action.token?.symbol
                ? `Allow ${action.token.symbol} for this swap`
                : 'Allow the token for this swap'
        case 'sign':
            return 'Confirm the swap authorization'
        case 'publish':
            return 'Submit the swap transaction'
        case 'deposit':
            return 'Send funds to start the swap'
        default:
            return undefined
    }
}

export const requiresDepositActionRefresh = (action: DepositAction, actions: DepositAction[]): boolean =>
    action.step === 'approve_permit2'
    || (action.step === 'sign' && actions.some(candidate => candidate.step === 'publish'))

