import { NextRouter } from "next/router";
import { resolvePersistantQueryParams, QueryParams } from "../../helpers/querryHelper";

export const setSwapPath = (swapId: string, router: NextRouter) => {
    //TODO: as path should be without basepath and host
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap/${swapId}`;
    const searchParams = new URLSearchParams(window.location.search);
    const existing: QueryParams = Object.fromEntries(searchParams.entries());
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            swapURL += `?${search}`
    }

    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
}

export const removeSwapPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    const searchParams = new URLSearchParams(window.location.search);
    const existing: QueryParams = Object.fromEntries(searchParams.entries());
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            homeURL += `?${search}`
    }
    window.history.replaceState({ ...window.history.state, as: router.asPath, url: homeURL }, '', homeURL);
}

export const setMenuPath = (path: string, router: NextRouter) => {
    const basePath = router?.basePath || ""
    let menuURL = window.location.protocol + "//"
        + window.location.host + basePath + path;

    const searchParams = new URLSearchParams(window.location.search);
    const existing: QueryParams = Object.fromEntries(searchParams.entries());
    const params = resolvePersistantQueryParams(existing)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            menuURL += `?${search}`
    }

    window.history.pushState({ ...window.history.state, as: menuURL, url: menuURL }, '', menuURL);
}
