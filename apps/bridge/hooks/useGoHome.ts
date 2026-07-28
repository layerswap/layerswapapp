import { useRouter } from "next/router"
import { useCallback } from "react"
import { resolvePersistantQueryParams } from "../helpers/querryHelper"

export const useGoHome = (): () => Promise<boolean> => {
    const router = useRouter()
    return useCallback(async () => {
        return await router.push({
            pathname: "/",
            query: { ...resolvePersistantQueryParams(router.query) }
        })
    }, [router])
}