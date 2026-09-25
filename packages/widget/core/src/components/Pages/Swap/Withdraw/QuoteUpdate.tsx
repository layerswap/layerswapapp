import { wantsFrontendSwap } from '@/helpers/swapFlow';
import { useAsyncModal } from '@/context/asyncModal';
import { getLimits, validDestinationAddress } from '@/hooks/useFee';
import { SwapFormValues } from '../Form/SwapFormValues';
import { QuoteUpdated } from './Presentation/QuoteUpdatedView';
export { QuoteUpdated } from './Presentation/QuoteUpdatedView';

/**
 * Unified handler to fetch limits, detect quote/limit changes, confirm with user, and adjust amount.
 */
export async function handleLimitsUpdate(params: {
    swapValues: SwapFormValues;
    network?: { display_name: string };
    token?: { asset: string };
    getConfirmation: ReturnType<typeof useAsyncModal>['getConfirmation'];
}): Promise<void> {
    const { swapValues, network, token } = params;

    const { minAllowedAmount, maxAllowedAmount } = await getLimits({
        sourceNetwork: swapValues.from?.name,
        sourceToken: swapValues.fromAsset?.symbol,
        destinationNetwork: swapValues.to?.name,
        destinationToken: swapValues.toAsset?.symbol,
        useDepositAddress: swapValues.depositMethod == 'deposit_address',
        useFrontendSwap: wantsFrontendSwap({
            depositMethod: swapValues.depositMethod,
            sourceNetwork: swapValues.from?.name,
            destinationNetwork: swapValues.to?.name,
        }),
        refuel: params.swapValues.refuel,
        destinationAddress: validDestinationAddress(
            swapValues.destination_address,
            swapValues.to,
        ),
    });

    const requestedAmount = parseFloat(swapValues.amount || '0');

    const belowMin =
        minAllowedAmount !== undefined && requestedAmount < minAllowedAmount;
    const aboveMax =
        maxAllowedAmount !== undefined && requestedAmount > maxAllowedAmount;
    const needsLimitConfirm = belowMin || aboveMax;

    if (!needsLimitConfirm) {
        return;
    }

    const newAmount = needsLimitConfirm
        ? belowMin
            ? minAllowedAmount!
            : maxAllowedAmount!
        : requestedAmount;

    const confirmed = await params.getConfirmation({
        content: (
            <QuoteUpdated
                minAllowedAmount={minAllowedAmount}
                maxAllowedAmount={maxAllowedAmount}
                isBelowMin={belowMin}
                network={network?.display_name}
                token={token?.asset}
            />
        ),
        submitText: 'Continue',
        dismissText: 'Cancel',
    });

    if (!confirmed) {
        throw new Error('User cancelled the operation.');
    }

    if (needsLimitConfirm) {
        swapValues.amount = newAmount.toString();
    }
}
