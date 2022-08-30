import { useRouter } from "next/router";
import { useCallback } from "react";
import LayerSwapLogo from "../icons/layerSwapLogo";

interface Props {
    className?: string
}

const GoHomeButton = (({ className }: Props) => {
    const router = useRouter()
    const handleGoHome = useCallback(() => {
        typeof window !== 'undefined' && router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])

    return (
        <a onClick={() => handleGoHome()}>
            <LayerSwapLogo className={className ?? "h-8 w-auto text-white"} />
        </a>
    )
})

export default GoHomeButton;