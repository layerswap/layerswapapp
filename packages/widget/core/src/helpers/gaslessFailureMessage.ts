import type { GaslessAuthorizationStatus } from '@/lib/apiClients/layerSwapApiClient';
export function gaslessFailureMessage(
    status: GaslessAuthorizationStatus | undefined,
): string {
    switch (status) {
        case 'expired':
            return 'The deposit authorization expired before it was broadcast.';
        case 'insufficient':
            return 'Your balance is insufficient to complete this deposit.';
        case 'rejected':
            return 'The deposit was rejected.';
        default:
            return 'The gasless deposit could not be completed.';
    }
}
