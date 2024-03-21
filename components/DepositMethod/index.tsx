import { useFormikContext } from "formik";
import { FC, useCallback } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../shadcn/select";

const DepositMethod: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { to, fromCurrency, toCurrency, from } = values
    const name = 'depositMethod'

    const menuItems = [
        {
            id: 'wallet',
            display_name: 'Wallet'
        },
        {
            id: 'deposit_address',
            display_name: 'Deposit Address'
        }
    ]

    const handleSelect = useCallback((item: string) => {
        setFieldValue(name, item, true)
    }, [name, toCurrency, fromCurrency, from, to])

    return (
        <div className="relative w-full">
            <div className="flex items-center justify-between w-full">
                <div className="text-secondary-text">
                    Deposit method
                </div>
                <div className="">
                    <Select onValueChange={handleSelect} defaultValue={menuItems[0].id}>
                        <SelectTrigger className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {menuItems?.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        <div className="flex items-center !text-primary-text !font-semibold">
                                            <div className="mx-1 block">{item.display_name}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
};

export default DepositMethod