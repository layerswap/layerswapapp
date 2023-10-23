import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import useWallet from "../../hooks/useWallet";
import { NetworkType } from "../../Models/CryptoNetwork";
import { useSettingsState } from "../../context/settings";
import KnownInternalNames from "../../lib/knownIds";
import { Layer } from "../../Models/Layer";

const ConnectButton = ({ children }: { children: ReactNode }) => {
    const { connectWallet } = useWallet()
    const { layers } = useSettingsState()
    const [open, setOpen] = useState<boolean>()

    const connectors = [
        {
            name: 'EVM',
            type: NetworkType.EVM,
            network: layers.find(l => l.internal_name === KnownInternalNames.Networks.EthereumMainnet)
        },
        {
            name: 'Starknet',
            type: NetworkType.Starknet,
            network: layers.find(l => l.internal_name === KnownInternalNames.Networks.StarkNetMainnet || l.internal_name === KnownInternalNames.Networks.StarkNetGoerli)
        }
    ]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="w-full h-full">
                {children}
            </PopoverTrigger>
            <PopoverContent className='text-sm'>
                {
                    connectors.map((connector, index) => (
                        <button type="button" tabIndex={index} onClick={() => { connectWallet(connector.network as Layer & { type: typeof connector.type }), setOpen(false) }}>
                            {connector.name}
                        </button>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}

export default ConnectButton