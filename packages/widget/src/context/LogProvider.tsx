import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { ExceptionEvent, LogEvent } from "@/types/logEvents";

type LogFn = (event: LogEvent) => void;

const defaultHandler: LogFn = (e) => {
    console.debug('[layerswap:log]', e.type, e.props);
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

type LogProviderProps = React.PropsWithChildren<{ onLogEvent?: LogFn }>;

export const LogProvider: React.FC<LogProviderProps> = ({ children, onLogEvent }) => {
    const logCb = useCallback<LogFn>(
        (event) => (onLogEvent ? onLogEvent(event) : defaultHandler(event)),
        [onLogEvent]
    );

    useEffect(() => {
        setGlobalLogger(logCb);
        return () => setGlobalLogger(defaultHandler);
    }, [logCb]);

    const value = useMemo<LogContextValue>(() => ({ log: logCb }), [logCb]);

    return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLog = () => {
    const ctx = useContext(LogContext);
    if (!ctx) throw new Error('useLog must be used within a LogProvider');
    return ctx;
};