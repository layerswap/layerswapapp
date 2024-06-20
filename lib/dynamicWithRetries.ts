import dynamic, { DynamicOptions, Loader } from "next/dynamic";

export const dynamicWithRetries = <T>(importer: () => DynamicOptions<T> | Loader<T>, loading: JSX.Element | null) => {

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
            throw error;
        }
    };

    return dynamic(retryImport as DynamicOptions<T> | Loader<T>, { loading: () => loading });
};