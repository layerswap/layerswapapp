import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import LayerSwapLogo from "../icons/layerSwapLogo";

interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[];
}

const GoHomeButton: FC<Props> = (({ className, children }) => {
    const router = useRouter()
    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])

    return (
        <div onClick={handleGoHome}>
            {
                children ??
                <LayerSwapLogo className={className ?? "h-8 w-auto text-white"} />
            }
        </div>
    )
})

export default GoHomeButton;