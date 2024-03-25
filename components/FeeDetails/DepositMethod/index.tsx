import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../shadcn/select";
import { Network } from "../../../Models/Network";

const DepositMethod: FC = () => {
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
        if (!depositMethod) setFieldValue(name, menuItems?.[0].id, true)
    }, [menuItems])

    const handleSelect = useCallback((item: string) => {
        setFieldValue(name, item, true)
    }, [name, depositMethod, menuItems])

    return (
        <div className="relative w-full">
            <div className="flex items-center justify-between w-full">
                <div className="text-secondary-text">
                    Deposit method
                </div>
                <div>
                    {
                        menuItems && (menuItems?.length > 1 ?
                            <Select onValueChange={handleSelect} value={depositMethod} defaultValue={menuItems[0].id}>
                                <SelectTrigger className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {depositMethods?.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                <div className="flex items-center !text-primary-text !font-semibold">
                                                    <div className="mx-1 block">{item.display_name}</div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            :
                            <div className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
                                {depositMethods.find(m => m.id === depositMethod)?.display_name}
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    )
};

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

export default DepositMethod