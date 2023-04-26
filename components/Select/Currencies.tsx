import { Field, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import CurrencySettings from "../../lib/CurrencySettings";
import { SwapType } from "../../lib/layerSwapApiClient";
import { SortingByOrder } from "../../lib/sorting";
import { Currency } from "../../Models/Currency";
import { Exchange } from "../../Models/Exchange";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import Select, { DisabledReason } from "./Select";
import { SelectMenuItem } from "./selectMenuItem";
import { FilterCurrencies, GetDefaultNetwork } from "../../helpers/settingsHelper";
import { GetNetworkCurrency } from "../../helpers/settingsHelper";
import { GenerateCurrencyMenuItems } from "../utils/generateMenuItems";

const CurrenciesField: FC = () => {
    const {
        values: { to, currency, from },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"
    const { discovery: { resource_storage_url }, currencies } = useSettingsState();
    const source = from?.baseObject
    const destination = to?.baseObject


    const currencyMenuItems: SelectMenuItem<Currency>[] = GenerateCurrencyMenuItems({
        currencies,
        source,
        destination,
        resource_storage_url
    })

    useEffect(() => {
        if (!from || !to) {
            setFieldValue(name, null)
            return;
        }
        
        const currencyIsAvailable = currency && currencyMenuItems.some(c=>c.baseObject?.asset === currency.baseObject?.asset)
        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.[0]

        if (default_currency) {
            setFieldValue(name, default_currency)
        }
        else if (currency) {
            setFieldValue(name, null)
        }

    }, [source, destination, currencies, currency])

    
    return (<>
        <Field disabled={!currencyMenuItems?.length} name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} smallDropdown={true} />
    </>)
};
export default CurrenciesField