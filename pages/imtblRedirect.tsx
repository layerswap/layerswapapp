import { useEffect } from "react";
import { passportInstance, initilizePassport } from "../components/ImtblPassportProvider";

const ImtblRedirect = () => {

    useEffect(() => {
        (async () => {
            if (!passportInstance) await initilizePassport()
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