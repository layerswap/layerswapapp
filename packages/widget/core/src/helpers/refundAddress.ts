import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { Address } from '@/lib/address/Address';

export function refundAddressRequestKey(values: SwapFormValues): string {
    return JSON.stringify([
        values.depositMethod, values.from?.name, values.fromAsset?.symbol,
        values.fromExchange?.name, values.to?.name, values.toAsset?.symbol,
        values.toExchange?.name, values.destination_address, values.amount, !!values.refuel,
    ]);
}

export function hasValidRefundAmount(values: SwapFormValues, min?: number, max?: number): boolean {
    const amount = Number(values.amount);
    return !!values.amount && /^[0-9]*\.?[0-9]*$/.test(values.amount)
        && Number.isFinite(amount) && amount > 0
        && (min === undefined || amount >= min)
        && (max === undefined || amount <= max);
}

export function manualRefundAddress(values: SwapFormValues): string | undefined {
    const address = values.refund_address?.trim();
    return values.depositMethod === 'deposit_address'
        && values.from?.name === values.refundAddressNetwork
        && address && Address.isValid(address, values.from)
        ? address : undefined;
}

export function refundAddressValidation(values: SwapFormValues) {
    if (values.depositMethod !== 'deposit_address') return undefined;
    if (!values.refundAddressRequired && !values.refund_address) return undefined;
    if (!values.refund_address || values.refundAddressNetwork !== values.from?.name) {
        return { code: 'REFUND_ADDRESS_MISSING', message: 'Enter a refund address' };
    }
    if (!manualRefundAddress(values)) {
        return { code: 'INVALID_REFUND_ADDRESS', message: `Enter a valid ${values.from?.display_name} refund address` };
    }
    return undefined;
}

export function requireRefundAddress(current: SwapFormValues, submitted: SwapFormValues): SwapFormValues {
    const requiredFor = refundAddressRequestKey(submitted);
    if (refundAddressRequestKey(current) !== requiredFor) return current;
    return {
        ...current,
        refundAddressRequired: true,
        refundAddressNetwork: submitted.from?.name,
        refundAddressRequiredFor: requiredFor,
    };
}
