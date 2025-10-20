import { Connector } from "wagmi"

export type LSConnector = Connector & {
    resolveURI?: (uri: string) => string
    order?: number,
    isAvailable?: boolean,
    deepLink?: string,
}