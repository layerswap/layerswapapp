import { useEffect } from "react";
import { passportInstance, initilizePassport } from "../components/WalletProviders/ImtblPassportProvider";
import { useAppRouter } from "../context/AppRouter/RouterProvider";

const ImtblRedirect = () => {
    const router = useAppRouter();

    useEffect(() => {
        (async () => {
            if (!passportInstance) await initilizePassport(router.basePath)
            passportInstance.loginCallback();
        })()
    }, [passportInstance])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}

export default ImtblRedirect;