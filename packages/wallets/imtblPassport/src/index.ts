import { WalletWrapper } from "@layerswap/widget/types";
import { ImtblPassportProviderWrapper } from "./ImtblPassportProvider";

export const ImtblPassportProvider: WalletWrapper = {
    id: "imtblPassport",
    wrapper: ImtblPassportProviderWrapper,
}

export { ImtblRedirect } from "./ImtblPassportProvider";