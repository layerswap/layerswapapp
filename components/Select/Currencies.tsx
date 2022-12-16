import { Field, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapType } from "../../lib/layerSwapApiClient";
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
    const { discovery: { resource_storage_url }, currencies, exchanges } = useSettingsState();

    const currencyIsAvilable = useCallback((c: Currency) => exchange && network && exchange.baseObject.currencies.some(ec => ec.asset === c.asset) && network.baseObject.currencies.some(nc => nc.asset === c.asset && nc.status === "active" && (swapType === SwapType.OffRamp ?
        nc.is_deposit_enabled : nc.is_withdrawal_enabled)), [exchange, network, swapType])

    const mapCurranceToMenuItem = (c: Currency): SelectMenuItem<Currency> => ({
        baseObject: c,
        id: c.asset,
        name: c.asset,
        order: 0, // TODO implement in settings
        imgSrc: `${resource_storage_url}/layerswap/currencies/${c.asset.toLowerCase()}.png`,
        isAvailable: true,
        isDefault: false,
    })

    const currencyMenuItems: SelectMenuItem<Currency>[] = network ? currencies
        .filter(currencyIsAvilable)
        .map(mapCurranceToMenuItem).sort(SortingByOrder)
        : []

    useEffect(() => {
        if (!network || !exchange) return;
        if (currency && currencyIsAvilable(currency.baseObject)) return

        const default_currency = currencies.filter(currencyIsAvilable)?.map(mapCurranceToMenuItem)?.sort(SortingByOrder)?.[0]

        if (default_currency) {
            setFieldValue(name, default_currency)
        }
        else if (currency) {
            setFieldValue(name, null)
        }

    }, [network, exchange, currencies, exchanges, currency])

    return (<>
        <div tabIndex={0} className="mt-1.5">
            <Field disabled={!currencyMenuItems?.length}  label="Asset" name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
};
export default CurrenciesField