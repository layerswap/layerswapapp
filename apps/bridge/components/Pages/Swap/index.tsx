import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { Router } from "next/router"
import { parse, ParsedUrlQuery } from "querystring"
import { FC } from "react"
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper"
import { updateFormBulk } from "../../utils/updateForm"

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string }> = ({ settings, themeData, apiKey }) => {
    return <LayerswapProvider
        integrator='layerswap'
        apiKey={apiKey}
        settings={settings}
        themeData={{ ...themeData as any, borderRadius: 'default', enablePortal: true }}
        callbacks={{
            onFormChange(formData) {
                updateFormBulk(formData);
            }
        }}
    >
        <Swap />
    </LayerswapProvider>
}


export const setSwapPath = (swapId: string, router: Router) => {
    //TODO: as path should be without basepath and host
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap/${swapId}`;
    const raw = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    const existing: ParsedUrlQuery = parse(raw);
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            swapURL += `?${search}`
    }

    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
}

export const removeSwapPath = (router: Router) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    const raw = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
    const existing: ParsedUrlQuery = parse(raw);
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            homeURL += `?${search}`
    }
    window.history.replaceState({ ...window.history.state, as: router.asPath, url: homeURL }, '', homeURL);
}


export default SwapPage