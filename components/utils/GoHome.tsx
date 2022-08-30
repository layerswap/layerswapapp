import router from "next/router";
import { FC, useCallback } from "react";
import LayerSwapLogo from "../icons/layerSwapLogo";

interface Props {
    className?: string
}

const GoHomeButton = (({ className }: Props) => {

    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])

    return (
        <a onClick={handleGoHome}>
            <LayerSwapLogo className={className ?? "h-8 w-auto text-white"} />
        </a>
    )
})

export default GoHomeButton;