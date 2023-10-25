import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import useWallet from "../../hooks/useWallet";
import { NetworkType } from "../../Models/CryptoNetwork";
import { useSettingsState } from "../../context/settings";
import KnownInternalNames from "../../lib/knownIds";
import { Layer } from "../../Models/Layer";

const ConnectButton = ({ children, className }: { children: ReactNode, className?: string }) => {
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
            <PopoverTrigger className={className}>
                {children}
            </PopoverTrigger>
            <PopoverContent className='flex items-center justify-around gap-2'>
                {
                    connectors.map((connector, index) => (
                        <button type="button" key={index} className="w-full h-full hover:bg-secondary-600 rounded py-2" onClick={() => { connectWallet(connector.network as Layer & { type: typeof connector.type }), setOpen(false) }}>
                            {connector.name}
                        </button>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}

export default ConnectButton