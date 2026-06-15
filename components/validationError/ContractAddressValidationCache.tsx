import React, { useEffect } from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressStore } from '@/stores/contractAddressStore';
import { useSelectedAccount } from '@/context/swapAccounts';


interface Props {
    source_network?: Network;
    destination_network?: Network;
    address?: string;
}

const ContractAddressValidationCache: React.FC<Props> = ({ source_network, destination_network, address }) => {
    const {
        isContractInNetwork,
    } = useContractAddressStore();

    useEffect(() => {
        //perform check for source network
        if (address && source_network && source_network.type === 'evm') {
            isContractInNetwork(address, source_network.name);
        }
    }, [address, source_network?.name, isContractInNetwork]);

    useEffect(() => {
        //perform check for destination network
        if (address && destination_network && destination_network.type === 'evm') {
            isContractInNetwork(address, destination_network.name);
        }
    }, [address, destination_network?.name, isContractInNetwork]);

    return null;
};

export const ContractSourceAddressValidationCache: React.FC<Props> = ({ source_network, destination_network }) => {
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    
    return <ContractAddressValidationCache
        source_network={source_network}
        destination_network={destination_network}
        address={selectedSourceAccount?.address}
    />
}

export default ContractAddressValidationCache