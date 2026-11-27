import clsx from "clsx";

const NAME_WIDTHS = ["w-24", "w-16", "w-20"]

// Placeholder grid shown while ecosystem providers hydrate. Mirrors the
// Connector tile layout (icon square + name line inside a p-3 rounded-xl
// tile) so the list doesn't jump when real tiles replace it.
export function ConnectorsListSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2 animate-pulse" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="w-full flex items-center bg-secondary-500 rounded-xl p-3">
                    <div className="flex gap-2.5 items-center w-full">
                        <div className="w-11 h-11 shrink-0 rounded-[10px] bg-secondary-400" />
                        <div className="flex flex-col justify-center gap-1.5 min-h-[40px] w-full">
                            <div className={clsx("h-3.5 rounded-sm bg-secondary-400", NAME_WIDTHS[index % NAME_WIDTHS.length])} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
