import { parse, ParsedUrlQuery } from "querystring";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import { SwapFormValues } from "@layerswap/widget";

const fieldMapping: Record<string, string> = {
    to: "name",
    from: "name",
    fromAsset: "symbol",
    toAsset: "symbol",
    fromExchange: "name",
};

const allowedFields = ['from', 'to', 'fromAsset', 'toAsset', 'fromExchange', 'amount'];

/**
 * Update a single query‐param (add/update or remove).
 */
function updateQueries({ formDataKey, formDataValue, }: { formDataKey: string; formDataValue: string | null | undefined; }) {
    const base =
        window.location.protocol +
        "//" +
        window.location.host +
        window.location.pathname;

    // parse existing
    const raw = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    const existing: ParsedUrlQuery = parse(raw);
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

export async function updateForm<K extends keyof SwapFormValues>({ formDataKey, formDataValue }: { formDataKey: K, formDataValue: SwapFormValues[K] }) {

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

    const raw = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    const existing: ParsedUrlQuery = parse(raw);
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
 * Bulk‐update URL queries for specific form fields only.
 * Only includes: from, to, fromAsset, toAsset, fromExchange, amount
 */
export async function updateFormBulk(
    values: Partial<SwapFormValues>,
) {
    const updates: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(values)) {
        // Only process allowed fields
        if (!allowedFields.includes(key)) {
            continue;
        }

        if (value == null) {
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

    // one replaceState that adds/edits or deletes
    updateQueriesBulk(updates);
}
