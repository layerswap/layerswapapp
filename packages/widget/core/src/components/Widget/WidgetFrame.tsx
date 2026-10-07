import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

/** The live widget's chrome and sizing, without its application providers. */
export function WidgetFrame({
    children,
    header,
    overlay,
    enableWideVersion,
    isEmbedded,
    fitHeight,
    backgroundStyle,
    testnet,
    id = 'widget',
}: {
    children: ReactNode;
    header?: ReactNode;
    overlay?: ReactNode;
    enableWideVersion?: boolean;
    isEmbedded?: boolean;
    fitHeight?: boolean;
    backgroundStyle?: CSSProperties;
    testnet?: boolean;
    id?: string;
}) {
    return (
        <div className="relative p-px h-full">
            {enableWideVersion && !isEmbedded && (
                <div className="invisible sm:visible absolute inset-0 rounded-[25px] bg-linear-to-t from-secondary-800 to-secondary-300 pointer-events-none" />
            )}
            <div
                id={id}
                style={backgroundStyle}
                className={clsx(
                    'sm:pb-4 rounded-3xl w-full overflow-hidden relative bg-secondary-700 h-full flex flex-col has-expandContainerHeight:min-h-[650px]',
                    {
                        'max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]! sm:has-openaddresspicker:min-h-[500px]':
                            enableWideVersion && !fitHeight,
                        'max-sm:min-h-[99svh]!': isEmbedded,
                        'has-openpicker:min-h-[675px]':
                            !enableWideVersion && !fitHeight,
                    },
                )}
            >
                {testnet && (
                    <div className="relative z-20">
                        <div className="absolute -top-1 right-[calc(50%-68px)] bg-warning-foreground py-0.5 px-10 rounded-b-md text-xs scale-75 text-black">
                            TESTNET
                        </div>
                    </div>
                )}
                {header}
                <div className="relative flex-col px-4 h-full min-h-0 flex flex-1">
                    <div className="flex flex-col flex-1 items-start h-full min-h-0 w-full gap-2">
                        {children}
                    </div>
                </div>
                {overlay}
                <div id={`${id}_root`} />
            </div>
        </div>
    );
}

export function WidgetHeaderView({
    start,
    end,
}: {
    start?: ReactNode;
    end?: ReactNode;
}) {
    return (
        <div className="items-center justify-between sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none mt-2 pb-2 px-4">
            <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center flex items-center gap-2">
                {start}
            </div>
            <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1 sm:mr-2">
                {end}
            </div>
        </div>
    );
}
