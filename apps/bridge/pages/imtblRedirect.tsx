// import { ImtblPassportRedirect, LayerswapProvider } from "@layerswap/widget";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useState } from "react";

const ImtblRedirect = () => {
    const [loaded, setLoaded] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setLoaded(true)
    },[])

    if(!loaded) return <div>Loading...</div>

    const client_id = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID
    const publishable_key = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY
    const redirect_uri = router.basePath ? `${window.location.hostname}${router.basePath}/imtblRedirect` : `${window.location.hostname}/imtblRedirect`

    return <div>not yet...</div>
    // return (
    //     <LayerswapProvider
    //         integrator='layerswap'
    //     >
    //         <ImtblPassportRedirect client_id={client_id} publishable_key={publishable_key} redirect_uri={redirect_uri} base_path={router.basePath} />
    //     </LayerswapProvider>
    // );
}

export default ImtblRedirect;