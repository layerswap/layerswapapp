import { PersistantQueryParams } from "../Models/QueryParams";

export const resolvePersistantQueryParams = (query: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> | null => {
    if (!query)
        return null
    const persiatantParams = new PersistantQueryParams()
    const res: Record<string, string | string[] | undefined> = {}
    Object.keys(persiatantParams).forEach(key => {
        if (query[key] !== undefined) {
            res[key] = query[key]
        }
    })
    return res
}