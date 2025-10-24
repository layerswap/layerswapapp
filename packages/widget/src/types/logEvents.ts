export type ExceptionEvent = {
    type: '$exception';
    props: {
        name: string;
        message: string;
        $exception_type: string;
        stack?: string;
        cause?: any;
        where?: string;
        severity?: 'error' | 'warning' | 'info';
    };
};

export type BalanceFetchErrorEvent = {
    type: 'balance_fetch_error';
    props: {
        where: string;
        network: string;
        $exception_type: 'Balance Fetch Error';
        token?: string;
        message: string;
        cause?: any;
        timeoutError?: boolean;
    };
};

export type PageViewEvent = { type: 'pageview'; props: { path: string } };
export type SwapInitiatedEvent = { type: 'SwapInitiated'; props: { swapId?: string | null; path?: string, name?: string } };
export type SwapFailedEvent = { type: 'SwapFailed'; props: { swapId?: string | null; path?: string, severity?: 'error' | 'warning' | 'info' } };
export type NotFoundEvent = { type: '404'; props: { path?: string, severity?: 'error' | 'warning' | 'info' } };

export type LogEvent =
    | ExceptionEvent
    | BalanceFetchErrorEvent
    | PageViewEvent
    | SwapInitiatedEvent
    | SwapFailedEvent
    | NotFoundEvent;