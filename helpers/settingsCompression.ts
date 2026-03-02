import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { NetworkRoute, NetworkRouteToken, NetworkWithTokens } from "../Models/Network";
import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";

type CompactRouteToken = {
    symbol: string;
    status?: NetworkRouteToken["status"];
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
        tokens: (route.tokens || []).map(compactRouteToken),
    };

    if (route.deposit_methods && route.deposit_methods.length > 0) {
        compact.deposit_methods = route.deposit_methods;
    }

    return compact;
}

export function compactSettings(settings: LayerSwapSettings | null | undefined): MaybeCompressedSettings | null {
    if (!settings) {
        return null;
    }

    return {
        __compressedSettingsV1: true,
        networks: settings.networks || [],
        sourceExchanges: settings.sourceExchanges || [],
        sourceRoutes: (settings.sourceRoutes || []).map(compactRoute),
        destinationRoutes: (settings.destinationRoutes || []).map(compactRoute),
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

function isCompressedSettings(settings: MaybeCompressedSettings | null | undefined): settings is CompressedLayerSwapSettings {
    return !!settings && "__compressedSettingsV1" in settings;
}

function inflateRouteToken(
    compactToken: CompactRouteToken,
    baseToken: NetworkRouteToken | undefined
): NetworkRouteToken {
    const resolvedToken: NetworkRouteToken = {
        ...(baseToken || {}),
        symbol: compactToken.symbol,
    } as NetworkRouteToken;

    if (compactToken.status !== undefined) {
        resolvedToken.status = compactToken.status;
    }
    if (compactToken.source_rank !== undefined) {
        resolvedToken.source_rank = compactToken.source_rank;
    }
    if (compactToken.destination_rank !== undefined) {
        resolvedToken.destination_rank = compactToken.destination_rank;
    }
    if (compactToken.refuel !== undefined) {
        resolvedToken.refuel = compactToken.refuel;
    }

    return resolvedToken;
}

function inflateRoutes(
    compactRoutes: CompactRoute[],
    networksByName: Map<string, NetworkWithTokens>
): NetworkRoute[] {
    return compactRoutes.reduce<NetworkRoute[]>((routes, compactRoute) => {
        const baseNetwork = networksByName.get(compactRoute.name);
        if (!baseNetwork) {
            return routes;
        }

        const baseTokensBySymbol = new Map<string, NetworkRouteToken>(
            (baseNetwork.tokens || []).map((token) => [token.symbol, token as NetworkRouteToken])
        );

        const tokens = (compactRoute.tokens || []).map((compactToken) =>
            inflateRouteToken(compactToken, baseTokensBySymbol.get(compactToken.symbol))
        );

        const inflatedRoute: NetworkRoute = {
            ...baseNetwork,
            name: compactRoute.name,
            tokens,
        };

        if (compactRoute.source_rank !== undefined) {
            inflatedRoute.source_rank = compactRoute.source_rank;
        }
        if (compactRoute.destination_rank !== undefined) {
            inflatedRoute.destination_rank = compactRoute.destination_rank;
        }
        if (compactRoute.deposit_methods !== undefined) {
            inflatedRoute.deposit_methods = compactRoute.deposit_methods;
        }

        routes.push(inflatedRoute);
        return routes;
    }, []);
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

    if (!isCompressedSettings(settings)) {
        return settings;
    }

    const networks = settings.networks || [];
    const networksByName = new Map<string, NetworkWithTokens>(networks.map((network) => [network.name, network]));

    return {
        networks,
        sourceExchanges: settings.sourceExchanges || [],
        sourceRoutes: inflateRoutes(settings.sourceRoutes || [], networksByName),
        destinationRoutes: inflateRoutes(settings.destinationRoutes || [], networksByName),
    };
}
