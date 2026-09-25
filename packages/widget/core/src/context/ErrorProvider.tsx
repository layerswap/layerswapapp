import React, { createContext, useEffect } from 'react';
import { type ErrorLogger, logStore } from '@/stores/logStore';

const LogContext = createContext<null>(null);

type ErrorProviderProps = React.PropsWithChildren<{
  onError?: ErrorLogger;
}>;

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children, onError }) => {
  useEffect(() => {
    return logStore.getState().registerLogger(onError);
  }, [onError]);

  return <LogContext.Provider value={null}>{children}</LogContext.Provider>;
};
