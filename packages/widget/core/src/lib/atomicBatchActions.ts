import type { BatchTransferDepositAction, DepositAction, NextActionResponse, TransferDepositAction } from './apiClients/layerSwapApiClient'

const isAtomicApproval = (action: DepositAction) => action.step === 'approve'

/** One call is already atomic and can return a transaction hash directly. */
function resolvePublication(action: BatchTransferDepositAction): BatchTransferDepositAction | TransferDepositAction {
    if (action.calls.length !== 1) return action
    const call = action.calls[0]
    if (!call || !/^0x[0-9a-fA-F]{40}$/.test(call.to) || /^0x0{40}$/i.test(call.to)
        || typeof call.data !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(call.data)
        || typeof call.value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(call.value)
        || BigInt(call.value) >= 2n ** 256n) {
        throw new Error('Invalid single-call publication')
    }
    const { calls: _, ...publication } = action
    return { ...publication, type: 'transfer', amount: publication.amount ?? 0, to_address: call.to, call_data: call.data,
        amount_in_base_units: BigInt(call.value).toString() }
}

/** Flat approval/publication items are one atomic operation, never individual transfers. */
export function combineAtomicDepositActions(actions: DepositAction[]): BatchTransferDepositAction {
    const publish = actions[actions.length - 1]
    if (!publish || publish.step !== 'publish' || actions.some((action, index) =>
        action.type !== 'transfer' || action.status !== 'action_required'
        || (index < actions.length - 1 && !isAtomicApproval(action))
        || action.order !== index
        || action.network?.type !== 'evm'
        || action.network.name !== publish.network?.name
        || action.network.chain_id !== publish.network?.chain_id
        || action.from_address && action.from_address.toLowerCase() !== publish.from_address?.toLowerCase()
    )) throw new Error('Invalid atomic approval and swap workflow')
    const expiries = actions.map(action => action.valid_before)
    if (expiries.some(expiry => !Number.isSafeInteger(expiry) || expiry !== publish.valid_before)) throw new Error('Invalid atomic batch expiry')
    const calls = actions.map(action => {
        const value = action.amount_in_base_units
        if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) >= 2n ** 256n) throw new Error('Invalid atomic batch value')
        return { to: action.to_address as string, data: action.call_data as string, value: `0x${BigInt(value).toString(16)}` }
    })
    return { type: 'send_calls', step: 'publish', status: 'action_required', network: publish.network, token: publish.token,
        from_address: publish.from_address, valid_before: publish.valid_before, expires_at: publish.expires_at, calls }
}

export async function resolveAtomicDepositActions(actions: DepositAction[], getNextAction: () => Promise<NextActionResponse>): Promise<DepositAction[]> {
    if (actions.length === 1 && actions[0].type === 'send_calls') {
        return [resolvePublication(actions[0])]
    }
    if (actions.some(isAtomicApproval)) {
        // In-flight and terminal placeholders remain status-only; they cannot open the wallet.
        if (!actions.some(action => action.status === 'action_required')) return actions
        const completedApprovals = actions.filter(isAtomicApproval)
        const publication = actions.filter(action => !isAtomicApproval(action))
        if (completedApprovals.every(action => action.status === 'completed') && publication.length === 1) {
            return resolveAtomicDepositActions(publication, getNextAction)
        }
        return [combineAtomicDepositActions(actions)]
    }
    // A single publication can be either a signed legacy transaction or an allowance-funded
    // batch with sufficient allowance. The server's next_action is the durable discriminator.
    const publish = actions.length === 1 ? actions[0] : undefined
    if (publish?.type !== 'transfer' || publish.step !== 'publish' || publish.status !== 'action_required'
        || publish.network?.type !== 'evm' || !publish.token?.contract) return actions
    const next = await getNextAction()
    if (next.step !== 'publish' || next.status !== 'action_required' || !next.action) throw new Error(next.detail || 'The swap action changed. Refresh the swap before submitting.')
    if (next.action.type === 'transfer') {
        const amountInBaseUnits = next.action.amount_in_base_units ?? publish.amount_in_base_units
        const amount = next.action.amount ?? publish.amount
        if (amount === undefined && amountInBaseUnits === undefined) {
            throw new Error('The publication is missing its transaction value')
        }
        return [{
            ...publish, ...next.action,
            step: 'publish', status: next.status,
            amount: amount ?? 0,
            amount_in_base_units: amountInBaseUnits,
            network: next.action.network ?? publish.network,
            token: next.action.token ?? publish.token,
            ...(next.expires_at ? { expires_at: next.expires_at } : {}),
        }]
    }
    if (next.action.type !== 'send_calls') throw new Error('Invalid atomic swap action')
    return [resolvePublication({ ...next.action, step: 'publish', status: next.status, expires_at: next.expires_at,
        valid_before: next.action.valid_before ?? publish.valid_before,
        network: next.action.network ?? publish.network, token: publish.token, from_address: next.action.from_address ?? publish.from_address })]
}
