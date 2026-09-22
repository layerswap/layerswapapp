import { WidgetFooterView } from '@/components/Widget/Footer';
import { CopyButtonView } from '@layerswap/ui-kit/components';
import { ConfirmationContent } from '@/components/Modal/ConfirmationContent';
import { DetailedEstimatesView } from '../../Form/FeeDetails/SwapQuote/DetailedEstimatesView';
import { GasFeeView } from '../../Form/FeeDetails/SwapQuote/GasFeeView';
import { SlippageView } from '../../Form/FeeDetails/SlippageView';
import { QuoteAvailabilityView } from './QuoteAvailabilityView';
import { ManualSourceSelectorView } from './ManualSourceSelectorView';
import { DepositQRCodeView } from './DepositQRCodeView';
import { ManualDepositButtonView } from './ManualDepositButtonView';
import {
    WithdrawContentView,
    WalletSubmissionView,
    WalletTransferView,
    ProcessingSectionView,
    PendingSwapView,
} from './Page2Sections';
import { Page2PreviewFrame, type Page2PreviewMode } from './Page2PreviewFrame';
import { ElapsedTime } from '@/components/Common/ElapsedTime';
import { SwapDetailsSceleton } from '@/components/Common/Sceletons';
import {
    resolveSwapPhase,
    SwapPhase,
} from '@/components/utils/resolveSwapPhase';
import { shouldShowCompactSwapQuote } from '@/helpers/swapFlow';
import { gaslessFailureMessage } from '@/helpers/gaslessFailureMessage';
import {
    TransactionStatus,
    TransactionType,
} from '@/lib/apiClients/layerSwapApiClient';
import { resolvePriceImpactValues } from '@/lib/fees';
import { ReadOnlyPreview } from './ReadOnlyPreview';
import { ActionMessages } from '../messages/TransactionMessages';
import { ActionMessageView } from './ActionMessageView';
import {
    AdjustAmountButtonView,
    RefreshBalanceButtonView,
} from './BalanceButtonsView';
import { BalanceWarningView, GasWarningView } from './BalanceWarningView';
import { FailedView } from './FailedView';
import { ManualInstructionsView } from './ManualInstructionsView';
import { ManualQuoteView } from './ManualQuoteView';
import { NotFoundView } from './NotFoundView';
import type { Page2LoadedSnapshot, Page2Snapshot } from './Page2Snapshot';
import { ProcessingView } from './ProcessingView';
import { QuoteDetailsSummary } from './QuoteDetailsSummary';
import { QuoteSummaryView } from './QuoteSummaryView';
import { QuoteUpdated } from './QuoteUpdatedView';
import { QuoteView } from './QuoteView';
import { RPCUnhealthyView } from './RPCUnhealthyView';
import { RetryView } from './RetryView';
import { WalletActionTransition } from './WalletActionTransition';
import { SpecializedWithdrawalView } from './SpecializedWithdrawalView';
import SummaryView from './SummaryView';
import {
    ChangeNetworkView,
    ConnectWalletView,
    SendTransactionView,
} from './WalletActionsView';

/** Maps synthetic state to the same presenters used by the live controllers. */
export function Page2Preview({
    snapshot,
    now,
    mode = 'component',
    onQuoteExpandedChange,
}: {
    mode?: Page2PreviewMode;
    snapshot: Page2Snapshot;
    now: number;
    onQuoteExpandedChange?: (expanded: boolean) => void;
}) {
    return (
        <ReadOnlyPreview
            mode={mode}
            allowQuoteDisclosure={!!onQuoteExpandedChange}
        >
            <Page2PreviewFrame
                mode={mode}
                wallets={
                    snapshot.kind === 'swap'
                        ? snapshot.connectedWallets
                        : undefined
                }
                confirmation={
                    snapshot.kind === 'swap' && snapshot.quoteUpdate ? (
                        <ConfirmationContent
                            submitText="Continue"
                            dismissText="Cancel"
                        >
                            <QuoteUpdated
                                {...snapshot.quoteUpdate}
                                network={
                                    snapshot.swap.source_network.display_name
                                }
                                token={snapshot.swap.source_token.asset}
                            />
                        </ConfirmationContent>
                    ) : undefined
                }
            >
                {snapshot.kind === 'loading' ? (
                    <PendingSwapView contained={mode === 'modal'}>
                        <SwapDetailsSceleton />
                    </PendingSwapView>
                ) : snapshot.kind === 'not-found' ? (
                    <PendingSwapView contained={mode === 'modal'}>
                        <NotFoundView />
                    </PendingSwapView>
                ) : (
                    <LoadedPreview
                        snapshot={snapshot}
                        now={now}
                        onQuoteExpandedChange={onQuoteExpandedChange}
                    />
                )}
            </Page2PreviewFrame>
        </ReadOnlyPreview>
    );
}

