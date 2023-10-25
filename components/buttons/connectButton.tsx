import { ReactNode, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import useWallet from "../../hooks/useWallet";
import { NetworkType } from "../../Models/CryptoNetwork";
import { useSettingsState } from "../../context/settings";
import KnownInternalNames from "../../lib/knownIds";
import { Layer } from "../../Models/Layer";

const ConnectButton = ({ children, className, onClose }: { children: ReactNode, className?: string, onClose?: () => void }) => {
    const { connectWallet, wallets } = useWallet()
    const { layers } = useSettingsState()
    const [open, setOpen] = useState<boolean>()

    const knownConnectors = [
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
    const filteredConnectors = knownConnectors.filter(c => c.network && !wallets.map(w => w.network.type).includes(c.network.type))

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger disabled={filteredConnectors.length == 0} className={`${className} disabled:opacity-50 disabled:cursor-not-allowed `}>
                {children}
            </PopoverTrigger>
            <PopoverContent className='flex items-center justify-around gap-2 w-fit'>
                {
                    filteredConnectors.map((connector, index) => (
                        <button type="button" key={index} className="w-full h-full hover:bg-secondary-600 rounded py-2 px-3" onClick={() => { connectWallet(connector.network as Layer & { type: typeof connector.type }); setOpen(false); onClose && onClose() }}>
                            {connector.name}
                        </button>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}

export default ConnectButton