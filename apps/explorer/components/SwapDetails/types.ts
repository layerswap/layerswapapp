import { SwapData, Transaction } from "@/models/Swap";

export interface SwapViewProps {
    swap: SwapData['swap'];
    quote?: SwapData['quote'];
    refuel?: SwapData['refuel'];
    inputTransaction?: Transaction;
    outputTransaction?: Transaction;
    refuelTransaction?: Transaction;
    refundedTransaction?: Transaction;
}

export interface NetworkAssetInfo {
    network?: {
        logo?: string;
        display_name?: string;
        transaction_explorer_template?: string;
        account_explorer_template?: string;
    };
    token?: {
        logo?: string;
        symbol?: string;
        precision?: number;
    };
    exchange?: {
        logo?: string;
        display_name?: string;
    };
}

