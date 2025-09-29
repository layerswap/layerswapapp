import { ImtblPassportRedirect, LayerswapProvider } from "@layerswap/widget";

const ImtblRedirect = () => {
    return (
        <LayerswapProvider
            integrator='layerswap'
        >
            <ImtblPassportRedirect />
        </LayerswapProvider>
    );
}

export default ImtblRedirect;