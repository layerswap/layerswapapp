"use client";

import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import BackBtn from "@/helpers/BackButton";
import Refund from "../RefundComp";
import TransactionCard, { RefuelCard } from "./TransactionCard";
import SwapStatusHeader from "./SwapStatusHeader";
import { SwapStatus } from "@/models/SwapStatus";
import { Swap, Transaction, TransactionType } from "@/models/Swap";

interface SwapDetailViewProps {
    swap: Swap;
    quote?: {
        total_fee?: number;
    };
    refuel?: {
        amount?: number;
        token?: {
            logo?: string;
            symbol?: string;
            precision?: number;
        };
    };
    inputTransaction: Transaction;
    outputTransaction?: Transaction;
    refuelTransaction?: Transaction;
    refundedTransaction?: Transaction;
}

export default function SwapDetailView({
    swap,
    quote,
    refuel,
    inputTransaction,
    outputTransaction,
    refuelTransaction,
    refundedTransaction,
}: SwapDetailViewProps) {
    const pathname = usePathname();

    const {
        source_network,
        source_token,
        source_exchange,
        destination_network,
        destination_token,
        destination_exchange,
        status,
        created_date,
    } = swap;

    const sourceAccountAddress = swap.source_address || inputTransaction.from || '';

    const isPending = status === SwapStatus.LsTransferPending || status === SwapStatus.UserTransferPending;
    const isFailed = status === SwapStatus.Failed || status === SwapStatus.Refunded;
    const hasRefuel = swap.transactions?.some(t => t?.type === TransactionType.Refuel);

    const refundToken = !outputTransaction ? refundedTransaction?.token : undefined;
    const refundNetwork = !outputTransaction ? refundedTransaction?.network : undefined;

    return (
        <div className="w-full">
            <div className="sm:rounded-lg w-full">
                <div className="py-2 lg:py-10 pt-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    {pathname !== '/' && (
                        <div className="hidden xl:block w-fit mb-1 hover:bg-secondary-600 hover:text-accent-foreground rounded ring-offset-background transition-colors -ml-5">
                            <BackBtn />
                        </div>
                    )}

                    {/* Status Header */}
                    <div className="md:ml-0 md:mb-2 flex-col sm:flex-row sm:justify-between sm:items-start">
                        <div className="text-sm md:text-base sm:flex justify-between w-full">
                            <div className="items-center text-base mb-0.5 w-full">
                                <div className="mr-2 sm:text-xl text-base w-full">
                                    <SwapStatusHeader
                                        status={status as SwapStatus}
                                        inputTransaction={inputTransaction}
                                        outputTransaction={outputTransaction}
                                        createdDate={created_date}
                                        totalFee={quote?.total_fee}
                                        sourceTokenSymbol={source_token?.symbol}
                                        sourceTokenPrecision={source_token?.precision}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <>
                        {/* Refund Info */}
                        {refundedTransaction && <Refund refund={refundedTransaction} />}

                        {/* Transaction Cards */}
                        <div className="flex flex-col lg:flex-row items-start rounded-md text-primary-text gap-4">
                            {/* Source Transaction Card */}
                            <TransactionCard
                                title="From"
                                transaction={inputTransaction}
                                amount={inputTransaction.amount}
                                tokenLogo={source_token?.logo}
                                tokenSymbol={source_token?.symbol}
                                networkLogo={source_network?.logo}
                                networkName={source_exchange ? source_network?.display_name : undefined}
                                exchangeLogo={source_exchange?.logo}
                                exchangeName={source_exchange?.display_name || source_network?.display_name}
                                fromAddress={sourceAccountAddress}
                                accountExplorerUrl={source_network?.account_explorer_template?.replace('{0}', sourceAccountAddress)}
                                txExplorerUrl={source_network?.transaction_explorer_template?.replace('{0}', inputTransaction.transaction_hash)}
                                showConfirmations={true}
                            />

                            {/* Arrow */}
                            <div className="rotate-90 lg:rotate-0 self-center">
                                <ArrowRight className="text-primary-text w-6 h-auto" />
                            </div>

                            {/* Destination Transaction Card */}
                            <TransactionCard
                                title="To"
                                titleClassName={isFailed ? 'text-[#FF6161]' : ''}
                                transaction={outputTransaction}
                                refundedTransaction={refundedTransaction}
                                amount={(outputTransaction || refundedTransaction)?.amount}
                                tokenLogo={(refundToken || destination_token)?.logo}
                                tokenSymbol={(refundToken || destination_token)?.symbol}
                                networkLogo={(refundNetwork || destination_network)?.logo}
                                networkName={destination_exchange ? destination_network?.display_name : undefined}
                                exchangeLogo={destination_exchange?.logo}
                                exchangeName={destination_exchange?.display_name || (refundNetwork || destination_network)?.display_name}
                                accountExplorerUrl={(refundNetwork || destination_network)?.account_explorer_template?.replace('{0}', (outputTransaction || refundedTransaction)?.to || '')}
                                txExplorerUrl={destination_network?.transaction_explorer_template?.replace('{0}', outputTransaction?.transaction_hash || '')}
                                isPending={isPending}
                                isRefunded={!!refundedTransaction}
                            >
                                {/* Refuel Section */}
                                {hasRefuel && (
                                    <RefuelCard
                                        refuelTransaction={refuelTransaction}
                                        refuelAmount={refuel?.amount}
                                        refuelTokenLogo={refuel?.token?.logo}
                                        refuelTokenSymbol={refuel?.token?.symbol}
                                        refuelTokenPrecision={refuel?.token?.precision}
                                    />
                                )}
                            </TransactionCard>
                        </div>
                    </>

                </div>
            </div>
        </div>
    );
}

