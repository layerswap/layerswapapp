import { useFormikContext } from "formik";
import { useMemo } from "react";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";

const useTestState = () => {
    const {
        values,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    return useMemo(() => 8, [])
}
export default useTestState