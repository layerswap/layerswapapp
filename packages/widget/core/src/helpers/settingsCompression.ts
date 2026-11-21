import { catalogNetworks, indexRouteCatalog, resolveCatalogRoutes } from "./routeCatalog";
import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { NetworkRoute, NetworkRouteToken, NetworkWithTokens } from "@layerswap/widget-types";
import { ExtendedRouteFlags } from "@layerswap/widget-types";
import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";

type CompactRouteToken = {
    symbol: string;
    status?: NetworkRouteToken["status"];
    supports_gasless_deposit?: NetworkRouteToken["supports_gasless_deposit"];
    gasless_standard?: NetworkRouteToken["gasless_standard"];
    source_rank?: number;
    destination_rank?: number;
    refuel?: NetworkRouteToken["refuel"];
};

type CompactRoute = {
    name: string;
    source_rank?: number;
    destination_rank?: number;
    tokens: CompactRouteToken[];
    deposit_methods?: string[];
};

export type CompressedLayerSwapSettings = {
    __compressedSettingsV1: true;
    networks: NetworkWithTokens[];
    sourceExchanges: Exchange[];
    sourceRoutes: CompactRoute[];
    destinationRoutes: CompactRoute[];
    featureFlags?: ExtendedRouteFlags;
};

export type EncodedLayerSwapSettings = {
    __encodedSettingsV1: true;
    algorithm: "gzip-base64";
    payload: string;
};

export type MaybeCompressedSettings = LayerSwapSettings | CompressedLayerSwapSettings | EncodedLayerSwapSettings;

const decodedSettingsCache = new Map<string, LayerSwapSettings | null>();

function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }

    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
        return Uint8Array.from(Buffer.from(value, "base64"));
    }

    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function compactRouteToken(token: NetworkRouteToken): CompactRouteToken {
    return {
        symbol: token.symbol,
        status: token.status,
        supports_gasless_deposit: token.supports_gasless_deposit,
        gasless_standard: token.gasless_standard,
        source_rank: token.source_rank,
        destination_rank: token.destination_rank,
        refuel: token.refuel,
    };
}

function compactRoute(route: NetworkRoute): CompactRoute {
    const compact: CompactRoute = {
        name: route.name,
        source_rank: route.source_rank,
        destination_rank: route.destination_rank,
        tokens: Array.isArray(route.tokens) ? route.tokens.filter(token => token?.symbol).map(compactRouteToken) : [],
    };

    if (route.deposit_methods && route.deposit_methods.length > 0) {
        compact.deposit_methods = route.deposit_methods;
    }

    return compact;
}

function compactRoutes(routes: NetworkRoute[] | undefined): CompactRoute[] {
    if (!Array.isArray(routes)) return [];
    return routes.filter(route => route?.name).map(compactRoute);
}

export function compactSettings(settings: LayerSwapSettings | null | undefined): MaybeCompressedSettings | null {
    if (!settings?.networks?.length) {
        return null;
    }

    return {
        __compressedSettingsV1: true,
        networks: settings.networks || [],
        sourceExchanges: settings.sourceExchanges || [],
        sourceRoutes: compactRoutes(settings.sourceRoutes),
        destinationRoutes: compactRoutes(settings.destinationRoutes),
        featureFlags: settings.featureFlags,
    };
}

function isEncodedSettings(settings: MaybeCompressedSettings | null | undefined): settings is EncodedLayerSwapSettings {
    return !!settings && "__encodedSettingsV1" in settings;
}

export function encodeSettingsForSSR(settings: LayerSwapSettings | null | undefined): MaybeCompressedSettings | null {
    const compact = compactSettings(settings);
    if (!compact) {
        return null;
    }

    try {
        const serialized = JSON.stringify(compact);
        if (!serialized) {
            return compact;
        }

        const payload = bytesToBase64(gzipSync(strToU8(serialized), { level: 9, mtime: 0 }));

        return {
            __encodedSettingsV1: true,
            algorithm: "gzip-base64",
            payload,
        };
    } catch {
        return compact;
    }
}

export function inflateSettings(settings: MaybeCompressedSettings | null | undefined): LayerSwapSettings | null {
    if (!settings) {
        return null;
    }

    if (isEncodedSettings(settings)) {
        const cached = decodedSettingsCache.get(settings.payload);
        if (cached !== undefined) {
            return cached;
        }

        try {
            const decoded = strFromU8(gunzipSync(base64ToBytes(settings.payload)));
            if (!decoded) {
                decodedSettingsCache.set(settings.payload, null);
                return null;
            }

            const parsed = JSON.parse(decoded) as MaybeCompressedSettings;
            const inflated = inflateSettings(parsed);
            decodedSettingsCache.set(settings.payload, inflated);
            return inflated;
        } catch {
            decodedSettingsCache.set(settings.payload, null);
            return null;
        }
    }

    // Empty settings are unavailable, even when the response itself succeeded.
    // Preserve the null contract used by the bridge's maintenance pages before
    // wallet providers attempt to initialize with an empty chain list.
    const networks = catalogNetworks(settings.networks);
    if (!networks.length) return null;
    const catalog = indexRouteCatalog(networks);

    return {
        networks,
        sourceExchanges: settings.sourceExchanges || [],
        sourceRoutes: resolveCatalogRoutes(settings.sourceRoutes, catalog),
        destinationRoutes: resolveCatalogRoutes(settings.destinationRoutes, catalog),
        featureFlags: settings.featureFlags,
    };
}
