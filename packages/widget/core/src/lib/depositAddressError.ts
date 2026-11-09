import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient';

export const DEPOSIT_ADDRESS_ERROR_TITLE = "Couldn't generate deposit address";
export const DEPOSIT_ADDRESS_ERROR_MESSAGE = 'No deposit address was returned. Please try again.';

/** Undefined actions without an error are still loading. Usable cached
 * instructions survive a failed background refresh. */
export function getDepositAddressError(address: string | undefined, actions: DepositAction[] | undefined, error?: string): string | undefined {
    if (address) {
        return undefined;
    }
    return error || (actions !== undefined ? DEPOSIT_ADDRESS_ERROR_MESSAGE : undefined);
}
