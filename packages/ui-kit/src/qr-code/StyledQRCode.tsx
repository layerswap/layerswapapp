import { lazy, Suspense, type FC } from "react"
import type { StyledQRCodeProps } from "./StyledQRCodeImpl"

const StyledQRCodeImpl = lazy(() => import("./StyledQRCodeImpl"))

const StyledQRCode: FC<StyledQRCodeProps> = (props) => {
    const size = props.size ?? 140
    return (
        <Suspense fallback={<div style={{ width: size, height: size }} aria-hidden="true" />}>
            <StyledQRCodeImpl {...props} />
        </Suspense>
    )
}

export type { StyledQRCodeProps }
export default StyledQRCode
