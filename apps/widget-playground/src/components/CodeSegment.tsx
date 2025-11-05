"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import hljs from "highlight.js";
import { useEffect, useRef, useState } from "react";
import { Files } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { InitialSettings } from "@layerswap/widget/types";

/**
 * Stringify helpers
 */
function isPlainObject(v: unknown): v is Record<string, any> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pruneUndefinedDeep<T>(input: T): T {
    if (Array.isArray(input)) {
        const arr = input.map(pruneUndefinedDeep).filter((v) => v !== undefined) as any[];
        return arr as unknown as T;
    }
    if (isPlainObject(input)) {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(input)) {
            const pv = pruneUndefinedDeep(v as any);
            if (pv !== undefined && !(isPlainObject(pv) && Object.keys(pv).length === 0)) {
                out[k] = pv;
            }
        }
        return out as T;
    }
    return (input === undefined ? undefined : input) as T;
}

function formatJS(value: any, indent = 2, depth = 0): string {
    const pad = (n: number) => " ".repeat(n);
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        const inner = value.map((v) => formatJS(v, indent, depth + indent)).join(", ");
        return `[${inner}]`;
    }
    if (isPlainObject(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) return "{}";
        const lines = keys.map((k) => `${pad(depth + indent)}${k}: ${formatJS(value[k], indent, depth + indent)}`);
        return `{\n${lines.join(",\n")}\n${pad(depth)}}`;
    }
    return String(value);
}

/**
 * Build the config snippet.
 * - Only includes non-empty sections.
 * - Omits actionText if it's "Next"
 * - Omits initialSettings if it has no keys after pruning
 * - Includes featuredNetwork if available in context and non-empty
 */
function buildConfigSnippet(
    theme: Record<string, any> | undefined,
    actionText: string | undefined,
    initialValues: InitialSettings | undefined,
    featuredNetwork?: Record<string, any> | undefined
): string {
    const configObj: Record<string, any> = {};

    if (theme) configObj.theme = pruneUndefinedDeep(theme);

    if (actionText && actionText !== "Next") {
        configObj.actionText = actionText;
    }

    const prunedInitial = pruneUndefinedDeep(initialValues ?? {});
    if (isPlainObject(prunedInitial) && Object.keys(prunedInitial).length > 0) {
        configObj.initialValues = prunedInitial;
    }

    const prunedFeatured = pruneUndefinedDeep(featuredNetwork ?? {});
    if (isPlainObject(prunedFeatured) && Object.keys(prunedFeatured).length > 0) {
        configObj.featuredNetwork = prunedFeatured;
    }

    const header = `const config = `;
    return `${header}${formatJS(configObj, 2, 0)};`;
}

export function CodeSegment() {
    const ctx = useWidgetContext();
    const { themeData, actionText, initialValues } = ctx;

    // If your context exposes featuredNetwork, read it; otherwise it'll be undefined and simply omitted.
    const featuredNetwork = (ctx as any)?.featuredNetwork as Record<string, any> | undefined;

    const code = buildConfigSnippet(themeData, actionText, initialValues, featuredNetwork);

    const [copied, setCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.textContent = code;
            codeRef.current.removeAttribute("data-highlighted");
            hljs.highlightElement(codeRef.current);
        }
    }, [code]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-tl-xl rounded-md border bg-secondary-700 border-secondary-500">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Files
                        className="absolute right-4 top-4 z-10 rounded-full bg-secondary-500 text-base text-primary-text transition hover:bg-primary-500 p-1.5 h-8 w-auto hover:cursor-pointer"
                        onClick={handleCopy}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{copied ? "Copied!" : "Copy"}</p>
                </TooltipContent>
            </Tooltip>

            <div className="px-6 pb-14 pt-6">
                <pre>
                    <code ref={codeRef} className="language-typescript styled-scroll" />
                </pre>
            </div>
        </div>
    );
}
