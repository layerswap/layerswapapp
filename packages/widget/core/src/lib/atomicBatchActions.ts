import type { BatchTransferDepositAction, DepositAction, TransferDepositAction } from './apiClients/layerSwapApiClient'

const isDirectApproval = (action: DepositAction) => action.step === 'approve'

function isValidPublicationCall(to: unknown, data: unknown): boolean {
    return typeof to === 'string' && /^0x[0-9a-fA-F]{40}$/.test(to) && !/^0x0{40}$/i.test(to)
        && typeof data === 'string' && /^0x(?:[0-9a-fA-F]{2})+$/.test(data)
}

/** One call is already atomic and can return a transaction hash directly. */
function resolvePublication(action: BatchTransferDepositAction): BatchTransferDepositAction | TransferDepositAction {
    if (action.calls.length !== 1) return action
    const call = action.calls[0]
    if (!call || !isValidPublicationCall(call.to, call.data)
        || typeof call.value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(call.value)
        || BigInt(call.value) >= 2n ** 256n) {
        throw new Error('Invalid single-call publication')
    }
    const { calls: _, ...publication } = action
    return { ...publication, type: 'transfer', amount: publication.amount ?? 0, to_address: call.to, call_data: call.data,
        amount_in_base_units: BigInt(call.value).toString() }
}

/** Combine only a complete, simultaneously actionable approval/publication plan. */
export function combineAtomicDepositActions(actions: DepositAction[]): BatchTransferDepositAction {
    const publish = actions[actions.length - 1]
    if (!publish || publish.step !== 'publish' || actions.some((action, index) =>
        action.type !== 'transfer' || action.status !== 'action_required'
        || (index < actions.length - 1 && !isDirectApproval(action))
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

/** Normalize the complete backend response without a second action or allowance lookup. */
export function resolveAtomicDepositActions(actions: DepositAction[]): DepositAction[] {
    for (const action of actions) {
        // Publication must invoke the swap contract, including after signing or approval.
        // Native deposits can omit calldata; an actionable ERC-20 publication cannot.
        if (action.type === 'transfer' && action.step === 'publish' && action.status === 'action_required'
            && action.network?.type === 'evm' && action.token?.contract
            && !isValidPublicationCall(action.to_address, action.call_data)) {
            throw new Error('Invalid publication target or calldata')
        }
    }
    if (actions.length === 1 && actions[0].type === 'send_calls') {
        return [resolvePublication(actions[0])]
    }
    if (actions.some(isDirectApproval)) {
        // In-flight and terminal placeholders remain status-only; they cannot open the wallet.
        if (!actions.some(action => action.status === 'action_required')) return actions
        const completedApprovals = actions.filter(isDirectApproval)
        const publication = actions.filter(action => !isDirectApproval(action))
        if (completedApprovals.every(action => action.status === 'completed') && publication.length === 1) {
            // Keep approval history so reloads and retries resume at publication.
            return actions.flatMap(action => {
                if (isDirectApproval(action)) return [action]
                return resolveAtomicDepositActions([action])
            })
        }
        const actionable = actions.filter(action => action.status === 'action_required')
        const sequentialApproval = actionable.length === 1
            && actionable[0].type === 'transfer' && isDirectApproval(actionable[0])
            && actions.every(action => (isDirectApproval(action) || action.step === 'publish')
                && ['action_required', 'pending', 'waiting', 'completed'].includes(action.status ?? ''))
        // Direct approval is a prerequisite: publication has no executable call yet.
        // Never split an all-actionable atomic plan into individual transactions.
        if (sequentialApproval) return actions
        return [combineAtomicDepositActions(actions)]
    }
    // A single publication is already executable, including with sufficient allowance.
    // EVM execution requires a display amount. ERC-20 publications currently send zero native value.
    const publish = actions.length === 1 ? actions[0] : undefined
    if (publish?.type !== 'transfer' || publish.step !== 'publish' || publish.status !== 'action_required'
        || publish.network?.type !== 'evm' || !publish.token?.contract) return actions
    if (publish.amount === undefined && publish.amount_in_base_units === undefined) {
        throw new Error('The publication is missing its transaction value')
    }
    return [{ ...publish, amount: publish.amount ?? 0 }]
}
