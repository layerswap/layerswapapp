import { useRouter } from "next/router";
import { useCallback } from "react";

export default function handleGoHome() {
    const router = useRouter();

    return useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])
}