import { useFormikContext } from 'formik';
import RefundAddressPicker from '@/components/Input/Address/RefundAddressPicker';
import RefundAddressSummary from '@/components/Input/Address/RefundAddressSummary';
import { useValidationContext } from '@/context/validationContext';
import { manualRefundAddress } from '@/helpers/refundAddress';
import type { SwapFormValues } from './SwapFormValues';

export default function RefundAddressField({ showSelected = false }: { showSelected?: boolean }) {
    const { values } = useFormikContext<SwapFormValues>();
    const { showRefundAddress } = useValidationContext();
    const source = values.from;
    const address = manualRefundAddress(values);
    // Dedicated deposit forms have no amount input, but an inherited recipient
    // must still be visible and editable before the user sends funds.
    if (!source || (!showRefundAddress && !(showSelected && address))) return null;

    return <RefundAddressPicker>
        {open => <RefundAddressSummary network={source} address={address} onEdit={open} className="mt-2" />}
    </RefundAddressPicker>;
}
