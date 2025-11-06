import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useCallbacks } from './callbackProvider';
import { LogGroup } from '@/types';
import { CallbacksShape, logStore, useLogStore } from '@/stores/logStore';

type LogFn = (event: any) => void;

export const defaultHandler: LogFn = (e) => {
  console.log('[layerswap:log]', e?.type, e?.props);
};

const handlerKeyByGroup: Record<
  LogGroup,
  | 'onWidgetError'
  | 'onBalanceError'
  | 'onGasFeeError'
  | 'onTransactionNotDetected'
  | 'onWalletWithdrawalError'
  | 'onLongTransactionWarning'
> = {
  widgetError: 'onWidgetError',
  balanceError: 'onBalanceError',
  gasFeeError: 'onGasFeeError',
  transactionNotDetected: 'onTransactionNotDetected',
  walletWithdrawalError: 'onWalletWithdrawalError',
  longTransactionWarning: 'onLongTransactionWarning',
};

export function log(event: any) {
  const { logger, callbacks } = useLogStore.getState();
  logger?.(event);

  const group = resolveGroup(event);
  if (!group) return;

  const key = handlerKeyByGroup[group];
  callbacks?.onLogError?.[key]?.(event);
}

export const logException = log;

type LogContextValue = { log: LogFn };
const LogContext = createContext<LogContextValue | null>(null);

export const ErrorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const callbacks = useCallbacks();
  useEffect(() => {
    // If useCallbacks() returns more than { onLogError }, adapt here:
    const mapped: CallbacksShape = { onLogError: callbacks?.onLogError };
    logStore.setCallbacks(mapped);
  }, [callbacks]);

  const value = useMemo<LogContextValue>(() => ({ log }), []);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLog = () => {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within a ErrorProvider');
  return ctx;
};


function resolveGroup(e: any): LogGroup | undefined {
  switch (e?.type) {
    case 'APIError':
    case 'ErrorFallback':
    case 'NotFound':
    case 'SwapFailed':
      return 'widgetError';
    case 'BalanceResolverError':
    case 'BalanceProviderError':
      return 'balanceError';
    case 'MaxPriorityFeePerGasError':
    case 'FeesPerGasError':
    case 'GasPriceError':
      return 'gasFeeError';
    case 'TransactionNotDetected':
      return 'transactionNotDetected';
    case 'SwapWithdrawalError':
    case 'TransactionFailed':
      return 'walletWithdrawalError';
    case 'LongTransactionWarning':
      return 'longTransactionWarning';
    default:
      return;
  }
}