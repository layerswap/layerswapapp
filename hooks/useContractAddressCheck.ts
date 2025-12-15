import { useEffect } from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressStore } from '@/stores/contractAddressStore';

export const useContractAddressCheck = (
    address?: string,
    sourceNetwork?: Network,
    destinationNetwork?: Network
) => {
    const { 
        checkContractStatus,
        isContractInNetwork, 
        isContractInAnyNetwork,
        isChecking
    } = useContractAddressStore();

    useEffect(() => {
        if (!address || !sourceNetwork || !destinationNetwork) {
            return;
        }

        checkContractStatus(address, sourceNetwork, destinationNetwork);
    }, [address, sourceNetwork?.name, destinationNetwork?.name, checkContractStatus]);

    return { 
        isChecking, 
        checkContractStatus,
        isContractInNetwork,
        isContractInAnyNetwork
    };
};
