import { Suspense } from "react";
import MaintananceContent from "@/components/maintanance/maintanance";
import Analytics from "./Analytics";

export const metadata = {
    title: "Analytics | Layerswap Explorer",
    description:
        "Compare completed transfer volume, network flows, and asset activity across Layerswap.",
    alternates: {
        canonical: "https://layerswap.io/explorer/analytics",
    },
};

export default function AnalyticsPage() {
    if (process.env.NEXT_PUBLIC_MAINTANANCE == String(true))
        return <MaintananceContent />;

    return (
        <Suspense>
            <Analytics />
        </Suspense>
    );
}
