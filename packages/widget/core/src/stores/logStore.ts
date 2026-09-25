import { createSafeErrorLogger, defaultErrorLogger, type ErrorLogger } from '@layerswap/widget-types';
import { createStore } from 'zustand';

export type { ErrorLogger } from '@layerswap/widget-types';

type LogState = {
    logger: ErrorLogger;
    registerLogger: (handler?: ErrorLogger) => () => void;
};

type LoggerRegistration = {
    token: symbol;
    logger: ErrorLogger;
};

export const createLogStore = () => {
    // Provider effects can briefly overlap during replacement or Strict Mode checks.
    // A stack lets any registration clean itself up without clearing a newer owner.
    const registrations: LoggerRegistration[] = [];

    return createStore<LogState>()((set) => ({
        logger: defaultErrorLogger,
        registerLogger: (handler) => {
            const registration: LoggerRegistration = {
                token: Symbol('error-logger-registration'),
                logger: handler ? createSafeErrorLogger(handler) : defaultErrorLogger,
            }

            registrations.push(registration)
            set({ logger: registration.logger })

            let isRegistered = true
            return () => {
                if (!isRegistered) return
                isRegistered = false

                const registrationIndex = registrations.findIndex(({ token }) => token === registration.token)
                if (registrationIndex === -1) return

                const wasActive = registrationIndex === registrations.length - 1
                registrations.splice(registrationIndex, 1)

                if (wasActive) {
                    const previousRegistration = registrations[registrations.length - 1]
                    set({ logger: previousRegistration?.logger ?? defaultErrorLogger })
                }
            }
        },
    }))
}

export const logStore = createLogStore()