function LoadedPreview({
    snapshot: s,
    now,
    onQuoteExpandedChange,
}: {
    snapshot: Page2LoadedSnapshot;
    now: number;
    onQuoteExpandedChange?: (expanded: boolean) => void;
}) {
    const input = s.details.transactions.find(
        (t) => t.type === TransactionType.Input,
    );
    const output = s.details.transactions.find(
        (t) => t.type === TransactionType.Output,
    );
    const gaslessFailed =
        s.gaslessAuthorization &&
        ['expired', 'insufficient', 'rejected'].includes(
            s.gaslessAuthorization.status,
        );
    const resolved = resolveSwapPhase({
        swapDetails: s.details,
        refuel: s.refuel,
        storedWalletTransaction: s.storedWalletTransaction,
        inputTxStatusFromApi: s.inputTxStatusFromApi,
        gaslessAuthorizationFailed: gaslessFailed,
        isDepositFlow: s.isDepositFlow,
    });
    const compactQuote = shouldShowCompactSwapQuote({
        swapData: s.swap,
        isGaslessActive: !!s.quoteState.gasless,
    });
    const summary = (
        <SummaryView
            swap={{
                ...s.swap,
                requested_amount: String(
                    input?.amount ?? s.swap.requested_amount,
                ),
            }}
            quote={{ quote: s.quote!, refuel: s.refuel }}
            sourceAccountAddress={s.sourceAddress}
            receiveAmount={output?.amount || s.quote?.receive_amount}
            quoteIsLoading={s.quoteState.status === 'loading'}
            isUsdMode={s.usdMode}
        />
    );
    if (!resolved.showWithdrawScreen) {
        const authTx = s.gaslessAuthorization?.transaction;
        return (
            <ProcessingSectionView>
                <ProcessingView
                    swapBasicData={s.swap}
                    swapDetails={s.details}
                    refuel={s.refuel}
                    resolved={resolved}
                    isDepositFlow={s.isDepositFlow}
                    summary={summary}
                    quoteDetails={
                        compactQuote &&
                        resolved.phase !== SwapPhase.Completed ? (
                            <PreviewQuote
                                snapshot={s}
                                compact
                                onExpandedChange={onQuoteExpandedChange}
                            />
                        ) : null
                    }
                    readOnly
                    transactionHash={
                        input?.transaction_hash ||
                        authTx?.transaction_hash ||
                        s.storedWalletTransaction?.hash
                    }
                    inputConfirmations={
                        input?.confirmations ?? authTx?.confirmations
                    }
                    inputMaxConfirmations={
                        input?.max_confirmations ?? authTx?.max_confirmations
                    }
                    elapsedTime={
                        s.quote?.avg_completion_time ? (
                            <ElapsedTime
                                swapDetails={s.details}
                                elapsedMs={
                                    input?.timestamp
                                        ? Math.max(
                                              0,
                                              now - Date.parse(input.timestamp),
                                          )
                                        : 0
                                }
                            />
                        ) : null
                    }
                    failedPanel={
                        <FailedView
                            status={s.details.status}
                            isDepositFlow={s.isDepositFlow}
                        />
                    }
                />
                {(gaslessFailed ||
                    s.storedWalletTransaction?.status ===
                        TransactionStatus.Failed) && (
                    <RetryView
                        canSwitchToStandard={gaslessFailed}
                        message={
                            gaslessFailed
                                ? gaslessFailureMessage(
                                      s.gaslessAuthorization?.status,
                                  )
                                : undefined
                        }
                    />
                )}
            </ProcessingSectionView>
        );
    }
    if (s.swap.use_deposit_address)
        return (
            <>
                <ManualInstructionsView
                    swapBasicData={s.swap}
                    quote={s.quote}
                    loading={s.manual?.loading}
                    depositAddress={s.manual?.address}
                    sourceSelector={
                        <ManualSourceSelectorView
                            network={
                                s.manual?.selectedNetwork ??
                                s.swap.source_network
                            }
                            withdrawalNetworks={s.manual?.withdrawalNetworks}
                        />
                    }
                    recipient={s.recipient}
                    qr={
                        <DepositQRCodeView
                            depositAddress={s.manual?.address}
                            showQR={s.manual?.qrOpen}
                        />
                    }
                    amountCopy={
                        <CopyButtonView
                            isCopied={s.manual?.amountCopied}
                            iconClassName="text-secondary-text"
                        />
                    }
                    addressCopy={
                        <CopyButtonView
                            isCopied={s.manual?.addressCopied}
                            className="flex"
                        />
                    }
                    quoteDetails={
                        <PreviewQuote
                            snapshot={s}
                            onExpandedChange={onQuoteExpandedChange}
                        />
                    }
                />
                <WidgetFooterView sticky={false}>
                    <ManualDepositButtonView copied={s.manual?.addressCopied} />
                </WidgetFooterView>
            </>
        );
    return (
        <>
            <WithdrawContentView
                summary={summary}
                quote={
                    <PreviewQuote
                        snapshot={s}
                        compact={!!s.swapId && compactQuote}
                        onExpandedChange={onQuoteExpandedChange}
                    />
                }
            />
            <WidgetFooterView sticky={false}>
                <WalletActionTransition
                    actionKey={
                        s.balanceWarning?.kind === 'balance'
                            ? 'insufficient'
                            : s.balanceWarning?.kind === 'gas'
                              ? 'outOfGas'
                              : 'transfer'
                    }
                >
                    <WalletTransferView>
                        <PreviewWallet snapshot={s} />
                    </WalletTransferView>
                </WalletActionTransition>
            </WidgetFooterView>
        </>
    );
}

