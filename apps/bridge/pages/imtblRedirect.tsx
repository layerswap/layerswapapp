import { useEffect } from "react";
import { useRouter } from "next/router";
// import { initilizePassport, passportInstance } from "../components/Wallet/WalletProviders/ImtblPassportProvider";

const Comp = () => {

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
        <Comp />
    );
}

export default ImtblRedirect;