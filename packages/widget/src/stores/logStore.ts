import { ErrorEventType } from '@/types';
import { createStore, useStore } from 'zustand';

const defaultHandler = (error: ErrorEventType) => {
    console.log('[layerswap:log]', error)
}

type LogState = {
    logger: (error: ErrorEventType) => void;
    setLogger: (hadnler: (error: ErrorEventType) => void) => void;
};

const createLogStore = () => {
    return createStore<LogState>()((set) => ({
        logger: defaultHandler,
        setLogger: (handler) =>
            set({ logger: handler })
    }))
}

export const logStore = createLogStore()