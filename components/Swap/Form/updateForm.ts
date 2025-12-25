import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { resolvePersistantQueryParams } from "@/helpers/querryHelper";
import { FormikHelpers } from "formik";

const fieldMapping: Record<string, string> = {
    to: "name",
    from: "name",
    fromAsset: "symbol",
    toAsset: "symbol",
    fromExchange: "name",
};

/**
 * Update a single query‐param (add/update or remove).
 */
function updateQueries({ formDataKey, formDataValue, }: { formDataKey: string; formDataValue: string | null | undefined; }) {
    const base =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;

    // parse existing using URLSearchParams
    const searchParams = new URLSearchParams(window.location.search);
    const existing: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        existing[key] = value;
    });
    const params = resolvePersistantQueryParams(existing) as Record<string, any>;

    if (formDataValue == null || formDataValue === "") {
        delete params[formDataKey];
    } else {
        params[formDataKey] = formDataValue;
    }

    const qs = new URLSearchParams(params).toString();
    const newUrl = qs ? `${base}?${qs}` : base;
    window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl
    );
}

export async function updateForm<K extends keyof SwapFormValues>({ formDataKey, formDataValue, shouldValidate, setFieldValue }: { formDataKey: K, formDataValue: SwapFormValues[K], shouldValidate?: boolean, setFieldValue: FormikHelpers<SwapFormValues>['setFieldValue'] }) {
    // Update the form field value
    await setFieldValue(formDataKey, formDataValue, shouldValidate);

    const formDataValueString = typeof formDataValue === 'object' ? formDataValue[fieldMapping[formDataKey as string]] : String(formDataValue);
    // Update the URL query parameters
    updateQueries({ formDataKey, formDataValue: formDataValueString });
}

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

    // apply each update: delete null/undefined, or set the string
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
 * Bulk‐update Formik with `setValues(...)`, and then sync the URL
 * removing any null/undefined fields from the query.
 */
export async function updateFormBulk(
    values: Partial<SwapFormValues>,
    shouldValidate = false,
    setValues: FormikHelpers<SwapFormValues>["setValues"]
) {
    // 1) update the form in one shot
    await setValues(values, shouldValidate);

    const queryUpdates = ["from", "to", "fromAsset", "toAsset", "fromExchange"]


    // 2) build our “updates” map (string or null)
    const updates: Record<string, string | null> = {};
    for (const key of queryUpdates) {
        if (values[key] == null) {
            // explicit removal
            updates[key] = null;
        } else {
            const mapKey = fieldMapping[key] ?? key;
            const str =
                typeof values[key] === "object"
                    ? // @ts-ignore
                    String(values[key][mapKey])
                    : String(values[key]);
            updates[key] = str;
        }
    }

    // 3) one replaceState that adds/edits or deletes
    updateQueriesBulk(updates);
}
