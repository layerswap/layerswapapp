import { useEffect, useState } from "react";
import { authInstance, initializeImtblAuth } from "../components/WalletProviders/ImtblPassportProvider";
import { useRouter } from "next/router";
import LayerSwapLogoSmall from "../components/icons/layerSwapLogoSmall";
import ImtblPassportIcon from "../components/icons/Wallets/ImtblPassport";
import { Link2Off } from "lucide-react";

const ImtblRedirect = () => {
    const router = useRouter();
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                if (!authInstance) await initializeImtblAuth(router.basePath)
                await authInstance?.loginCallback();
            } catch {
                setHasError(true);
            }
        })()
    }, [])

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center gap-5 p-6 text-primary-text">
            <div className="flex items-center gap-2">
                <div className="p-3 bg-secondary-700 rounded-lg">
                    <LayerSwapLogoSmall className="w-11 h-auto" />
                </div>
                {hasError
                    ? <Link2Off className="w-5 h-5 text-secondary-text" />
                    : <div className="loader text-[3px]!" />
                }
                <div className="p-3 bg-secondary-700 rounded-lg">
                    <ImtblPassportIcon className="w-11 h-auto" />
                </div>
            </div>
            <div className="text-center max-w-xs">
                {hasError ? (
                    <>
                        <p className="text-base font-medium text-primary-text">Couldn&apos;t complete sign in</p>
                        <p className="text-sm font-normal text-secondary-text mt-1">Please close this window and try connecting again.</p>
                    </>
                ) : (
                    <>
                        <p className="text-base font-medium text-primary-text">Completing sign in</p>
                        <p className="text-sm font-normal text-secondary-text mt-1">Securely connecting your Immutable Passport. This window will close automatically.</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default ImtblRedirect;
