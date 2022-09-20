import { Field, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SortingByOrder } from "../../lib/sorting";
import { Currency } from "../../Models/Currency";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import Select from "./Select";
import { SelectMenuItem } from "./selectMenuItem";

const CurrenciesField: FC = () => {
    const {
        values: { network, currency, exchange, swapType },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"
    const { data } = useSettingsState();

    const currencyIsAvilable = useCallback((c: Currency) => exchange && network && exchange.baseObject.currencies.some(ec => ec.asset === c.asset && ec.status === "active" && (swapType === "offramp" ?
        ec.is_withdrawal_enabled : ec.is_deposit_enabled)) && network.baseObject.currencies.some(nc => nc.asset === c.asset && nc.status === "active" && (swapType === "offramp" ?
            nc.is_deposit_enabled : nc.is_withdrawal_enabled)), [exchange, network, swapType])

    const currencyMenuItems: SelectMenuItem<Currency>[] = network ? data.currencies
        .filter(currencyIsAvilable)
        .map(c => ({
            baseObject: c,
            id: c.id,
            name: c.asset,
            order: exchange?.baseObject?.currencies?.find(ec => ec.asset === c.asset)?.order || 0, //TODO offramp
            imgSrc: c.logo_url,
            isAvailable: true,
            isEnabled: true,
            isDefault: false,
        })).sort(SortingByOrder)
        : []

    useEffect(() => {
        if (!network || !exchange) return;
        const default_currency = data.currencies.find(currencyIsAvilable)

        if (default_currency) {
            const defaultValue: SelectMenuItem<Currency> = {
                baseObject: default_currency,
                id: default_currency.id,
                name: default_currency.asset,
                order: exchange.baseObject.currencies.find(ec => ec.asset === default_currency.asset)?.order || 0,
                imgSrc: default_currency.logo_url,
                isAvailable: true,
                isEnabled: true,
                isDefault: false,
            }
            setFieldValue(name, defaultValue)
        }
        else {
            setFieldValue(name, null)
        }

    }, [network, exchange, data.currencies, data.exchanges])

    return (<>
        <Field disabled={!currencyMenuItems?.length} name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} smallDropdown={true} />
    </>)
};
export default CurrenciesField