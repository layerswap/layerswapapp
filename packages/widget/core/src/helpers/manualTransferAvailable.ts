import type { InitialSettings } from '@/Models/InitialSettings';
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';

export function manualTransferAvailable(values: SwapFormValues, settings: InitialSettings): boolean {
    if (!values.from?.deposit_methods?.includes('deposit_address') || values.fromExchange) {
        return false;
    }
    if (settings.hideDepositMethod && settings.depositMethod === 'wallet') {
        return false;
    }

    const sameAccountNetwork = settings.sameAccountNetwork?.toLowerCase();
    const requiresSameAccount = sameAccountNetwork
        && [values.from.name, values.to?.name].some(name => name?.toLowerCase() === sameAccountNetwork);
    if (requiresSameAccount) {
        return false;
    }

    return true;
}