function PreviewQuote({
    snapshot: s,
    onExpandedChange,
    compact,
}: {
    snapshot: Page2LoadedSnapshot;
    onExpandedChange?: (expanded: boolean) => void;
    compact?: boolean;
}) {
    if (
        !s.swap.use_deposit_address &&
        (s.quoteState.status === 'error' || !s.quote)
    )
        return (
            <QuoteAvailabilityView
                error={s.quoteState.status === 'error'}
                available={!!s.quote}
            />
        );
    const values = {
        amount: s.swap.requested_amount,
        from: s.swap.source_network,
        to: s.swap.destination_network,
        fromAsset: s.swap.source_token,
        toAsset: s.swap.destination_token,
        destination_address: s.swap.destination_address,
        fromExchange: s.swap.source_exchange,
        depositMethod: s.swap.use_deposit_address
            ? ('deposit_address' as const)
            : ('wallet' as const),
    };
    const gas = (
        <GasFeeView
            gasFeeInUsd={s.quoteState.gasFeeInUsd}
            isGaslessCapable={
                s.quoteState.gaslessCapable ?? s.quoteState.gasless
            }
            gaslessEnabled={s.quoteState.gasless}
            {...s.quoteState.gas}
        />
    );
    const slippage = (
        <SlippageView quoteData={s.quote} {...s.quoteState.slippage} />
    );
    const details = (
        <DetailedEstimatesView
            quote={s.quote}
            reward={s.quoteState.reward}
            showReward={s.quoteState.showReward}
            values={values}
            variant={s.swap.use_deposit_address ? 'extended' : 'base'}
            gasFee={gas}
            slippage={slippage}
        />
    );
    const detailsButton = (
        <QuoteDetailsSummary
            gasFeeInUsd={s.quoteState.gasFeeInUsd}
            isGasless={s.quoteState.gasless}
            isExchange={!!s.swap.source_exchange}
            isQuoteLoading={s.quoteState.status === 'loading'}
            averageCompletionTime={s.quote?.avg_completion_time}
            reward={s.quoteState.reward}
            showReward={s.quoteState.showReward}
        />
    );
    if (s.swap.use_deposit_address)
        return (
            <ManualQuoteView
                available={!!s.quote}
                isAccordionOpen={s.quoteState.expanded}
                setIsAccordionOpen={onExpandedChange}
                isQuoteLoading={s.quoteState.status === 'loading'}
                detailsButton={detailsButton}
                details={details}
            />
        );
    return (
        <QuoteView
            compact={compact}
            isOpen={s.quoteState.expanded}
            setIsOpen={onExpandedChange}
            summary={
                <QuoteSummaryView
                    compact={compact}
                    quoteData={{ quote: s.quote!, refuel: s.refuel }}
                    values={values}
                    isOpen={s.quoteState.expanded}
                    onOpen={() => onExpandedChange?.(true)}
                    sourceAddress={s.sourceAddress}
                    showDestinationAddress
                    recipient={s.recipient}
                    slippage={slippage}
                    gasFee={gas}
                    detailsButton={detailsButton}
                />
            }
            details={details}
        />
    );
}

