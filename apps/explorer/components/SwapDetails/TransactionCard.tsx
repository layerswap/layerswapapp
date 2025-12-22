"use client";

import Image from "next/image";
import Link from "next/link";
import CopyButton from "../buttons/copyButton";
import { shortenAddress, shortenHash } from "@/lib/utils";
import { formatAmount } from "@/helpers/formatAmount";
import { Transaction } from "@/models/Swap";

interface TransactionCardProps {
    title: string;
    titleClassName?: string;
    transaction?: Transaction;
    refundedTransaction?: Transaction;
    amount?: number;
    tokenLogo?: string;
    tokenSymbol?: string;
    networkLogo?: string;
    networkName?: string;
    exchangeLogo?: string;
    exchangeName?: string;
    accountExplorerUrl?: string;
    txExplorerUrl?: string;
    showConfirmations?: boolean;
    isPending?: boolean;
    isRefunded?: boolean;
}

export default function TransactionCard({
    title,
    titleClassName = "",
    transaction,
    refundedTransaction,
    amount,
    tokenLogo,
    tokenSymbol,
    networkLogo,
    networkName,
    exchangeLogo,
    exchangeName,
    accountExplorerUrl,
    txExplorerUrl,
    showConfirmations = false,
    isPending = false,
    isRefunded = false,
}: TransactionCardProps) {
    const displayTransaction = transaction || refundedTransaction;
    const displayAmount = amount ?? displayTransaction?.amount;
    const hasAmount = displayAmount !== undefined && displayAmount !== null;

    return (
        <div className="rounded-md w-full lg:p-6 grid gap-y-3 text-primary-text relative">

            <div className="flex items-center text-primary-text">
                <div className={`mr-2 text-2xl font-medium ${titleClassName}`}>{title}</div>
            </div>


            <div className="rounded-lg w-full grid text-primary-text bg-secondary-500 shadow-lg relative border-secondary-400 border-t-4 divide-y divide-secondary-400">
                {isPending && <span className="pendingAnim"></span>}
                {/* Asset & Network Row */}
                <div className="flex justify-around">
                    <div className="flex-1 p-4 whitespace-nowrap">
                        <div className="text-base font-normal text-secondary-text">Asset</div>
                        <div className="flex items-center">
                            {hasAmount ? (
                                <span className="text-sm lg:text-base font-medium text-primary-text flex items-center">
                                    <Image
                                        alt="Token icon"
                                        src={tokenLogo || ''}
                                        width={20}
                                        height={20}
                                        className="rounded-md mr-2"
                                    />
                                    {formatAmount(displayAmount)} {tokenSymbol}
                                </span>
                            ) : (
                                <span>-</span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-4 border-secondary-400 border-l">
                        <div className="text-base font-normal text-secondary-text">Network</div>
                        <div className="flex items-center">
                            <Image
                                alt="Network icon"
                                src={exchangeLogo || networkLogo || ''}
                                width={20}
                                height={20}
                                className="rounded-md mr-2"
                            />
                            <span className="text-sm lg:text-base font-medium text-primary-text">
                                {exchangeName || networkName}
                            </span>
                        </div>

                        {/* Via Network (when using exchange) */}
                        {exchangeName && networkName && (
                            <div>
                                <div className="text-base font-normal text-secondary-text">Via</div>
                                <div className="flex items-center">
                                    <Image
                                        alt="Via network icon"
                                        src={networkLogo || ''}
                                        width={20}
                                        height={20}
                                        className="rounded-md mr-2"
                                    />
                                    <span className="text-sm lg:text-base font-medium text-primary-text">
                                        {networkName}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Address Row */}
                <div className="flex flex-col p-4">
                    <div className="text-base font-normal text-secondary-text">
                        {title === "From" ? "From Address" : "To Address"}
                    </div>
                    <div className="text-sm lg:text-base font-medium text-tx-base w-full">
                        {displayTransaction?.from || displayTransaction?.to ? (
                            <div className="flex justify-between items-center text-primary-text hover:text-secondary-text">
                                <Link
                                    href={accountExplorerUrl || '#'}
                                    target="_blank"
                                    className="hover:text-secondary-text w-fit contents items-center"
                                >
                                    <span className="break-all link link-underline link-underline-black">
                                        {title === "From" ? displayTransaction?.from : displayTransaction?.to}
                                    </span>
                                </Link>
                                <CopyButton
                                    toCopy={title === "From" ? displayTransaction?.from : displayTransaction?.to}
                                    iconHeight={16}
                                    iconClassName="order-2"
                                    iconWidth={16}
                                    className="ml-2"
                                />
                            </div>
                        ) : (
                            <span className="ml-1">-</span>
                        )}
                    </div>
                </div>

                {/* Transaction Row */}
                <div className="flex flex-col p-4">
                    <div className="text-base font-normal text-secondary-text">Transaction</div>
                    <div className="text-sm lg:text-base font-medium text-tx-base w-full">
                        {transaction?.transaction_hash ? (
                            <div className="flex items-center justify-between text-primary-text hover:text-secondary-text">
                                <Link
                                    href={txExplorerUrl || '#'}
                                    target="_blank"
                                    className="hover:text-secondary-text w-fit contents items-center"
                                >
                                    <span className="break-all">
                                        {shortenAddress(transaction.transaction_hash)}
                                    </span>
                                </Link>
                                <CopyButton
                                    toCopy={transaction.transaction_hash}
                                    iconHeight={16}
                                    iconClassName="order-2"
                                    iconWidth={16}
                                    className="ml-2"
                                />
                            </div>
                        ) : (
                            <span>{isRefunded ? <span className="text-[#FF6161]">Failed</span> : "-"}</span>
                        )}
                    </div>
                </div>

                {/* Confirmations Row */}
                {showConfirmations && transaction && transaction.confirmations < transaction.max_confirmations && (
                    <div className="flex-1 px-4 pb-2">
                        <div className="text-base font-normal text-secondary-text">
                            Confirmations
                            <span className="text-sm lg:text-base font-medium text-primary-text ml-1">
                                {transaction.confirmations}/{transaction.max_confirmations}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Refuel Card Component
interface RefuelCardProps {
    refuelTransaction?: Transaction;
    refuelAmount?: number;
    refuelTokenLogo?: string;
    refuelTokenSymbol?: string;
    refuelTokenPrecision?: number;
}

export function RefuelCard({
    refuelTransaction,
    refuelAmount,
    refuelTokenLogo,
    refuelTokenSymbol,
    refuelTokenPrecision,
}: RefuelCardProps) {
    if (!refuelTransaction) return null;

    const truncateDecimals = (value: number | undefined, decimals: number | undefined) => {
        if (value === undefined || decimals === undefined) return value;
        const truncated = Number(value.toFixed(decimals));
        if (truncated.toString().includes('e')) {
            return truncated.toFixed(decimals);
        }
        return truncated;
    };

    return (
        <>
            <div className="flex items-center text-primary-text">
                <div className="mr-2 text-primary-text text-2xl font-medium">... and for gas</div>
            </div>
            <div className="rounded-md w-full grid gap-y-3 text-primary-text bg-secondary-700 shadow-lg relative border-secondary-600 border">
                <div className="flex justify-around">
                    <div className="flex-1 p-4">
                        <div className="text-base font-normal text-socket-secondary">Native Asset</div>
                        <div className="flex items-center">
                            <Image
                                alt="Refuel token icon"
                                src={refuelTokenLogo || ''}
                                width={20}
                                height={20}
                                className="rounded-md"
                            />
                            <span className="text-sm lg:text-base font-medium text-socket-table text-primary-text ml-0.5">
                                {truncateDecimals(refuelAmount, refuelTokenPrecision)} {refuelTokenSymbol}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 p-4 border-secondary-600 border-l">
                        <div className="text-base font-normal text-socket-secondary">Transaction</div>
                        {refuelTransaction.transaction_hash ? (
                            <div className="flex items-center justify-between text-primary-text hover:text-primary-text">
                                <Link
                                    href={refuelTransaction.network?.transaction_explorer_template?.replace('{0}', refuelTransaction.transaction_hash) || '#'}
                                    target="_blank"
                                    className="hover:text-gray-300 w-fit contents items-center"
                                >
                                    <span className="break-all link link-underline link-underline-black">
                                        {shortenHash(refuelTransaction.transaction_hash)}
                                    </span>
                                </Link>
                                <CopyButton
                                    toCopy={refuelTransaction.transaction_hash}
                                    iconHeight={16}
                                    iconClassName="order-2"
                                    iconWidth={16}
                                    className="ml-2"
                                />
                            </div>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

