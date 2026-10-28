import type { BatchTransferDepositAction, DepositAction, SignDepositAction, TransferDepositAction } from "@/lib/apiClients/layerSwapApiClient";

export function resolveDepositAddress(
    network: { type?: string } | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || depositActions.length === 0) return undefined;
    const transfers = depositActions.filter(action =>
        (action.type === 'transfer' || action.type === 'manual_transfer') && action.step !== 'approve' && action.to_address
    );
    if (!network) return transfers[0]?.to_address;
    const match = transfers.find(action => action.network?.type === network.type);
    return match?.to_address ?? transfers[0]?.to_address;
}

export const isSignAction = (action: DepositAction): action is SignDepositAction => action.type === 'sign'
export const isBatchTransferAction = (action: DepositAction): action is BatchTransferDepositAction => action.type === 'send_calls'

export const isTransferAction = (action: DepositAction): action is TransferDepositAction =>
    action.type === 'transfer' || action.type === 'manual_transfer'

export const getCurrentDepositActionIndex = (actions: DepositAction[], includeWaiting = false): number => {
    const current = actions.findIndex(action =>
        action.status === 'action_required' || action.status === 'pending' || action.status === 'failed'
    )
    return current === -1 && includeWaiting ? actions.findIndex(action => action.status === 'waiting') : current
}

export const getActionableDepositAction = (actions: DepositAction[] | undefined): SignDepositAction | TransferDepositAction | BatchTransferDepositAction | undefined => {
    if (!actions?.length) return undefined
    // The allowance rail's flat items must first be grouped at the API boundary.
    if (actions.some(action => action.step === 'approve')) return undefined

    const current = actions.find(action =>
        action.status === 'action_required' && (isSignAction(action) || isTransferAction(action) || isBatchTransferAction(action))
    )
    if (current && (isSignAction(current) || isTransferAction(current) || isBatchTransferAction(current))) return current

    const legacy = actions.find(action =>
        !action.status && (isSignAction(action) || isTransferAction(action))
    )
    return legacy && (isSignAction(legacy) || isTransferAction(legacy)) ? legacy : undefined
}

const DEPOSIT_ACTION_LABELS: Record<string, string> = {
    approve: 'Approve and swap',
    approve_permit2: 'Approve token',
    sign: 'Sign to swap',
    publish: 'Confirm swap',
    deposit: 'Send from wallet',
}

export const getDepositActionLabel = (action: DepositAction): string =>
    isBatchTransferAction(action) ? (action.calls?.length ?? 0) > 1 ? 'Approve and swap' : 'Confirm swap'
        : action.step ? DEPOSIT_ACTION_LABELS[action.step] ?? 'Continue' : 'Continue'

export const getDepositActionDescription = (action: DepositAction): string | undefined => {
    if (isBatchTransferAction(action)) return (action.calls?.length ?? 0) > 1
        ? 'Approve the token and swap in one atomic batch' : 'Submit the swap transaction'
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

export const requiresDepositActionRefresh = (action: DepositAction): boolean =>
    action.step === 'approve_permit2'
    || action.step === 'sign' || isSignAction(action)

// Completed prerequisites do not prove that the deposit was submitted. A later
// response may still reveal a publish action after signing.
export const isDepositWorkflowComplete = (actions: DepositAction[]): boolean =>
    actions.some(action => action.step === 'publish' || action.step === 'deposit')
    && actions.every(action => action.status === 'completed')
