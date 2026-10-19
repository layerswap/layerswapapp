import type { DepositAction, GaslessAuthorizationResult, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import type { GaslessAuthorization, SwapStepTransactions, SwapTransaction, SwapExecutionKind } from '@/stores/swapTransactionStore';
import type { ResolvedSwapStatus } from './resolveSwapPhase';

export type SwapFlowKind =
    | 'manual-deposit'
    | 'exchange-deposit'
    | 'specialized-wallet'
    | SwapExecutionKind
    | 'unresolved';

export type SwapFlowEvidence =
    | 'deposit-method' | 'source-provider' | 'publish-step' | 'deposit-step'
    | 'frontend-signature' | 'gasless-signature' | 'gasless-authorization'
    | 'atomic-calls' | 'atomic-approval' | 'atomic-transaction' | 'stored-transaction'
    | 'legacy-transfer' | 'missing-actions' | 'ambiguous-signature' | 'ambiguous-publication' | 'unknown-actions';

type DepositExecutionKind = SwapExecutionKind | 'unresolved';

export type ResolveSwapFlowInput = {
    swapData?: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange' | 'source_network' | 'destination_network' | 'source_token'>;
    depositActions?: DepositAction[];
    transaction?: Pick<SwapTransaction, 'kind'>;
    stepTransactions?: SwapStepTransactions;
    quote?: Pick<SwapQuote, 'destination_token'>;
    gaslessAuthorization?: Pick<GaslessAuthorization, 'kind'>
        & Partial<Pick<GaslessAuthorizationResult, 'status' | 'transaction'>>;
    sourceProvider?: string;
    walletExecutionStarted?: boolean;
    isDepositFlow?: boolean;
    hasRefuel?: boolean;
    transactionHash?: string;
    outputTransactionHash?: string;
    resolved?: Pick<ResolvedSwapStatus, 'phase' | 'showWithdrawScreen'>;
};

export type ResolvedSwapFlow = {
    kind: SwapFlowKind;
    evidence: SwapFlowEvidence;
    route: 'same-network' | 'cross-network' | 'unknown';
    sourceProvider?: string;
    walletProgress: 'controls' | 'workflow';
    processingProgress: 'transfers' | 'workflow';
    processingTitle: 'swap' | 'transfer' | 'deposit';
    sharesExecutionTransaction: boolean;
    compactQuote: boolean;
    transferStage: 'withdraw' | 'processing' | undefined;
};

/** Resolve execution from backend evidence, never the next form's gasless toggle
 * or network equality. A sign-only response can precede either a publish action
 * or a paymaster authorization, so it deliberately remains unresolved. */
export function resolveSwapFlow(input: ResolveSwapFlowInput): ResolvedSwapFlow {
    const { swapData, depositActions: actions, stepTransactions, quote } = input;
    const sourceType = swapData?.source_network?.type;
    const sourceProvider = input.sourceProvider
        ?? (sourceType === 'hyperliquid' || sourceType === 'polymarket' ? sourceType : undefined);
    const sourceCannotBatch = (!!sourceType && sourceType !== 'evm')
        || (!!swapData?.source_token?.symbol && !swapData.source_token.contract);
    const hasPublish = !!actions?.some(action => action.step === 'publish');
    let kind: SwapFlowKind;
    let evidence: SwapFlowEvidence;
    if (swapData?.use_deposit_address) {
        kind = swapData.source_exchange ? 'exchange-deposit' : 'manual-deposit';
        evidence = 'deposit-method';
    } else if (sourceProvider) {
        kind = 'specialized-wallet';
        evidence = 'source-provider';
    } else {
        ({ kind, evidence } = resolveDepositExecution(actions, input.gaslessAuthorization));
        const storedKind = input.transaction?.kind;
        if (storedKind && storedKind !== 'transaction' && kind === 'unresolved'
            && (evidence !== 'ambiguous-publication' || storedKind === 'atomic-batch' || storedKind === 'frontend-swap')) {
            kind = storedKind;
            evidence = storedKind === 'atomic-batch' ? 'atomic-transaction' : 'stored-transaction';
        } else if (evidence === 'ambiguous-publication' && sourceCannotBatch) {
            kind = 'frontend-swap';
            evidence = 'publish-step';
        }
    }

    const manual = kind === 'manual-deposit' || kind === 'exchange-deposit';
    const walletSwap = kind === 'frontend-swap' || kind === 'atomic-batch';
    const submittedWalletSwap = walletSwap && !!input.transactionHash;
    const submittedWalletTransfer = !manual && kind !== 'specialized-wallet' && !!input.transactionHash;
    const walletProgress = !manual && kind !== 'specialized-wallet' && (
        submittedWalletTransfer
        || (actions?.filter(action => !!action.step).length ?? 0) > 1
        || (!!stepTransactions?.approve_permit2?.explorerUrl && !!actions?.some(action => action.step === 'approve_permit2'))
        || (!!quote?.destination_token && hasPublish)
    ) ? 'workflow' : 'controls';
    const continuousWorkflow = walletSwap && walletProgress === 'workflow' && !input.isDepositFlow;
    const workflowStarted = continuousWorkflow && (!!input.walletExecutionStarted || submittedWalletSwap);
    const showWithdrawScreen = input.resolved?.showWithdrawScreen ?? true;
    const processingProgress = walletSwap && hasPublish && !input.hasRefuel && !input.isDepositFlow
        && ['input_pending', 'output_pending', 'settling_output', 'completed'].includes(input.resolved?.phase ?? '')
        ? 'workflow' : 'transfers';
    const source = swapData?.source_network?.name;
    const destination = swapData?.destination_network?.name;
    const sameNetwork = !!source && source === destination;
    const sharesExecutionTransaction = !manual && !input.isDepositFlow && sameNetwork
        && (input.outputTransactionHash
            ? input.outputTransactionHash === input.transactionHash
            : walletSwap || kind === 'gasless-deposit');
    const tokenSwap = !manual && !input.isDepositFlow
        && (walletSwap || (kind === 'gasless-deposit' && sameNetwork) || sharesExecutionTransaction);

    return {
        kind, evidence, sourceProvider,
        route: !source || !destination ? 'unknown' : source === destination ? 'same-network' : 'cross-network',
        walletProgress,
        processingProgress,
        processingTitle: input.isDepositFlow ? 'deposit' : tokenSwap ? 'swap' : 'transfer',
        sharesExecutionTransaction,
        compactQuote: !manual && (!showWithdrawScreen || workflowStarted || submittedWalletTransfer),
        transferStage: continuousWorkflow ? undefined : showWithdrawScreen ? 'withdraw' : 'processing',
    };
}

export function resolveDepositExecution(
    actions: DepositAction[] | undefined,
    gaslessAuthorization?: ResolveSwapFlowInput['gaslessAuthorization'],
): { kind: DepositExecutionKind; evidence: SwapFlowEvidence } {
    const hasPublish = !!actions?.some(action => action.step === 'publish');
    const publicationWithoutHistory = actions?.length === 1 && hasPublish
        && !(actions[0].type === 'transfer' && actions[0].status === 'action_required');
    let kind: DepositExecutionKind;
    let evidence: SwapFlowEvidence;
    if (actions?.some(action => action.type === 'send_calls')) {
        kind = 'atomic-batch';
        evidence = 'atomic-calls';
    } else if (actions?.some(action => action.step === 'approve')) {
        kind = 'atomic-batch';
        evidence = 'atomic-approval';
    } else if (publicationWithoutHistory) {
        // Only an actionable transfer has been disambiguated by next_action at the API boundary.
        // A sufficient-allowance batch and a legacy publish can share other placeholders.
        kind = 'unresolved';
        evidence = 'ambiguous-publication';
    } else if (hasPublish) {
        kind = 'frontend-swap';
        evidence = 'publish-step';
    } else if (actions?.some(action => action.step === 'deposit')) {
        kind = 'wallet-transfer';
        evidence = 'deposit-step';
    } else if (actions?.some(action => action.signing_standard === 'permit2_witness' || action.signing_standard === 'eip2612')) {
        kind = 'frontend-swap';
        evidence = 'frontend-signature';
    } else if (actions?.some(action => action.signing_standard === 'permit2')) {
        kind = 'gasless-deposit';
        evidence = 'gasless-signature';
    } else if (actions?.some(action => !action.step && (action.type === 'transfer' || action.type === 'manual_transfer'))) {
        kind = 'wallet-transfer';
        evidence = 'legacy-transfer';
    } else if (gaslessAuthorization?.kind === 'gasless'
        || gaslessAuthorization?.transaction?.transaction_hash
        || gaslessAuthorization?.status === 'published'
        || gaslessAuthorization?.status === 'completed') {
        kind = 'gasless-deposit';
        evidence = 'gasless-authorization';
    } else {
        kind = 'unresolved';
        evidence = !actions?.length ? 'missing-actions'
            : actions.some(action => action.type === 'sign' || action.step === 'sign' || action.step === 'approve_permit2')
                ? 'ambiguous-signature' : 'unknown-actions';
    }
    return { kind, evidence };
}
