import { useEffect, useState } from 'react';
import { Network } from '@/Models/Network';
import { useContractAddressStore } from '@/stores/contractAddressStore';
import { NetworkType } from '@/Models/Network';
import resolveChain from '@/lib/resolveChain';
import { createPublicClient, http } from 'viem';

const isContractAddress = async (address: string, network: Network): Promise<boolean> => {
    if (!network || !address) {
        return false;
    }

    if (network.type != NetworkType.EVM) {
        return false;
    }
    
    try {
        const chain = resolveChain(network)
        const publicClient = createPublicClient({
            chain,
            transport: http()
        })
        const bytecode = await publicClient.getCode({
            address: address as `0x${string}`
        });

        return !!bytecode && bytecode !== '0x';
    } catch (error) {
        console.log(error)
        return false;
    }
}

export const useContractAddressCheck = (
    address?: string,
    sourceNetwork?: Network,
    destinationNetwork?: Network
) => {
    const { setContractStatus } = useContractAddressStore();
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (!address || !sourceNetwork || !destinationNetwork) {
            return;
        }

        const checkContractStatus = async () => {
            setIsChecking(true);
            
            try {
                // Check source network
                const sourceStatus = await isContractAddress(address, sourceNetwork);
                setContractStatus(address, sourceNetwork.name, sourceStatus);

                // Check destination network
                const destinationStatus = await isContractAddress(address, destinationNetwork);
                setContractStatus(address, destinationNetwork.name, destinationStatus);
            } catch (error) {
                console.error('Error checking contract status:', error);
            } finally {
                setIsChecking(false);
            }
        };

        checkContractStatus();
    }, [address, sourceNetwork?.name, destinationNetwork?.name, setContractStatus]);

    return { isChecking };
};

