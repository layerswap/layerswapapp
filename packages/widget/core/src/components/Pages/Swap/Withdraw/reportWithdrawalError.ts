import { ErrorHandler } from '@/lib/ErrorHandler';

export function reportWithdrawalError(error: unknown, context: { swapId?: string; fromAddress?: string; toAddress?: string }): void {
    const details = error instanceof Error ? error : new Error(String(error));
    ErrorHandler({
        type: 'SwapWithdrawalError',
        message: details.message,
        name: details.name,
        stack: details.stack,
        cause: error,
        ...context,
    });
}
