import { useCallback } from "react"
import { resolvePersistantQueryParams } from "../helpers/querryHelper"
import { useAppRouter } from "../context/AppRouter/RouterProvider"

export const useGoHome = (): () => Promise<boolean> => {
    const router = useAppRouter()
    return useCallback(async () => {
        return await router.push({
            pathname: "/",
            query: { ...resolvePersistantQueryParams(router.query) }
        })
    }, [router])
}