const INITIAL_RETRY_DELAY = 15_000;
const MAX_RETRY_DELAY = 60_000;
const REQUEST_TIMEOUT = 10_000;

export function startMaintenanceRecovery(
    url: string,
    onRecovered: () => void,
    onCheckingChange: (checking: boolean) => void,
) {
    let disposed = false;
    let recovered = false;
    let retryDelay = INITIAL_RETRY_DELAY;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;

    const scheduleRetry = () => {
        // Spread retries across visitors instead of hitting a recovering backend
        // with every maintenance tab at once.
        const delay = retryDelay * (1 + Math.random() * 0.2);
        retryTimer = setTimeout(() => { void retry(); }, delay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
    };

    const retry = async () => {
        if (disposed || recovered || request) {
            return;
        }

        clearTimeout(retryTimer);
        if (document.visibilityState === 'hidden' || !navigator.onLine) {
            scheduleRetry();
            return;
        }

        const controller = new AbortController();
        request = controller;
        requestTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        onCheckingChange(true);
        try {
            const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
            // Only the readiness endpoint's empty 204 means success. An HTML
            // error/login page with status 200 must not trigger a reload loop.
            if (!disposed && response.status === 204) {
                recovered = true;
                onRecovered();
            }
        } catch {
            // Network errors and timeouts leave the maintenance screen visible.
        } finally {
            clearTimeout(requestTimer);
            request = undefined;
            if (!disposed) {
                onCheckingChange(false);
                if (!recovered) {
                    scheduleRetry();
                }
            }
        }
    };

    const resume = () => { void retry(); };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    void retry();

    return {
        retry,
        dispose() {
            disposed = true;
            clearTimeout(retryTimer);
            clearTimeout(requestTimer);
            request?.abort();
            window.removeEventListener('online', resume);
            document.removeEventListener('visibilitychange', resume);
        },
    };
}
