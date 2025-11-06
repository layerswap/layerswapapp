import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useCallbacks } from './callbackProvider';
import { CallbacksShape, logStore } from '@/stores/logStore';

type LogFn = (event: any) => void;

export const defaultHandler: LogFn = (e) => {
  console.log('[layerswap:log]', e?.type, e?.props);
};

export function log(event: any) {
  const { logger, callbacks } = logStore.getState();;
  const onLogError = callbacks?.onLogError;

  const enriched = { ...event };

  switch (event?.type) {
    case 'APIError':
    case 'ErrorFallback':
    case 'NotFound':
    case 'SwapFailed':
      enriched.group = 'widgetError';
      logger?.(enriched);
      return onLogError?.onWidgetError?.(enriched);

    case 'BalanceResolverError':
    case 'BalanceProviderError':
      enriched.group = 'balanceError';
      logger?.(enriched);
      return onLogError?.onBalanceError?.(enriched);

    case 'MaxPriorityFeePerGasError':
    case 'FeesPerGasError':
    case 'GasPriceError':
      enriched.group = 'gasFeeError';
      logger?.(enriched);
      return onLogError?.onGasFeeError?.(enriched);

    case 'TransactionNotDetected':
      enriched.group = 'transactionNotDetected';
      logger?.(enriched);
      return onLogError?.onTransactionNotDetected?.(enriched);

    case 'SwapWithdrawalError':
    case 'TransactionFailed':
      enriched.group = 'walletWithdrawalError';
      logger?.(enriched);
      return onLogError?.onWalletWithdrawalError?.(enriched);

    case 'LongTransactionWarning':
      enriched.group = 'longTransactionWarning';
      logger?.(enriched);
      return onLogError?.onLongTransactionWarning?.(enriched);

    default:
      logger?.(enriched);
      return;
  }
}

export const logException = log;

type LogContextValue = { log: LogFn };
const LogContext = createContext<LogContextValue | null>(null);

export const ErrorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const callbacks = useCallbacks();
  useEffect(() => {
    // If useCallbacks() returns more than { onLogError }, adapt here:
    const mapped: CallbacksShape = { onLogError: callbacks?.onLogError };
    logStore.getState().setCallbacks(mapped);
  }, [callbacks]);

  const value = useMemo<LogContextValue>(() => ({ log }), []);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLog = () => {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within a ErrorProvider');
  return ctx;
};