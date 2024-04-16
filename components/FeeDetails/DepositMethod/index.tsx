import { useFormikContext } from "formik";
import React, { FC, useCallback, useEffect } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../shadcn/select";
import { Network } from "../../../Models/Network";
import FeeDetails from "../FeeDetailsComponent";
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/popover";
import WalletIcon from "../../icons/WalletIcon";

const DepositMethodComponent: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { from, depositMethod } = values
    const name = 'depositMethod'

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

    const menuItems = from && GenerateDepositMethodMenuItems(from, depositMethods)

    useEffect(() => {
        if (!depositMethod || !menuItems?.find(i => i.id === depositMethod)) setFieldValue(name, (menuItems?.find(i => i.id === 'wallet')?.id || menuItems?.[0]?.id), true)
    }, [menuItems])

    const handleSelect = useCallback((item: string) => {
        setFieldValue(name, item, true)
    }, [name, depositMethod, menuItems])

    const selectedMethod = menuItems?.find(i => i.id === depositMethod)?.display_name

    return (

        <div className="relative w-full mb-1.5">
            <Popover>
                <PopoverTrigger className="block font-semibold text-secondary-text text-xs">
                    Deposit method <span>{selectedMethod}</span>
                </PopoverTrigger>
                <PopoverContent className='text-sm p-2 bg-secondary-900' align="start">
                    <DepositMethod 
                        icon={<WalletIcon 
                        strokeWidth={2} className="w-4" />} description="Lorem ipsum" title="Wallet" selected={true} 
                    />
                    <DepositMethod icon description="Lorem ipsum " title="Deposit mode" selected={false} />
                </PopoverContent>
            </Popover>
        </div>

    )
};

type DespositMethodItemProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    selected: boolean;
}

const DepositMethod: FC<DespositMethodItemProps> = ({
    icon,
    title,
    description,
    selected
}) => {
    return (
        <div className="p-2 bg-secondary-700 flex">
            <div className="grid grid-cols-8">
                <div className="">
                    {icon}
                </div>
                <div className=" col-span-7 ">
                    <div className="font-semibold text-secondary-text text-xs">
                        {title}
                    </div>
                    <div className="text-secondary-text text-xs">
                        {description}
                    </div>
                </div>
            </div>
            {
                selected &&
                <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
            }
        </div>
    )
}


type DepositMethod = {
    id: string,
    display_name: string
}

function GenerateDepositMethodMenuItems(network: Network, depositMethods: DepositMethod[]): DepositMethod[] {

    return network.deposit_methods.map(m => ({
        id: m,
        display_name: depositMethods.find(dp => dp.id === m)?.display_name!
    }));

}

export default DepositMethodComponent