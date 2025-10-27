// log/LogProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { LogEvent, ExceptionEvent } from '@/types/logEvents';

type LogFn = (event: LogEvent) => void;

export const defaultHandler: LogFn = (e) => {
  console.log('[layerswap:log]', e?.type, e?.props);
};

let currentLogger: LogFn = defaultHandler;

export function setGlobalLogger(logger: LogFn | undefined) {
  currentLogger = logger ?? defaultHandler;
}

export function log(event: LogEvent) {
  currentLogger(event);
}

export function logException(event: ExceptionEvent) {
  log(event);
}

type LogContextValue = { log: LogFn };
const LogContext = createContext<LogContextValue | null>(null);

export const LogProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const value = useMemo<LogContextValue>(() => ({ log }), []);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLog = () => {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within a LogProvider');
  return ctx;
};
