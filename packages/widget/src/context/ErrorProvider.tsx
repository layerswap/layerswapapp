import React, { createContext, useEffect } from 'react';
import { useCallbacks } from './callbackProvider';
import { logStore } from '@/stores/logStore';

const LogContext = createContext<null>(null);

export const ErrorProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const callbacks = useCallbacks();
  useEffect(() => {
    if (callbacks?.onError) {
      logStore.getState().setLogger(callbacks.onError);
    }
  }, [callbacks.onError]);

  return <LogContext.Provider value={null}>{children}</LogContext.Provider>;
};