import { SwapStatus } from './SwapStatus';

export interface SwapInfo
{
    id: string;
    amount: number;
    status: SwapStatus;
    destinationAddress: string;
    message: string;
    transaction_id: string;
    currency: string;
    network: string;
}