import { type ErrorEventType, type ErrorReportInput } from '@layerswap/widget-types';
import { logStore } from "@/stores/logStore";
import { ErrorHandler as UtilsErrorHandler, setErrorClassifier, setErrorLogger } from "@layerswap/widget-types";
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors';

const WALLET_ERROR_TYPES = new Set<ErrorEventType['type']>([
    'WalletError', 'ChainError', 'TransferError',
    'SwapWithdrawalError', 'TransactionFailed',
]);

export function registerWidgetErrorLogger() {
    setErrorLogger(event => logStore.getState().logger(event));
    setErrorClassifier(event => {
        // API and background diagnostics do not use the wallet reason taxonomy.
        if (event.reasonCode !== undefined || !WALLET_ERROR_TYPES.has(event.type)) return undefined;
        const reasonCode = normalizeWalletErrorCode(event);
        return reasonCode === 'unknown_error' ? undefined : reasonCode;
    });
}

export function ErrorHandler(event: ErrorReportInput) {
    return UtilsErrorHandler(event);
}
