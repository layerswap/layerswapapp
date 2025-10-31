import React, { createContext, useContext, useMemo } from 'react';
import { useCallbacks } from './callbackProvider';
import { LogGroup } from '@/types';

type LogFn = (event: any) => void;

export const defaultHandler: LogFn = (e) => {
  console.log('[layerswap:log]', e?.type, e?.props);
};

let currentLogger: LogFn = defaultHandler;
export function setGlobalLogger(logger?: LogFn) {
  currentLogger = logger || defaultHandler;
}

// This indirection lets `log()` access callbacks even when called outside React handlers.
let _callbacksAccessor: (() => ReturnType<typeof useCallbacks>) | null = null;

const handlerKeyByGroup: Record<LogGroup,
  'onWidgetError' | 'onBalanceError' | 'onGasFeeError' | 'onTransactionNotDetected' | 'onWalletWithdrawalError' | 'onLongTransactionWarning'
> = {
  widgetError: 'onWidgetError',
  balanceError: 'onBalanceError',
  gasFeeError: 'onGasFeeError',
  transactionNotDetected: 'onTransactionNotDetected',
  walletWithdrawalError: 'onWalletWithdrawalError',
  longTransactionWarning: 'onLongTransactionWarning',
};

export function log(event: any) {
  currentLogger(event);

  const c = _callbacksAccessor && _callbacksAccessor();
  if (!c) return;

  const group = resolveGroup(event);
  if (!group) return;

  const handlers = c.onLogError;
  if (!handlers) return;

  const handler = handlers[handlerKeyByGroup[group]];
  if (handler) handler(event);
}

export const logException = log;

type LogContextValue = { log: LogFn };
const LogContext = createContext<LogContextValue | null>(null);


export const ErrorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const callbacks = useCallbacks();
  _callbacksAccessor = () => callbacks;

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