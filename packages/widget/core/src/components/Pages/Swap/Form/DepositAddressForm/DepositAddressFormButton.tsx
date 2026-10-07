import { FC } from 'react';
import { useCopyClipboard } from '@layerswap/ui-kit';
import { SwapFormValues } from '../SwapFormValues';
import {
    DepositAddressFormButtonView,
    type DepositAddressFormButtonViewProps,
} from './DepositAddressFormButtonView';

type Props = Omit<
    DepositAddressFormButtonViewProps,
    'waitingForAddress' | 'copied' | 'onCopy'
> & { values: SwapFormValues };
const DepositAddressFormButton: FC<Props> = ({ values, ...props }) => {
    const [copied, copy] = useCopyClipboard();
    return (
        <DepositAddressFormButtonView
            {...props}
            waitingForAddress={!values?.destination_address}
            copied={copied}
            onCopy={() => {
                if (props.depositAddress) copy(props.depositAddress);
            }}
        />
    );
};

export default DepositAddressFormButton;
