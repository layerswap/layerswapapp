import { useFormikContext } from "formik";
import React, { FC, useEffect, useRef } from "react";
import { Network } from "@/Models/Network";
import { useInitialSettings } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { WalletConnectionProvider } from "@/Models/WalletProvider";
import { SwapFormValues } from "../../SwapFormValues";

const depositMethods = [
    {
        id: 'wallet',
        display_name: 'Wallet'
    },
    {
        id: 'deposit_address',
        display_name: 'Deposit address'
    }
]

const DepositMethodComponent: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { depositMethod: defaultDepositMethod, hideDepositMethod } = useInitialSettings()
    const { from, depositMethod, fromExchange, fromAsset } = values
    const { provider } = useWallet(from, 'withdrawal')
    const name = 'depositMethod'

    const menuItems = from && GenerateDepositMethodMenuItems(from, depositMethods, provider)

    const defaultMethod = menuItems?.find(i => i.id === defaultDepositMethod)
    const menuItemsRef = useRef<DepositMethod[] | undefined>()
    menuItemsRef.current = menuItems

    useEffect(() => {
        const first = menuItemsRef.current?.[0]?.id
        if (fromExchange) {
            setFieldValue(name, 'deposit_address', true)
            return
        }
        else if (defaultMethod) {
            setFieldValue(name, defaultMethod?.id, true)
            return
        }
        else if (!(menuItems?.find(i => i.id === depositMethod))) {
            setFieldValue(name, first, true)
            return
        }
    }, [from, fromExchange, fromAsset])

    const hasOptions = Number(menuItems?.length) > 1 && !fromExchange

    if (!hasOptions || (defaultMethod && hideDepositMethod))
        return null

    return (
        <></>
        // <div className="relative w-full mb-1">
        //     <Popover open={showModal} onOpenChange={setShowModal}>
        //         <PopoverTrigger className="font-semibold text-secondary-text text-xs flex items-center space-x-1 p-2">
        //             <span> Transfer via </span> <span>{selectedMethod?.toLowerCase()}</span> <motion.div
        //                 animate={showModal ? "open" : "closed"}
        //                 variants={variants}
        //             >
        //                 <ChevronDown className="w-4 h-4" />
        //             </motion.div>
        //         </PopoverTrigger>
        //         <PopoverContent className='ml-2 mt-1 space-y-1 text-sm p-2 max-w border-none rounded-xl bg-secondary-800 max-w-72 md:max-w-96' align="start">
        //             <DepositMethod
        //                 onselect={handleSelect}
        //                 value="wallet"
        //                 icon={<WalletIcon
        //                     strokeWidth={2} className="w-6 h-6" />}
        //                 description="Connect your wallet and transfer instantly"
        //                 title="Wallet"
        //                 selectedValue={depositMethod}
        //             />
        //             <DepositMethod
        //                 onselect={handleSelect}
        //                 value="deposit_address"
        //                 icon={<AlignLeft strokeWidth={2} className="w-6 h-6" />}
        //                 description="Manually transfer to a Deposit Address generated specifically for you"
        //                 title="Deposit address"
        //                 selectedValue={depositMethod}
        //             />
        //         </PopoverContent>
        //     </Popover>
        // </div>
    )
};

type DespositMethodItemProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    selectedValue: string | undefined;
    value: string;
    onselect: (value: string) => void;
}

const DepositMethod: FC<DespositMethodItemProps> = ({
    icon,
    title,
    description,
    selectedValue,
    value,
    onselect
}) => {
    const selected = selectedValue === value
    return (
        <div className={`p-3 ${selected ? 'text-primary-text bg-secondary-600' : 'text-secondary-text'} flex rounded-lg cursor-pointer hover:bg-secondary-500`} onClick={() => onselect(value)}>
            <div className="grid grid-cols-9 gap-2 md:gap-0 w-full">
                <div>
                    {icon}
                </div>
                <div className=" col-span-8   flex">
                    <div className="w-full">
                        <div className={`font-semibold text-base`}>
                            {title}
                        </div>
                        <div className="text-secondary-text text-xs">
                            {description}
                        </div>
                    </div>

                    {
                        selected &&
                        <div className="flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}


type DepositMethod = {
    id: string,
    display_name: string
}

function GenerateDepositMethodMenuItems(network: Network, depositMethods: DepositMethod[], walletProvider?: WalletConnectionProvider): DepositMethod[] {

    if (!walletProvider) {
        return depositMethods.filter(m => m.id === 'deposit_address')
    }

    return depositMethods.filter(m => network?.deposit_methods?.some(dm => dm === m.id))
}

export default DepositMethodComponent