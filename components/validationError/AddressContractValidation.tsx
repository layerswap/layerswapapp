import React from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressStore } from '@/stores/contractAddressStore';
import { useContractAddressCheck } from '@/hooks/useContractAddressCheck';
import { ErrorDisplay } from './ErrorDisplay';
import { ICON_CLASSES_WARNING } from './constants';
import InfoIcon from "@/components/icons/InfoIcon";

interface AddressContractValidationProps {
    source_network? : Network;
    destination_network? : Network;
    destination_address?: string;
}

const ContractAddressValidation: React.FC<AddressContractValidationProps> = ({ source_network, destination_network, destination_address }) => {
    const { 
        isContractInNetwork, 
        isContractInAnyNetwork
    } = useContractAddressStore();
    
    const { isChecking } = useContractAddressCheck(destination_address, source_network, destination_network);

    if (!destination_address || !destination_network) {
        return null;
    }

    const isContractInDestination = isContractInNetwork(destination_address, destination_network.name);
    const isContractAnywhere = isContractInAnyNetwork(destination_address);

    if (isChecking) {
        return null;
    }

    if (isContractAnywhere && !isContractInDestination) {
        return (
            <ErrorDisplay
                details={{
                    title: "Address is not a contract",
                    type: 'warning',
                    icon: <InfoIcon className={ICON_CLASSES_WARNING} />
                }}
                message={`This address is a contract address in ${destination_network.display_name} but not supported as a destination address.`}
            />
        );
    }

    return null;
};

export default ContractAddressValidation;