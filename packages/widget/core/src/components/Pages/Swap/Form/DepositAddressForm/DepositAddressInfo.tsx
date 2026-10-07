import { FC } from 'react';
import { useCopyClipboard } from '@layerswap/ui-kit';
import { Network, Token } from '@layerswap/widget-types';
import DepositQuoteDetails from './DepositQuoteDetails';
import { DepositAddressInfoView } from './DepositAddressInfoView';

type DepositAddressInfoProps = {
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    depositAddress: string | undefined;
    isCreatingSwap: boolean;
};

const DepositAddressInfo: FC<DepositAddressInfoProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    depositAddress,
    isCreatingSwap,
}) => {
    const [copied, copy] = useCopyClipboard();

    const handleCopy = () => {
        if (depositAddress) copy(depositAddress);
    };

    return (
        <DepositAddressInfoView
            sourceNetwork={sourceNetwork}
            depositAddress={depositAddress}
            isCreatingSwap={isCreatingSwap}
            copied={copied}
            onCopy={handleCopy}
            quoteDetails={
                <DepositQuoteDetails
                    sourceNetwork={sourceNetwork}
                    sourceToken={sourceToken}
                    destinationNetwork={destinationNetwork}
                    destinationToken={destinationToken}
                    destinationAddress={destinationAddress}
                    refuel={refuel}
                    isCreatingSwap={isCreatingSwap}
                />
            }
        />
    );
};

export default DepositAddressInfo;
