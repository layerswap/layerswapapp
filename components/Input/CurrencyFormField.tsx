import { Field, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import PopoverSelect from "../Select/Popover/PopoverSelect";
import { FilterCurrencies, GetNetworkCurrency } from "../../helpers/settingsHelper";
import { Currency } from "../../Models/Currency";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByOrder } from "../../lib/sorting";
import { Layer } from "../../Models/Layer";

const CurrencyFormField: FC = () => {
    const {
        values: { to, currency, from },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"

    const { resolveImgSrc, currencies } = useSettingsState();
    const filteredCurrencies = FilterCurrencies(currencies, from, to)
    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies,
        from,
        resolveImgSrc
    )

    useEffect(() => {
        if (!from || !to) {
            setFieldValue(name, null)
            return;
        }

        const currencyIsAvailable = currency && currencyMenuItems.some(c => c?.baseObject.asset === currency?.asset)
        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.[0]

        if (default_currency) {
            setFieldValue(name, default_currency.baseObject)
        }
        else if (currency) {
            setFieldValue(name, null)
        }

    }, [from, to, currencies, currency])

    const value = currencyMenuItems.find(x => x.id == currency?.asset);
    const handleSelect = useCallback((item: SelectMenuItem<Currency>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name])

    return <PopoverSelectWrapper  values={currencyMenuItems} value={value} setValue={handleSelect} />;
};

export function GenerateCurrencyMenuItems(currencies: Currency[], source: Layer, resolveImgSrc: (item: Layer | Currency) => string): SelectMenuItem<Currency>[] {

    return currencies.map(c => {
        const sourceCurrency = GetNetworkCurrency(source, c.asset);
        const displayName = source?.isExchange ? sourceCurrency?.asset : sourceCurrency?.name;
        return {
            baseObject: c,
            id: c.asset,
            //TODO implement getter
            name: displayName,
            order: CurrencySettings.KnownSettings[c.asset]?.Order ?? 5,
            imgSrc: resolveImgSrc && resolveImgSrc(c),
            isAvailable: { value: true, disabledReason: null },
            isDefault: false,
        };
    }).sort(SortingByOrder);
}

export default CurrencyFormField