import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { startMaintenanceRecovery } from '../lib/maintenanceRecovery';

export function useMaintenanceRecovery() {
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const recovery = useRef<ReturnType<typeof startMaintenanceRecovery> | null>(null);

    useEffect(() => {
        if (!router.isReady) {
            return;
        }

        const params = new URLSearchParams();
        for (const name of ['appName', 'addressSource']) {
            const value = router.query[name];
            if (typeof value === 'string') {
                params.set(name, value);
            }
        }
        if (router.pathname === '/swap/[swapId]') {
            params.set('scope', 'networks');
        }

        const url = `${router.basePath}/api/settings-health?${params.toString()}`;
        const session = startMaintenanceRecovery(url, () => window.location.reload(), setChecking);
        recovery.current = session;
        return () => {
            session.dispose();
            recovery.current = null;
        };
    }, [router.isReady, router.asPath, router.basePath, router.pathname, router.query]);

    return { checking, retry: () => { void recovery.current?.retry(); } };
}
