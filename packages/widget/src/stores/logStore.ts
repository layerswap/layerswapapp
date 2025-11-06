import { BalanceError, GasFeeError, OnLongTransactionWarning, WalletWithdrawalError, WidgetError } from '@/types';
import { create } from 'zustand';

type LogFn = (event: any) => void;

type LogHandlers = {
    onWidgetError?: (e: WidgetError) => void;
    onBalanceError?: (e: BalanceError) => void;
    onGasFeeError?: (e: GasFeeError) => void;
    onTransactionNotDetected?: (e: WalletWithdrawalError) => void;
    onWalletWithdrawalError?: (e: WalletWithdrawalError) => void;
    onLongTransactionWarning?: (e: OnLongTransactionWarning) => void;
};

export type CallbacksShape = {
    onLogError?: LogHandlers;
};

const defaultHandler: LogFn = (e) => {
    console.log('[layerswap:log]', e?.type, e?.props);
};

type LogState = {
    logger: LogFn;
    callbacks?: CallbacksShape;
    setLogger: (logger?: LogFn) => void;
    setCallbacks: (callbacks?: CallbacksShape) => void;
};

export const useLogStore = create<LogState>((set) => ({
    logger: defaultHandler,
    callbacks: undefined,
    setLogger: (logger) => set({ logger: logger ?? defaultHandler }),
    setCallbacks: (callbacks) => set({ callbacks }),
}));

// Convenient statics for non-React usage:
export const logStore = {
    get: () => useLogStore.getState(),
    setLogger: (logger?: LogFn) => useLogStore.getState().setLogger(logger),
    setCallbacks: (c?: CallbacksShape) => useLogStore.getState().setCallbacks(c),
    defaultHandler,
};
