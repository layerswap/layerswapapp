import { useCallback, useRef, useState } from 'react';
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect';

/** Selection changes stop future requests. Already-open wallet requests still
 * settle so callers can persist receipts without updating an obsolete view. */
export function useWithdrawalScope(selectionKey: string) {
    const scope = useRef<AbortController | null>(null);
    useClientLayoutEffect(() => {
        scope.current = new AbortController();
        return () => {
            scope.current?.abort();
            scope.current = null;
        };
    }, [selectionKey]);
    return scope;
}

export function useWithdrawalExecution(selectionKey: string, acquireWalletExecution: () => () => void) {
    const scope = useWithdrawalScope(selectionKey);
    const inFlight = useRef(false);
    const [loading, setLoading] = useState(false);

    const begin = useCallback(() => {
        const signal = scope.current?.signal;
        if (!signal || signal.aborted || inFlight.current) {
            return;
        }
        inFlight.current = true;
        const release = acquireWalletExecution();
        setLoading(true);
        let finished = false;

        return {
            signal,
            isCurrent: () => scope.current?.signal === signal && !signal.aborted,
            // A confirmed handoff can release adjustment before optional catchup
            // finishes. Keep the local click guard until the whole call settles.
            release,
            finish: () => {
                if (finished) {
                    return;
                }
                finished = true;
                release();
                inFlight.current = false;
                if (scope.current) {
                    setLoading(false);
                }
            },
        };
    }, [acquireWalletExecution, scope]);

    return { begin, loading, inFlight, scope };
}
