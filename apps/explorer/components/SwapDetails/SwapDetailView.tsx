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

    const isPending = status === SwapStatus.LsTransferPending || status === SwapStatus.UserTransferPending;
    const isFailed = status === SwapStatus.Failed || status === SwapStatus.Refunded;
    const hasRefuel = swap.transactions?.some(t => t?.type === TransactionType.Refuel);

    return (
        <div className="w-full">
            <div className="sm:rounded-lg w-full">
                <div className="py-2 lg:py-10 pt-4 lg:px-8">
                    {/* Back Button */}
                    {pathname !== '/' && (
                        <div className="hidden lg:block w-fit mb-1 hover:bg-secondary-600 hover:text-accent-foreground rounded ring-offset-background transition-colors -ml-5">
                            <BackBtn />
                        </div>
                    )}

                    {/* Status Header */}
                    <SwapStatusHeader
                        status={status as SwapStatus}
                        inputTransaction={inputTransaction}
                        outputTransaction={outputTransaction}
                        createdDate={created_date}
                        totalFee={quote?.total_fee}
                        sourceTokenSymbol={source_token?.symbol}
                        sourceTokenPrecision={source_token?.precision}
                    />

                    {/* Refund Info */}
                    {refundedTransaction && <Refund refund={refundedTransaction} />}

                    {/* Transaction Cards */}
                    <div className="flex flex-col lg:flex-row items-start rounded-md text-primary-text gap-4">
                        {/* Source Transaction Card */}
                        <div className="lg:max-w-[50%] w-full">
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
                                accountExplorerUrl={source_network?.account_explorer_template?.replace('{0}', inputTransaction.from)}
                                txExplorerUrl={source_network?.transaction_explorer_template?.replace('{0}', inputTransaction.transaction_hash)}
                                showConfirmations={true}
                            />
                        </div>

                        {/* Arrow */}
                        <div className="rotate-90 lg:rotate-0 self-center">
                            <ArrowRight className="text-primary-text w-6 h-auto" />
                        </div>

                        {/* Destination Transaction Card */}
                        <div className="w-full">
                            <TransactionCard
                                title="To"
                                titleClassName={isFailed ? 'text-[#FF6161]' : ''}
                                transaction={outputTransaction}
                                refundedTransaction={refundedTransaction}
                                amount={(outputTransaction || refundedTransaction)?.amount}
                                tokenLogo={destination_token?.logo}
                                tokenSymbol={destination_token?.symbol}
                                networkLogo={destination_network?.logo}
                                networkName={destination_exchange ? destination_network?.display_name : undefined}
                                exchangeLogo={destination_exchange?.logo}
                                exchangeName={destination_exchange?.display_name || destination_network?.display_name}
                                accountExplorerUrl={destination_network?.account_explorer_template?.replace('{0}', (outputTransaction || refundedTransaction)?.to || '')}
                                txExplorerUrl={destination_network?.transaction_explorer_template?.replace('{0}', outputTransaction?.transaction_hash || '')}
                                isPending={isPending}
                                isRefunded={!!refundedTransaction}
                            />

                            {/* Refuel Section */}
                            {hasRefuel && (
                                <div className="mt-3">
                                    <RefuelCard
                                        refuelTransaction={refuelTransaction}
                                        refuelAmount={refuel?.amount}
                                        refuelTokenLogo={refuel?.token?.logo}
                                        refuelTokenSymbol={refuel?.token?.symbol}
                                        refuelTokenPrecision={refuel?.token?.precision}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

