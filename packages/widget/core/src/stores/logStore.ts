import { type ErrorEventType } from '@layerswap/widget-types';
import { createStore } from 'zustand';

const defaultHandler = (error: ErrorEventType) => {
    console.log('[layerswap:log]', error)
}

export type ErrorLogger = (error: ErrorEventType) => void;

type LogState = {
    logger: ErrorLogger;
    registerLogger: (handler?: ErrorLogger) => () => void;
};

type LoggerRegistration = {
    token: symbol;
    logger: ErrorLogger;
};

export const reportErrorLoggerFailure = (event: ErrorEventType, error: unknown) => {
    console.error('[layerswap/widget] onError callback failed; falling back to console logging.', error)
    defaultHandler(event)
}

const createSafeLogger = (handler: ErrorLogger): ErrorLogger => {
    let isHandlingError = false;

    return (event) => {
        if (isHandlingError) {
            reportErrorLoggerFailure(event, new Error('Recursive onError callback invocation blocked'))
            return
        }

        isHandlingError = true
        try {
            handler(event)
        }
        catch (error) {
            reportErrorLoggerFailure(event, error)
        }
        finally {
            isHandlingError = false
        }
    }
}

export const createLogStore = () => {
    // Provider effects can briefly overlap during replacement or Strict Mode checks.
    // A stack lets any registration clean itself up without clearing a newer owner.
    const registrations: LoggerRegistration[] = [];

    return createStore<LogState>()((set) => ({
        logger: defaultHandler,
        registerLogger: (handler) => {
            const registration: LoggerRegistration = {
                token: Symbol('error-logger-registration'),
                logger: handler ? createSafeLogger(handler) : defaultHandler,
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
                    set({ logger: previousRegistration?.logger ?? defaultHandler })
                }
            }
        },
    }))
}

export const logStore = createLogStore()
