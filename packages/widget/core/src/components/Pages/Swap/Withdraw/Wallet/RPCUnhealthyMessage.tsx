import { useCopyClipboard } from '@layerswap/ui-kit';
import { KnownInternalNames } from '@layerswap/utils';
import {
    AddEthereumChainParams,
    Network,
    SuggestRpcResult,
} from '@layerswap/widget-types';
import { FC, useEffect, useState } from 'react';
import { RPCUnhealthyView } from '../Presentation/RPCUnhealthyView';

const HEALTH_CHECK_INTERVAL = 1500; // 1.5 seconds

type Props = {
    network: Network;
    suggestRpcForCurrentChain: (
        rpcUrl: string,
        chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>,
    ) => Promise<SuggestRpcResult>;
    isSuggestingRpc: boolean;
    checkManually: () => Promise<void>;
};

const RPCUnhealthyMessage: FC<Props> = ({
    network,
    suggestRpcForCurrentChain,
    isSuggestingRpc,
    checkManually,
}) => {
    const [rpcAddStatus, setRpcAddStatus] = useState<
        'idle' | 'success' | 'error'
    >('idle');

    // Poll health check while unhealthy
    useEffect(() => {
        const interval = setInterval(() => {
            checkManually();
        }, HEALTH_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [checkManually]);

    const handleAddRpc = async () => {
        setRpcAddStatus('idle');
        const isTempo =
            network.name === KnownInternalNames.Networks.TempoMainnet ||
            network.name === KnownInternalNames.Networks.TempoTestnet;
        try {
            const result = await suggestRpcForCurrentChain(network.node_url, {
                chainName: network.display_name,
                // Tempo has no native token; USD with 18 decimals is wallet compatibility metadata.
                nativeCurrency: isTempo
                    ? { name: 'USD', symbol: 'USD', decimals: 18 }
                    : {
                          name: network.display_name,
                          symbol: network.token?.asset,
                          decimals: network.token?.decimals,
                      },
            });
            setRpcAddStatus(result.success ? 'success' : 'error');
        } catch {
            setRpcAddStatus('error');
        }
    };

    const [isCopied, setCopied] = useCopyClipboard(2000);
    return (
        <RPCUnhealthyView
            RPCUrl={network.node_url}
            isSuggestingRpc={isSuggestingRpc}
            rpcAddStatus={rpcAddStatus}
            isCopied={isCopied}
            onCopy={() => setCopied(network.node_url)}
            handleAddRpc={handleAddRpc}
        />
    );
};
export default RPCUnhealthyMessage;