function PreviewWallet({ snapshot: s }: { snapshot: Page2LoadedSnapshot }) {
    const state = s.wallet;
    if (s.balanceWarning?.kind === 'balance')
        return (
            <BalanceWarningView
                amount={s.balanceWarning.amount}
                asset={s.swap.source_token.asset}
                refreshing={s.balanceWarning.refreshing}
                refreshButton={
                    <RefreshBalanceButtonView
                        showSpinner={s.balanceWarning.refreshing}
                    />
                }
            />
        );
    if (s.rpc)
        return (
            <RPCUnhealthyView
                RPCUrl={s.swap.source_network.node_url}
                isSuggestingRpc={s.rpc.pending}
                rpcAddStatus={s.rpc.status}
            />
        );
    if (state.kind === 'connect')
        return (
            <ConnectWalletView
                loading={state.pending}
                connectError={state.error}
            />
        );
    if (state.kind === 'network')
        return (
            <ChangeNetworkView
                network={s.swap.source_network.display_name}
                isPending={state.pending}
                error={
                    state.error
                        ? Object.assign(new Error(state.error), {
                              shortMessage: state.error,
                          })
                        : undefined
                }
            />
        );
    if (state.kind === 'account-mismatch')
        return (
            <ActionMessages.DifferentAccountsNotAllowedError
                network={s.swap.source_network.display_name}
            />
        );
    if (state.kind === 'specialized')
        return (
            <SpecializedWithdrawalView
                provider={state.provider}
                network={s.swap.source_network}
                sourceAddress={s.sourceAddress}
                isConnected={state.connected}
                accountMismatch={!!state.accountMismatch}
                loading={state.pending}
                progress={state.progress}
                rejected={state.rejected}
                error={state.error}
                connectButton={<ConnectWalletView />}
            />
        );
    return (
        <>
            {s.balanceWarning?.kind === 'gas' && (
                <GasWarningView
                    adjustButton={
                        <AdjustAmountButtonView
                            disabled={s.quoteState.status === 'loading'}
                        />
                    }
                />
            )}
            <WalletSubmissionView
                message={
                    <ActionMessageView
                        error={state.error ? { name: state.error } : undefined}
                        isSignatureError={state.isSignatureError}
                        sourceNetwork={s.swap.source_network}
                        selectedSourceAddress={s.sourceAddress}
                        expanded={state.errorExpanded ?? false}
                        swapError={state.swapError}
                        gaslessUnavailable={state.gaslessUnavailable}
                        gaslessErrorMessage={state.gaslessMessage}
                    />
                }
                action={
                    <SendTransactionView
                        swapId={s.swapId}
                        depositActions={s.depositActions}
                        quote={s.quote}
                        quoteIsLoading={s.quoteState.status === 'loading'}
                        quoteError={s.quoteState.status === 'error'}
                        loading={state.pending}
                        actionStateText={state.label}
                        error={!!state.error}
                        swapError={state.swapError}
                        criticalMarketPriceImpact={!!state.critical}
                        showCriticalMarketPriceImpactButtons={
                            state.critical === 'confirmation'
                        }
                        priceImpactValues={
                            s.quote
                                ? resolvePriceImpactValues(s.quote, s.refuel)
                                : undefined
                        }
                        gaslessUnavailable={state.gaslessUnavailable}
                        gaslessFailureStage={state.gaslessFailureStage}
                    />
                }
            />
        </>
    );
}
