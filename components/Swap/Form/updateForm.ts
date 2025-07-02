import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { resolvePersistantQueryParams } from "@/helpers/querryHelper";
import { FormikHelpers } from "formik";
import { parse, ParsedUrlQuery } from "querystring";

const fieldMapping: Record<string, string> = {
    to: "name",
    from: "name",
    fromAsset: "symbol",
    toAsset: "symbol",
    currencyGroup: "symbol",
    fromExchange: "name",
};

function updateQueries({ formDataKey, formDataValue }: { formDataKey: string, formDataValue: string }) {
    //TODO: as path should be without basepath and host
    var urlWithQueries = window.location.protocol + "//"
        + window.location.host;

    const raw = window.location.search.startsWith('?')
        ? window.location.search.slice(1)
        : window.location.search;
    const query: ParsedUrlQuery = parse(raw);
    const params = resolvePersistantQueryParams(query)
    const search = new URLSearchParams({ ...(params as any), [formDataKey]: formDataValue });
    if (search)
        urlWithQueries += `?${search}`

    window.history.pushState({ ...window.history.state, as: urlWithQueries, url: urlWithQueries }, '', urlWithQueries);
}

export async function updateForm<K extends keyof SwapFormValues>({ formDataKey, formDataValue, shouldValidate, setFieldValue }: { formDataKey: K, formDataValue: SwapFormValues[K], shouldValidate?: boolean, setFieldValue: FormikHelpers<SwapFormValues>['setFieldValue'] }) {
    // Update the form field value
    await setFieldValue(formDataKey, formDataValue, shouldValidate);

    const formDataValueString = typeof formDataValue === 'object' ? formDataValue[fieldMapping[formDataKey as string]] : String(formDataValue);
    // Update the URL query parameters
    updateQueries({ formDataKey, formDataValue: formDataValueString });
}

/**
 * Single-shot URL updater (unchanged).
 */
function updateQueriesBulk(updates: Record<string, string>) {
    const base =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;

    const raw = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    const existing: ParsedUrlQuery = parse(raw);
    const persistent = resolvePersistantQueryParams(existing);

    const merged = {
        ...(persistent as Record<string, string>),
        ...updates,
    };

    const search = new URLSearchParams(merged).toString();
    const newUrl = search ? `${base}?${search}` : base;

    window.history.pushState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl
    );
}

/**
 * Bulk‐update your Formik form *and* the URL in one go.
 *
 * @param values       Partial form values to merge in
 * @param setValues    Formik’s setValues(fn | object, shouldValidate?)
 * @param shouldValidate  whether to trigger validation
 */
export async function updateFormBulk(
    values: Partial<SwapFormValues>,
    shouldValidate = false,
    setValues: FormikHelpers<SwapFormValues>['setValues']
) {
    // 1) Merge into the form state in one call
    await setValues(values, shouldValidate);

    // 2) Build a flat map of strings for the URL
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
        if (value == null) continue;
        const mapKey = fieldMapping[key] ?? key;
        const str =
            typeof value === "object"
                ? // @ts-ignore
                String(value[mapKey])
                : String(value);
        updates[key] = str;
    }

    // 3) Push the new URL once
    updateQueriesBulk(updates);
}