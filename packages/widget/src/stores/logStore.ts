import { BalanceError, GasFeeError, OnLongTransactionWarning, WalletWithdrawalError, WidgetError } from '@/types';
import { createStore, useStore } from 'zustand';

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

type LogState = {
    logger: LogFn;
    callbacks?: CallbacksShape;
    setLogger: (logger?: LogFn) => void;
    setCallbacks: (callbacks?: CallbacksShape) => void;
};

const createLogStore = (init?: Partial<Pick<LogState, 'logger' | 'callbacks'>>) => {
    const DEFAULTS: Pick<LogState, 'logger' | 'callbacks'> = {
        logger: (e) => {
            console.log('[layerswap:log]', e?.type, e?.props)
        },
        callbacks: undefined,
    }

    return createStore<LogState>()((set) => ({
        ...DEFAULTS,
        ...init,
        setLogger: (logger) =>
            set({ logger: logger ?? DEFAULTS.logger }),
        setCallbacks: (callbacks) =>
            set({ callbacks }),
    }))
}

export const logStore = createLogStore()
