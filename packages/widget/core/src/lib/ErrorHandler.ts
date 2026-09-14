import { type ErrorEventType } from '@layerswap/widget-types';
import { logStore } from "@/stores/logStore";
import { ErrorHandler as UtilsErrorHandler, setErrorLogger } from "@layerswap/widget-types";
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors';

const WALLET_ERROR_TYPES = new Set<ErrorEventType['type']>([
    'WalletError', 'ChainError', 'TransferError',
    'SwapWithdrawalError', 'TransactionFailed',
]);

export function registerWidgetErrorLogger() {
    setErrorLogger((event) => {
        const logger = logStore.getState().logger;
        // API and background diagnostics do not use the wallet reason taxonomy.
        if (event.reasonCode !== undefined || !WALLET_ERROR_TYPES.has(event.type)) {
            logger(event);
            return;
        }
        const reasonCode = normalizeWalletErrorCode(event);
        logger(reasonCode === 'unknown_error' ? event : { ...event, reasonCode });
    });
}

export function ErrorHandler(event: ErrorEventType) {
    return UtilsErrorHandler(event);
}
