import { useRouter } from "next/router"
import { useCallback } from "react"
import { useQueryState } from "../context/query"
import { resolvePersistantQueryParams } from "../helpers/querryHelper"

export const useGoHome = (): () => Promise<boolean> => {
    const router = useRouter()
    const query = useQueryState()
    return useCallback(async () => {
        return await router.push({
            pathname: "/",
            query: { ...resolvePersistantQueryParams(router.query) }
        })
    }, [query])
}