import { useEffect } from "react";
import { passportInstance, initilizePassport } from "../components/WalletProviders/ImtblPassportProvider";
import { useRouter } from "next/router";

const ImtblRedirect = () => {
    const router = useRouter();

    useEffect(() => {
        (async () => {
            if (!passportInstance) await initilizePassport(router.basePath)
            try {
                await passportInstance?.loginCallback();
            } catch (error) {
                // In an embedded iframe the popup doesn't share storage with the opener,
                // so the OIDC state isn't here. Relay the callback to the opener, which holds it.
                if (window.opener && window.opener !== window) {
                    window.opener.postMessage(
                        { source: "oidc-client", url: window.location.href, keepOpen: false },
                        window.location.origin
                    );
                } else {
                    throw error;
                }
            }
        })()
    }, [])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}

export default ImtblRedirect;