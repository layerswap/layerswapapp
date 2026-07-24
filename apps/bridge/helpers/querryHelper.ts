import { PersistantQueryParams } from "../Models/QueryParams";

// Type for parsed URL query parameters
export type QueryParams = Record<string, string | string[] | undefined>;

export const resolvePersistantQueryParams = (query: QueryParams): QueryParams | null => {
    if (!query)
        return null
    const persiatantParams = new PersistantQueryParams()
    const res: QueryParams = {}
    Object.keys(persiatantParams).forEach(key => {
        if (query[key] !== undefined) {
            res[key] = query[key]
        }
    })
    return res
}