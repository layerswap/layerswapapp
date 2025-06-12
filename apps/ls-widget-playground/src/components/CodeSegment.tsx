"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import hljs from 'highlight.js';
import { useEffect, useState } from "react";
import { Files } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"

export function CodeSegment() {
    const { themeData } = useWidgetContext();
    const data = themeData && formatObjectLiteral(themeData)
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        hljs.highlightAll();
    }, []);

    const handleCopy = async () => {
        if (data) {
            await navigator.clipboard.writeText(data);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="tw-relative tw-w-full tw-overflow-hidden tw-rounded-tl-xl tw-rounded-md tw-border tw-bg-transparent tw-bg-secondary-700 tw- tw-border-secondary-500">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Files className="tw-absolute tw-right-4 tw-top-4 tw-z-10 tw-rounded-full tw-bg-secondary-500  tw-text-base tw-text-white tw-transition hover:tw-bg-primary-500 tw-p-1.5 tw-h-8 tw-w-auto hover:tw-cursor-pointer" onClick={handleCopy} />
                </TooltipTrigger>
                <TooltipContent >
                    <p>{copied ? "Copied!" : "Copy"}</p>
                </TooltipContent>
            </Tooltip>
            <div className="tw-px-6 tw-pb-14 tw-pt-6">
                <pre>
                    <code className="tw-language-javascript styled-scroll">
                        {data}
                    </code>
                </pre>
            </div>
        </div>
    );
}

function formatObjectLiteral(obj: Record<string, any>, indent = 2): string {
    const space = ' '.repeat(indent);

    function formatValue(value: any, depth: number): string {
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value)
                .map(([k, v]) => `${' '.repeat(depth)}${k}: ${formatValue(v, depth + indent)}`)
                .join(',\n');
            return `{\n${entries}\n${' '.repeat(depth - indent)}}`;
        }
        return String(value);
    }

    const entries = Object.entries(obj)
        .map(([key, value]) => `${space}${key}: ${formatValue(value, indent * 2)}`)
        .join(',\n');

    return `const config = {\n${entries}\n}`;
}