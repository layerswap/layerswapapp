import { Field, useFormikContext } from "formik";
import { FC, useEffect } from "react";
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

    const currencyMenuItems: SelectMenuItem<Currency>[] = network ? data.currencies
        .filter(x => x.network_id === network?.baseObject?.id && x?.exchanges?.some(ce => ce.exchange_id === exchange?.baseObject?.id && (swapType === "onramp" || ce.is_off_ramp_enabled)))
        .map(c => ({
            baseObject: c,
            id: c.id,
            name: c.asset,
            order: c.order,
            imgSrc: c.logo_url,
            isAvailable: c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
            isEnabled: c.is_enabled,
            isDefault: c.is_default,
        })).sort(SortingByOrder)
        : []

    useEffect(() => {
        if (!network) return;
        const default_currency = data.currencies.sort((x, y) => Number(y.is_default) - Number(x.is_default)).find(c => c.is_enabled && c.network_id === network.baseObject.id && c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id))

        if (default_currency) {
            const defaultValue: SelectMenuItem<Currency> = {
                baseObject: default_currency,
                id: default_currency.id,
                name: default_currency.asset,
                order: default_currency.order,
                imgSrc: default_currency.logo_url,
                isAvailable: default_currency.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
                isEnabled: default_currency.is_enabled,
                isDefault: default_currency.is_default,
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