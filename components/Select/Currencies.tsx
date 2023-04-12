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

const CurrenciesField: FC = () => {
    const {
        values: { to, currency, from, swapType },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"
    const { discovery: { resource_storage_url }, currencies, exchanges } = useSettingsState();

    const currencyIsAvilable = useCallback((c: Currency) => from
        && to
        && from?.baseObject.currencies.some(fc =>
            fc.asset === c.asset
            && (fc.status === "active" || fc.status === "insufficient_liquidity"))
        && to.baseObject.currencies.some(tc =>
            tc.asset === c.asset && (tc.status === "active" || tc.status === "insufficient_liquidity"))
        && !(swapType === SwapType.OffRamp && (to as SelectMenuItem<Exchange>).baseObject.currencies.filter(ec => c.asset === ec.asset && ec.is_default).some(tc => tc.network === from.baseObject.internal_name))
        && !(swapType === SwapType.OnRamp && (from as SelectMenuItem<Exchange>).baseObject.currencies.filter(ec => c.asset === ec.asset && ec.is_default).some(fc => fc.network === to.baseObject.internal_name))
        , [from, to, swapType])

    const currencyDisabledReason = (currency: Currency) => {
        if (!(from && to && from?.baseObject.currencies.find(fc => fc.asset === currency.asset).is_deposit_enabled && to.baseObject.currencies.find(tc => tc.asset === currency.asset).is_withdrawal_enabled)) return { value: false, disabledReason: DisabledReason.InsufficientLiquidity }
        else return { value: true, disabledReason: null }
    }

    const currencyDisplayName = (c: Currency) => {
        return swapType === SwapType.OnRamp ? from?.baseObject?.currencies?.find(currency => currency?.asset === c?.asset)?.asset : from?.baseObject?.currencies?.find(currency => currency?.asset === c?.asset)?.name 
    }

    const mapCurranceToMenuItem = (c: Currency): SelectMenuItem<Currency> => ({
        baseObject: c,
        id: c.asset,
        name: currencyDisplayName(c),
        order: CurrencySettings.KnownSettings[c.asset]?.Order ?? 5,
        imgSrc: `${resource_storage_url}/layerswap/currencies/${currencyDisplayName(c).toLowerCase()}.png`,
        isAvailable: currencyDisabledReason(c),
        isDefault: false,
    })

    const currencyMenuItems: SelectMenuItem<Currency>[] = (from && to) ? currencies
        .filter(currencyIsAvilable)
        .map(mapCurranceToMenuItem).sort(SortingByOrder)
        : []

    useEffect(() => {
        if (!from || !to) {
            setFieldValue(name, null)
            return;
        }
        if (currency && currencyIsAvilable(currency.baseObject)) return

        const default_currency = currencies.filter(currencyIsAvilable)?.map(mapCurranceToMenuItem)?.sort(SortingByOrder)?.[0]

        if (default_currency) {
            setFieldValue(name, default_currency)
        }
        else if (currency) {
            setFieldValue(name, null)
        }

    }, [from, to, currencies, exchanges, currency])

    return (<>
        <Field disabled={!currencyMenuItems?.length} name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} smallDropdown={true} />
    </>)
};
export default CurrenciesField