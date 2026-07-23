import { FC, Suspense, lazy } from "react";
import type { StyledQRCodeProps } from "./StyledQRCodeImpl";

// Lazy boundary: QR rendering is only needed on the deposit/withdraw/connect
// steps that actually show a code, but `react-qrcode-logo` (qrcode + canvas
// machinery) is heavy enough to matter in the synchronous widget bundle. The
// dynamic import keeps it in an async chunk fetched at first QR render; every
// call site keeps importing this module unchanged.
const StyledQRCodeImpl = lazy(() => import("./StyledQRCodeImpl"));

const StyledQRCode: FC<StyledQRCodeProps> = (props) => {
    const size = props.size ?? 140;
    return (
        // Size-matched placeholder so the surrounding layout doesn't shift
        // while the QR chunk loads.
        <Suspense fallback={<div style={{ width: size, height: size }} aria-hidden="true" />}>
            <StyledQRCodeImpl {...props} />
        </Suspense>
    );
};

export type { StyledQRCodeProps };
export default StyledQRCode;
