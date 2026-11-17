import type { InitialSettings } from '@/Models/InitialSettings';
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { Address } from '@/lib/address/Address';
import { manualTransferAvailable } from './manualTransferAvailable';

export function reversedFunding(previous: SwapFormValues, reversed: SwapFormValues, settings: InitialSettings): Pick<SwapFormValues, 'depositMethod' | 'destination_address'> {
    const keepsManualTransfer = previous.depositMethod === 'deposit_address' && manualTransferAvailable(reversed, settings);
    const address = reversed.destination_address;
    const addressFitsDestination = !address || !reversed.to || Address.isValid(address, reversed.to);
    return {
        depositMethod: keepsManualTransfer ? 'deposit_address' : undefined,
        destination_address: addressFitsDestination ? address : undefined,
    };
}
