import MaintananceContent from "@/components/maintanance/maintanance";
import Analytics from "./Analytics";

export const metadata = {
    title: "Analytics | Layerswap Explorer",
};

export default function AnalyticsPage() {
    if (process.env.NEXT_PUBLIC_MAINTANANCE == String(true))
        return <MaintananceContent />;

    return <Analytics />;
}
