"use client";
import { featuredNetworkType, useWidgetContext } from "@/context/ConfigContext";
import hljs from 'highlight.js';
import { useEffect, useRef, useState } from "react";
import { Files } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"

export function CodeSegment() {
    const { themeData, actionText, featuredNetwork } = useWidgetContext();
    const data = themeData && formatObjectLiteral(themeData, actionText, featuredNetwork)
    const [copied, setCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && data) {
            codeRef.current.textContent = data;
            codeRef.current.removeAttribute("data-highlighted");
            hljs.highlightElement(codeRef.current);
        }
    }, [data]);

    const handleCopy = async () => {
        if (data) {
            await navigator.clipboard.writeText(data);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-tl-xl rounded-md border bg-secondary-700  border-secondary-500 ">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Files className="absolute right-4 top-4 z-10 rounded-full bg-secondary-500  text-base text-primary-text transition hover:bg-primary-500 p-1.5 h-8 w-auto hover:cursor-pointer" onClick={handleCopy} />
                </TooltipTrigger>
                <TooltipContent >
                    <p>{copied ? "Copied!" : "Copy"}</p>
                </TooltipContent>
            </Tooltip>
            <div className="px-6 pb-14 pt-6">
                <pre>
                    <code ref={codeRef} className='language-javascript styled-scroll'>
                        {data}
                    </code>
                </pre>
            </div>
        </div>
    );
}

function formatObjectLiteral(
    obj: Record<string, any>,
    actionText?: string,
    featuredNetwork?: featuredNetworkType,
    indent = 2,
): string {
    const space = ' '.repeat(indent);

    function formatValue(value: any, depth: number): string {
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        if (Array.isArray(value)) {
            return `[${value.map(v => formatValue(v, depth)).join(', ')}]`;
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

    const innerIndent = indent * 2;
    const innerSpace = ' '.repeat(innerIndent);
    const indentedEntries = entries
        .split('\n')
        .map(line => innerSpace + line.trim())
        .join('\n');

    let result = `const config = {\n${space}theme: {\n${indentedEntries}\n${space}},`;

    if (actionText && actionText !== "Next") {
        result += `\n\n${space}actionText: "${actionText}",`;
    }

    if (featuredNetwork?.network) {
        result += `\n\n${space}featuredNetwork: ${formatValue(featuredNetwork, indent * 2)}`;
    }

    result += `\n}`;

    return result;
}