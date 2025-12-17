import React, { useEffect } from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressStore } from '@/stores/contractAddressStore';


interface Props {
    source_network?: Network;
    destination_network?: Network;
    destination_address?: string;
}

const ContractAddressValidationCache: React.FC<Props> = ({ source_network, destination_network, destination_address }) => {
    const {
        isContractInNetwork,
    } = useContractAddressStore();

    useEffect(() => {
        //perform check for source network
        if (destination_address && source_network && source_network.type === 'evm') {
            isContractInNetwork(destination_address, source_network.name);
        }
    }, [destination_address, source_network?.name, isContractInNetwork]);

    useEffect(() => {
        //perform check for destination network
        if (destination_address && destination_network && destination_network.type === 'evm') {
            isContractInNetwork(destination_address, destination_network.name);
        }
    }, [destination_address, destination_network?.name, isContractInNetwork]);

    return null;
};

export default ContractAddressValidationCache