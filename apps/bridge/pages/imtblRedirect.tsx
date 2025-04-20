import { useEffect } from "react";
import { NextAppRouter, RouterProvider, useAppRouter } from '@layerswap/widget'
import { useRouter } from "next/router";
// import { initilizePassport, passportInstance } from "../components/Wallet/WalletProviders/ImtblPassportProvider";

const Comp = () => {
    const router = useAppRouter();

    // useEffect(() => {
    //     (async () => {
    //         if (!passportInstance) await initilizePassport(router.basePath)
    //         passportInstance.loginCallback();
    //     })()
    // }, [passportInstance])

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