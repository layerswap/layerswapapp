import { useEffect } from "react";
import { passportInstance, initilizePassport } from "../components/WalletProviders/ImtblPassportProvider";
import { RouterProvider, useAppRouter } from "../context/AppRouter/RouterProvider";
import { NextAppRouter } from "../context/AppRouter/Routers/NextAppRouter";
import { useRouter } from "next/router";

const Comp = () => {
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

const ImtblRedirect = () => {
    const router = useRouter()
    return (
        <RouterProvider router={new NextAppRouter(router)}>
            <Comp />
        </RouterProvider>
    );
}

export default ImtblRedirect;