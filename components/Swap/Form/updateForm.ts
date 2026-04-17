import { SwapFormValues, SwapValuesRoute } from "@/components/DTOs/SwapFormValues";
import { Exchange } from "@/Models/Exchange";
import { resolvePersistantQueryParams } from "@/helpers/querryHelper";
import { FormikHelpers } from "formik";

/**
 * Update *all* query-params in one go, removing nulls/undefineds.
 */
function updateQueriesBulk(
    updates: Record<string, string | null | undefined>
) {
    const base =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;

    const searchParams = new URLSearchParams(window.location.search);
    const existing: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        existing[key] = value;
    });
    const params = resolvePersistantQueryParams(existing) as Record<string, any>;

    for (const [key, val] of Object.entries(updates)) {
        if (val == null || val === "") {
            delete params[key];
        } else {
            params[key] = val;
        }
    }

    const qs = new URLSearchParams(params).toString();
    const newUrl = qs ? `${base}?${qs}` : base;
    window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl
    );
}

/**
 * Atomically update a source or destination (network + token together)
 * and sync the legacy URL query params (`from`/`fromAsset` or `to`/`toAsset`).
 */
export async function updateRouteField({
    direction,
    value,
    shouldValidate,
    setFieldValue,
}: {
    direction: 'source' | 'destination';
    value: SwapValuesRoute | undefined;
    shouldValidate?: boolean;
    setFieldValue: FormikHelpers<SwapFormValues>["setFieldValue"];
}) {
    await setFieldValue(direction, value, shouldValidate);
    const networkParam = direction === 'source' ? 'from' : 'to';
    const tokenParam = direction === 'source' ? 'fromAsset' : 'toAsset';
    updateQueriesBulk({
        [networkParam]: value?.network.name ?? null,
        [tokenParam]: value?.token.symbol ?? null,
    });
}

/**
 * Update the `fromExchange` field and sync its legacy URL query param.
 */
export async function updateExchangeField({
    value,
    shouldValidate,
    setFieldValue,
}: {
    value: Exchange | undefined;
    shouldValidate?: boolean;
    setFieldValue: FormikHelpers<SwapFormValues>["setFieldValue"];
}) {
    await setFieldValue('fromExchange', value, shouldValidate);
    updateQueriesBulk({ fromExchange: value?.name ?? null });
}

/**
 * Bulk‐update Formik with `setValues(...)`, and then sync the URL using
 * the legacy query param names (`from`/`to`/`fromAsset`/`toAsset`/`fromExchange`).
 */
export async function updateFormBulk(
    values: Partial<SwapFormValues>,
    shouldValidate = false,
    setValues: FormikHelpers<SwapFormValues>["setValues"]
) {
    await setValues(values, shouldValidate);

    updateQueriesBulk({
        from: values.source?.network.name ?? null,
        fromAsset: values.source?.token.symbol ?? null,
        to: values.destination?.network.name ?? null,
        toAsset: values.destination?.token.symbol ?? null,
        fromExchange: values.fromExchange?.name ?? null,
    });
}
