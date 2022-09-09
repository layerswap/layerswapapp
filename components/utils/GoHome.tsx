import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import { useQueryState } from "../../context/query";
import LayerswapLogo from "../icons/layerSwapLogo";

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
    const query = useQueryState()

    return (
        <div onClick={handleGoHome}>
            {
                children ??
                <LayerswapLogo partnerName={query?.partnerName} className={className ?? "h-8 w-auto text-white"} />
            }
        </div>
    )
})

export default GoHomeButton;