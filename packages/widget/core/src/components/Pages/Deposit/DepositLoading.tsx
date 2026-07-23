import { FC } from "react";
import clsx from "clsx";
import ColorSchema from "@/components/ColorSchema";
import { PoweredByFooter } from "@/components/Widget/Footer";
import AppSettings from "@/lib/AppSettings";

const MethodCardSkeleton: FC = () => (
    <div className="flex items-start gap-3.5 w-full rounded-2xl px-4 py-3.5 bg-secondary-500">
        <div className="shrink-0 h-[46px] w-[46px] rounded-xl bg-secondary-700 border border-secondary-400" />
        <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            <div className="h-3.5 w-28 bg-secondary-400 rounded-sm" />
            <div className="h-3 w-40 max-w-full bg-secondary-400 rounded-sm" />
        </div>
        <div className="h-5 w-5 rounded-sm bg-secondary-400 shrink-0 mt-2.5" />
    </div>
);

/**
 * Loading skeleton shaped like the deposit method-picker card (header,
 * "You receive" picker, and the fund-method cards). Mirrors the role of
 * {@link WidgetLoading} for the swap flow, but matches the deposit layout so the
 * widget-level init state doesn't flash a swap-shaped placeholder.
 *
 * Renders standalone chrome (it does NOT consume `SettingsProvider`), so it can
 * be shown while settings are still being fetched — e.g. as `LayerswapProvider`'s
 * loading fallback for deposit integrations.
 */
export const DepositLoading: FC = () => {
    return (
        <>
            <ColorSchema themeData={AppSettings.ThemeData} />
            <main className="styled-scroll h-full">
                <div className="flex flex-col items-center overflow-hidden relative font-robo h-full">
                    <div className="w-full h-full sm:max-w-[472px] z-auto">
                        <div className="relative p-px h-full">
                            <div
                                style={AppSettings.ThemeData?.cardBackgroundStyle}
                                className="sm:pb-4 rounded-3xl w-full overflow-hidden relative bg-secondary-700 h-full flex flex-col"
                            >
                                <div className="relative flex-col px-4 h-full min-h-0 flex flex-1">
                                    <div className="flex flex-col gap-3 w-full pt-4 max-sm:pb-4">
                                        {/* Header */}
                                        <div className="flex items-center justify-between w-full h-[32px]">
                                            <div className="h-5 w-24 bg-secondary-500 rounded-md animate-pulse" />
                                        </div>
                                        <div className="h-px w-full bg-secondary-400" />

                                        {/* Method-picker body */}
                                        <div className="flex flex-col gap-2 w-full animate-pulse">
                                            {/* "Choose how to fund this deposit" label */}
                                            <div className="h-3 w-44 bg-secondary-500 rounded-sm ml-1 mt-0.5 mb-1" />

                                            {/* Fund-method cards */}
                                            <div className="flex flex-col gap-2 w-full">
                                                <MethodCardSkeleton />
                                                <MethodCardSkeleton />
                                                <MethodCardSkeleton />
                                            </div>
                                        </div>

                                        {!AppSettings.ThemeData?.hidePoweredBy && <PoweredByFooter />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="offset-for-stickyness" className={clsx("block md:hidden")} />
                </div>
            </main>
        </>
    );
};

export default DepositLoading;
