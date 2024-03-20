import { useFormikContext } from "formik";
import { FC, useCallback } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";

const DepositMethod: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange, depositMethod } = values
    const name = 'depositMethod'

    const menuItems = [
        {
            "id": "wallet",
            "name": "Wallet",
            "order": 1,
            "imgSrc": "",
            "isAvailable": {
                "disabledReason": null,
                "value": true
            },
            "details": ""
        },
        {
            "id": "deposit_address",
            "name": "Deposit address",
            "order": 2,
            "imgSrc": "",
            "isAvailable": {
                "disabledReason": null,
                "value": true
            },
            "details": ""
        }
    ]

    const value = menuItems?.find(x => x.id == depositMethod?.id);

    const handleSelect = useCallback((item: SelectMenuItem<string>) => {
        setFieldValue(name, item, true)
    }, [name, toCurrency, fromCurrency, from, to])

    return (
        <div className="relative w-full">
            <div className="flex items-center justify-between w-full">
                <div className="text-secondary-text">
                    Deposit method
                </div>
                <div>
                    <PopoverSelectWrapper
                        placeholder="Asset"
                        values={menuItems}
                        value={value}
                        setValue={handleSelect}
                    />
                </div>
            </div>
        </div>
    )
};

export default DepositMethod