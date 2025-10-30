// log/LogProvider.tsx
import { GROUP_MAP, LogEvent, LogGroup } from '@/types';
import React, { createContext, useContext, useMemo } from 'react';
import { useCallbacks } from './callbackProvider';

type LogFn = (event: LogEvent) => void;

export const defaultHandler: LogFn = (e) => {
  console.log('[layerswap:log]', e?.type, e?.props);
};

let currentLogger: LogFn = defaultHandler;

export function setGlobalLogger(logger: LogFn | undefined) {
  currentLogger = logger ?? defaultHandler;
}

function resolveGroup(event: LogEvent): LogGroup | undefined {
  return GROUP_MAP[event.type];
}

export function log(event: LogEvent) {
  currentLogger(event);

  const { onLogEvent, onLogGroup } = _callbacksAccessor?.() ?? {};
  const group = resolveGroup(event);
  if (!group) return;

  onLogEvent?.(event, group);
  onLogGroup?.[group]?.(event);
}

export function logException(event: LogEvent) {
  log(event);
}

type LogContextValue = { log: LogFn };
const LogContext = createContext<LogContextValue | null>(null);

// This indirection lets `log()` access callbacks even when called outside React handlers.
let _callbacksAccessor: (() => ReturnType<typeof useCallbacks>) | null = null;

export const LogProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const callbacks = useCallbacks();
  _callbacksAccessor = () => callbacks;

  const value = useMemo<LogContextValue>(() => ({ log }), []);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLog = () => {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within a LogProvider');
  return ctx;
};
