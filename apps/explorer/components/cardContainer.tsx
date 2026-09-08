import { HTMLAttributes } from "react";

export default function CardContainer({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props}>
            <div className="relative mt-8 w-full overflow-hidden rounded-3xl bg-secondary-700">
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
