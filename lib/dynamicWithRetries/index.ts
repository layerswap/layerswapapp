import dynamic, { DynamicOptions, Loader } from "next/dynamic";
import DynamicDefaultError from "./defaultError";

export const dynamicWithRetries = <T>(importer: () => DynamicOptions<T> | Loader<T>, loading: JSX.Element | null, errorComponent?: JSX.Element | null) => {

    const retryImport = async () => {
        try {
            return await importer();
        } catch (error: any) {
            // retry 4 times with 2 second delay and backoff factor of 2 (2, 4, 8, 16 seconds)
            for (let i = 0; i < 4; i++) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));

                try {
                    return await importer();
                } catch (e) {
                    console.log("retrying import", e);
                }
            }

            const errorComp = errorComponent ? () => errorComponent : DynamicDefaultError;

            return errorComp;
        }
    };

    return dynamic(retryImport as DynamicOptions<T> | Loader<T>, { loading: () => loading });
};