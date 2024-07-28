import { FC, useCallback, useEffect, useState } from "react";
import { useBalancesState } from "../../../context/balances"
import useWallet from "../../../hooks/useWallet";
import { truncateDecimals } from "../../utils/RoundDecimals";
import AddressWithIcon from "../../Input/Address/AddressPicker/AddressWithIcon";
import { AddressGroup } from "../../Input/Address/AddressPicker";
import useBalance from "../../../hooks/useBalance";
import { RefreshCw } from "lucide-react";


type Props = {
    source_network: any;
    source_token: any;
}

const Component: FC<Props> = (props) => {
    const { source_network, source_token } = props;
    const { balances, isBalanceLoading } = useBalancesState()
    const { getWithdrawalProvider, disconnectWallet } = useWallet()
    const { fetchBalance } = useBalance()
    const [isLoading, setIsloading] = useState(false);

    const provider = source_network && getWithdrawalProvider(source_network)
    const wallet = provider?.getConnectedWallet()

    const walletBalance = wallet && balances[wallet.address]?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    useEffect(() => {
        source_network && source_token && fetchBalance(source_network, source_token);
    }, [source_network, source_token, wallet?.address])

    const handleDisconnect = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!wallet) return
        setIsloading(true);
        if (provider?.reconnectWallet) await provider.reconnectWallet(source_network?.chain_id)
        else await disconnectWallet(wallet.providerName)
        setIsloading(false);
    }, [source_network?.type, disconnectWallet, setIsloading, isLoading])

    return <>
        {
            wallet && source_network &&
            <div className="grid content-end">
                <div className='flex w-full items-center text-sm justify-between'>
                    <span className='ml-1'>Connected walet</span>
                    <div onClick={handleDisconnect} className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200 hover:cursor-pointer">
                        {
                            isLoading ?
                                <RefreshCw className="h-3 w-auto animate-spin" />
                                :
                                <RefreshCw className="h-3 w-auto" />
                        }
                        <p>Switch Wallet</p>
                    </div>
                </div>
                <div className="group/addressItem flex rounded-lg justify-between space-x-3 items-center shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7">
                    <AddressWithIcon addressItem={{ address: wallet.address, group: AddressGroup.ConnectedWallet }} connectedWallet={wallet} network={source_network} />
                    <div>
                        {
                            walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) &&
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    isBalanceLoading ?
                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                                        :
                                        <>
                                            <span>{walletBalanceAmount}</span> <span>{source_token?.symbol}</span>
                                        </>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        }
    </>
}
export default Component;