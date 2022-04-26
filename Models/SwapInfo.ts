import { SwapStatus } from './SwapStatus';

export interface SwapInfo
{
    id: string;
    amount: number;
    status: SwapStatus;
    destination_address: string;
    message: string;
    transaction_id: string;
    currency: string;
    network: string;
    offramp_info: SwapOffRampInfo
}

export interface SwapOffRampInfo{
    deposit_address: string;
    memo:string;
}