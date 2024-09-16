import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useRef } from "react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

type Props = {
    direction: 'from' | 'to'
}

const Component: FC<Props> = ({ direction }) => {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const walletNetwork = values.fromExchange ? undefined : (direction === "from" ? values.from : values.to)
    const { provider } = useWallet(walletNetwork, 'withdrawal')
    const wallet = provider?.activeWallet
    const wallets = provider?.connectedWallets
    const connectedWalletAddress = provider?.activeWallet?.address
    const source_addsress = values.source_wallet?.address
    const previouslyAutofilledAddress = useRef<string | undefined>(undefined)

    useEffect(() => {
        if ((!source_addsress || (previouslyAutofilledAddress.current && previouslyAutofilledAddress.current != connectedWalletAddress)) && wallet) {
            setFieldValue('source_wallet', wallet)
        }
    }, [wallet, source_addsress])

    const handleWalletChange = () => {

        

    }

    return <>
        {
            wallet?.address &&
            <div className=" rounded-lg bg-secondary-700 pl-2 flex items-center space-x-2 text-sm leading-4">
                <div>0.000395269</div>
                <div onClick={handleWalletChange} className="rounded-lg bg-secondary-500 flex space-x-1 items-center py-0.5 pl-2 pr-1 cursor-pointer">
                    <div className="inline-flex items-center relative p-0.5">
                        <wallet.icon className="w-5 h-5" />
                    </div>
                    <div className="text-primary-text">
                        {shortenAddress(wallet?.address)}
                    </div>
                    <div className="w-5 h-5 items-center flex">
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </div>
                </div>
            </div>
        }
    </>
}
export default Component