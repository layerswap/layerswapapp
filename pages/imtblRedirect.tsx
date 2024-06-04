import { useEffect } from "react";
import { passportInstance } from "../components/ImtblPassportProvider";

const ImtblRedirect = () => {

    useEffect(() => {
        passportInstance.loginCallback();
    }, [passportInstance])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    );
}

export default ImtblRedirect;