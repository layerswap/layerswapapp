import { Check } from "lucide-react";

export const Gauge = ({
    value,
    size = "small",
    completeOnFinish = false
}: {
    value: number;
    size: "verySmall" | "small" | "medium" | "large";
    completeOnFinish?: boolean;
}) => {
    const circumference = 332; //2 * Math.PI * 53; // 2 * pi * radius
    const valueInCircumference = (value / 100) * circumference;
    const strokeDasharray = `${circumference} ${circumference}`;
    const initialOffset = circumference;
    const strokeDashoffset = initialOffset - valueInCircumference;

    const sizes = {
        verySmall: {
            width: "32",
            height: "32",
            textSize: "text-xs",
        },
        small: {
            width: "40",
            height: "40",
            textSize: "text-xs",
        },
        medium: {
            width: "72",
            height: "72",
            textSize: "text-lg",
        },
        large: {
            width: "144",
            height: "144",
            textSize: "text-3xl",
        },
    };

    return (
        <div className="flex flex-col items-center justify-center relative">
            <svg
                fill="none"
                shapeRendering="crispEdges"
                height={sizes[size].height}
                width={sizes[size].width}
                viewBox="0 0 120 120"
                strokeWidth="2"
                className="transform -rotate-90"
            >
                <circle
                    className="text-primary/20"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    shapeRendering="geometricPrecision"
                    r="53"
                    cx="60"
                    cy="60"
                />
                <circle
                    className="text-primary animate-gauge_fill"
                    strokeWidth="12"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={initialOffset}
                    shapeRendering="geometricPrecision"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="53"
                    cx="60"
                    cy="60"
                    style={{
                        strokeDashoffset: strokeDashoffset,
                        transition: "stroke-dasharray 1s ease 0s,stroke 1s ease 0s",
                    }}
                />
            </svg>
            {completeOnFinish && value == 100 ? (
                <div className="absolute flex opacity-0 animate-gauge_fadeIn">
                   <Check className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
            ) : null}
        </div>
    );
};