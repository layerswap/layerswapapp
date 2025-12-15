import React, { useEffect } from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressCheck } from '@/hooks/useContractAddressCheck';


interface Props {
    source_network?: Network;
    destination_network?: Network;
    destination_address?: string;
}

const ContractAddressValidationCache: React.FC<Props> = ({ source_network, destination_network, destination_address }) => {
    const {
        isContractInNetwork,
        isContractInAnyNetwork
    } = useContractAddressCheck(destination_address, source_network, destination_network);

    useEffect(() => {
        if (destination_address && source_network && destination_network && destination_network.type === 'evm') {
            isContractInNetwork(destination_address, destination_network.name);
            isContractInAnyNetwork(destination_address);
        }
    }, [destination_address, source_network?.name, destination_network?.name, isContractInNetwork, isContractInAnyNetwork]);

    return null;
};

export default ContractAddressValidationCache