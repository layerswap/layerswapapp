import { useId, type ReactNode } from 'react';
import { QrCode } from 'lucide-react';
import { ImageWithFallback, WalletIcon } from '@layerswap/ui-kit/components';
import { ResolveConnectorIcon } from '@/components/Icons/ConnectorIcons';
import { WidgetFrame } from '@/components/Widget/WidgetFrame';
import { PoweredByFooter } from '@/components/Widget/Footer';
import { ElapsedTime } from '@/components/Common/ElapsedTime';
import { resolveSwapPhase } from '@/components/utils/resolveSwapPhase';
import { TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import { ReadOnlyPreview } from '../Swap/Withdraw/Presentation/ReadOnlyPreview';
import type { Page2PreviewMode } from '../Swap/Withdraw/Presentation/Page2PreviewFrame';
import { Page2LoadedPreview } from '../Swap/Withdraw/Presentation/Page2Preview';
import { ProcessingView } from '../Swap/Withdraw/Presentation/ProcessingView';
import { FailedView } from '../Swap/Withdraw/Presentation/FailedView';
import SummaryView from '../Swap/Withdraw/Presentation/SummaryView';
import { DepositAddressInfoView } from '../Swap/Form/DepositAddressForm/DepositAddressInfoView';
import { DepositQuoteDetailsView } from '../Swap/Form/DepositAddressForm/DepositQuoteDetailsView';
import { DepositAddressFormButtonView } from '../Swap/Form/DepositAddressForm/DepositAddressFormButtonView';
import { DepositAddressTransition } from '../Swap/Form/DepositAddressForm/DepositAddressTransition';
import {
    PayFromTriggerContent,
    payFromTriggerClassName,
} from '../Swap/Form/DepositAddressForm/PayFromTriggerView';
import { DepositHeaderView } from './DepositHeaderView';
import { DepositLayoutView } from './DepositLayoutView';
import { DestinationTokenPickerView } from './DestinationTokenPickerView';
import { MethodCard, MethodPickerView } from './Options/MethodPickerView';
import type { DepositSnapshot } from './DepositSnapshot';

export function DepositPreview({
    snapshot,
    now,
    mode = 'component',
    onQuoteExpandedChange,
}: {
    snapshot: DepositSnapshot;
    now: number;
    mode?: Page2PreviewMode;
    onQuoteExpandedChange?: (expanded: boolean) => void;
}) {
    const id = useId();
    const transfer = 'transfer' in snapshot ? snapshot.transfer : undefined;
    const resolved = transfer
        ? resolveSwapPhase({
              swapDetails: transfer.details,
              refuel: transfer.refuel,
              storedWalletTransaction: transfer.storedWalletTransaction,
              isDepositFlow: true,
          })
        : undefined;
    const closeLocked = !!resolved && !resolved.isTerminal;
    let content: ReactNode;
    let summary: ReactNode;

    if (snapshot.step === 'methods') {
        const destination = snapshot.destinations[0];
        content = (
            <MethodPickerView
                destinationPicker={
                    <DestinationTokenPickerView
                        resolved={snapshot.destinations}
                        destination={destination?.network}
                        destinationToken={destination?.token}
                    />
                }
            >
                {snapshot.methods.map((method) => (
                    <MethodCard
                        key={method.id}
                        {...method}
                        icon={
                            method.logo ? (
                                <ImageWithFallback
                                    src={method.logo}
                                    alt={method.title}
                                    width={28}
                                    height={28}
                                    className="rounded-full object-contain"
                                />
                            ) : method.icon === 'address' ? (
                                <QrCode className="h-6 w-6 text-primary-text" />
                            ) : method.id === 'wallet' ? (
                                <ResolveConnectorIcon
                                    iconClassName="w-[15px] h-[15px] p-px rounded bg-secondary-800 border border-secondary-400"
                                    className="grid grid-cols-2 gap-0.5"
                                />
                            ) : (
                                <WalletIcon
                                    className="h-6 w-6 text-primary-text"
                                    strokeWidth={2}
                                />
                            )
                        }
                    />
                ))}
            </MethodPickerView>
        );
    } else if (snapshot.step === 'address') {
        content = (
            <>
                <button type="button" className={payFromTriggerClassName(true)}>
                    <PayFromTriggerContent
                        selectedSource={snapshot.source}
                        hasMultipleOptions
                        hideDestinationPicker
                    />
                </button>
                <DepositAddressInfoView
                    sourceNetwork={snapshot.source.network}
                    depositAddress={snapshot.address}
                    isCreatingSwap={!!snapshot.loading}
                    quoteDetails={
                        <DepositQuoteDetailsView
                            showQuoteSkeleton={snapshot.loading}
                            hasQuotes={!snapshot.loading}
                            isOpen={snapshot.quote.expanded}
                            onOpenChange={onQuoteExpandedChange}
                            minDepositDisplay={snapshot.quote.minimum}
                            maxDepositDisplay={snapshot.quote.maximum}
                            feeDisplay={snapshot.quote.fees}
                            estTime={snapshot.quote.estimatedTime}
                        />
                    }
                />
                <DepositAddressFormButtonView
                    isValid
                    isSubmitting={!!snapshot.loading}
                    showDepositInfo={!snapshot.loading}
                    depositAddress={snapshot.address}
                    isProcessing={false}
                    isCompleted={false}
                />
            </>
        );
    } else if (snapshot.step === 'wallet') {
        content = (
            <Page2LoadedPreview
                snapshot={snapshot.transfer}
                now={now}
                onQuoteExpandedChange={onQuoteExpandedChange}
            />
        );
    } else {
        const { transfer } = snapshot;
        const input = transfer.details.transactions.find(
            (t) => t.type === TransactionType.Input,
        );
        const output = transfer.details.transactions.find(
            (t) => t.type === TransactionType.Output,
        );
        const completed = !!output?.transaction_hash && !!output.amount;
        summary = (
            <SummaryView
                swap={{
                    ...transfer.swap,
                    requested_amount:
                        input?.amount?.toString() ??
                        transfer.swap.requested_amount,
                }}
                quote={{ quote: transfer.quote!, refuel: transfer.refuel }}
                sourceAccountAddress={transfer.sourceAddress}
                receiveAmount={output?.amount || transfer.quote?.receive_amount}
                quoteIsLoading={transfer.quoteState.status === 'loading'}
                isUsdMode={transfer.usdMode}
            />
        );
        content = (
            <>
                <ProcessingView
                    swapBasicData={transfer.swap}
                    swapDetails={transfer.details}
                    resolved={resolved!}
                    isDepositFlow
                    readOnly
                    transactionHash={input?.transaction_hash}
                    inputConfirmations={input?.confirmations}
                    inputMaxConfirmations={input?.max_confirmations}
                    elapsedTime={
                        <ElapsedTime
                            swapDetails={transfer.details}
                            elapsedMs={
                                input?.timestamp
                                    ? Math.max(
                                          0,
                                          now - Date.parse(input.timestamp),
                                      )
                                    : 0
                            }
                        />
                    }
                    failedPanel={
                        <FailedView
                            status={transfer.details.status}
                            isDepositFlow
                        />
                    }
                />
                <DepositAddressFormButtonView
                    isValid
                    isSubmitting={false}
                    showDepositInfo={false}
                    depositAddress={undefined}
                    isProcessing
                    isCompleted={completed}
                />
            </>
        );
    }

    const card = (
        <WidgetFrame fitHeight id={`deposit-preview-widget-${id}`}>
            <DepositLayoutView
                header={
                    <DepositHeaderView
                        title={snapshot.title}
                        canGoBack={snapshot.step !== 'methods'}
                        showClose={mode === 'modal' && !closeLocked}
                    />
                }
                footer={<PoweredByFooter />}
                transitionKey={
                    snapshot.step === 'methods'
                        ? 'method-picker'
                        : snapshot.step === 'wallet'
                          ? 'wallet-processing'
                          : 'transfer-crypto'
                }
            >
                {snapshot.step === 'address' ||
                snapshot.step === 'address-processing' ? (
                    <DepositAddressTransition
                        summary={summary}
                        instructions={
                            snapshot.step === 'address' ? content : undefined
                        }
                        processing={
                            snapshot.step === 'address-processing'
                                ? content
                                : undefined
                        }
                    />
                ) : (
                    content
                )}
            </DepositLayoutView>
        </WidgetFrame>
    );

    return (
        <ReadOnlyPreview
            mode={mode}
            allowQuoteDisclosure={!!onQuoteExpandedChange}
        >
            {mode === 'modal' ? (
                <div className="relative flex min-h-[540px] items-center justify-center rounded-3xl bg-black/50 px-3 py-8 max-sm:items-end max-sm:px-0 max-sm:pb-0">
                    <div
                        role="dialog"
                        aria-label={snapshot.title ?? 'Deposit'}
                        aria-modal="false"
                        className="w-full max-w-md"
                        data-deposit-modal
                    >
                        {card}
                    </div>
                </div>
            ) : (
                card
            )}
        </ReadOnlyPreview>
    );
}
