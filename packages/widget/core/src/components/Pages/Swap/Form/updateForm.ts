import { FormikHelpers } from "formik";
import { SwapFormValues } from "./SwapFormValues";

export async function updateForm<K extends keyof SwapFormValues>({ formDataKey, formDataValue, shouldValidate, setFieldValue }: { formDataKey: K, formDataValue: SwapFormValues[K], shouldValidate?: boolean, setFieldValue: FormikHelpers<SwapFormValues>['setFieldValue'] }) {
    // Update the form field value only
    await setFieldValue(formDataKey, formDataValue, shouldValidate);
}

/**
 * Bulk‐update Formik with `setValues(...)` without updating URL queries.
 */
export async function updateFormBulk(
    values: Partial<SwapFormValues>,
    shouldValidate = false,
    setValues: FormikHelpers<SwapFormValues>["setValues"]
) {
    // Update the form only
    await setValues(values, shouldValidate);
}