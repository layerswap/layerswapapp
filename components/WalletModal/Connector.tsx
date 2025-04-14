import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useState } from "react";
import { WalletModalConnector } from ".";
import { InternalConnector } from "../../Models/WalletProvider";
import { Loader } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";

type Connector = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    connector: InternalConnector,
    connectingConnector?: WalletModalConnector
    isRecent?: boolean
    onClick: () => void
}

const Connector: FC<Connector> = ({ connector, connectingConnector, onClick, isRecent, ...props }) => {
    const connectorName = connector?.name
    const connectorId = connector?.id

    const Icon = resolveWalletConnectorIcon({ connector: connectorId, iconUrl: connector.icon })
    const isLoading = connectingConnector?.name === connectorName

    return (
        <>
            <button
                type="button"
                disabled={!!connectingConnector}
                className="w-full h-fit flex items-center justify-between bg-secondary-700 hover:bg-secondary-500 transition-colors duration-200 rounded-xl p-3"
                onClick={onClick}
                {...props}
            >
                <div className="grid grid-cols-3 gap-3 items-center font-medium w-full">
                    <Icon className="w-9 sm:w-11 h-auto p-0.5 rounded-[10px] bg-secondary-800" />
                    <div className='flex flex-col items-start justify-center col-start-2 col-span-3 h-[40px]'>

                        <p className='text-base text-left truncate w-full'>{connectorName}</p>
                        {
                            connector.type === 'injected' && !isRecent &&
                            <p className='text-xs text-secondary-text font-medium'>Installed</p>
                        }
                        {
                            isRecent &&
                            <p className='text-xs text-primary-text font-semibold bg-primary-700 px-1 py-0.5 rounded-md'>Recent</p>
                        }
                    </div>
                    {
                        isLoading &&
                        <div className='absolute right-0 bg-secondary-800 rounded-lg p-1'>
                            <Loader className='h-4 w-4 animate-spin' />
                        </div>
                    }
                </div>
            </button>
        </>
    )
}

export default Connector