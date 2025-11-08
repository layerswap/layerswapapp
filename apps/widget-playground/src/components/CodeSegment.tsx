"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import hljs from "highlight.js";
import { useEffect, useRef, useState } from "react";
import { Files } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { InitialSettings } from "@layerswap/widget/types";
import type { ThemeData } from "@layerswap/widget";

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

    const header = `const config = `;
    return `${header}${formatJS(configObj, 2, 0)};`;
}

export function CodeSegment() {
    const ctx = useWidgetContext();
    const { themeData, actionText, initialValues, updateWholeTheme, updateActionText, updateInitialValues, resetData } = ctx;

    const generatedCode = buildConfigSnippet(themeData, actionText, initialValues);

    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUserEdited, setIsUserEdited] = useState(false);
    const codeRef = useRef<HTMLElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (codeRef.current && !isUserEdited) {
            codeRef.current.textContent = generatedCode;
            codeRef.current.removeAttribute("data-highlighted");
            hljs.highlightElement(codeRef.current);
        }
    }, [generatedCode, isUserEdited]);

    const handleCopy = async () => {
        const text = codeRef.current?.textContent || generatedCode;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const parseConfig = (code: string): Record<string, any> | null => {
        try {
            let configStr = code.trim();
            configStr = configStr.replace(/^\s*const\s+config\s*=\s*/, "");
            configStr = configStr.replace(/;?\s*$/, "");
            const jsonStr = configStr.replace(/(\w+):/g, '"$1":');

            const config = JSON.parse(jsonStr);
            return config;
        } catch (e) {
            return null;
        }
    };

    const applyConfig = () => {
        setError(null);
        const code = codeRef.current?.textContent || "";
        const config = parseConfig(code);

        if (!config) {
            setError("Invalid config format. Please check your syntax.");
            return;
        }

        try {
            if (config.theme) {
                updateWholeTheme({ theme: config.theme as ThemeData, themeName: 'custom' });
            }
            if (config.actionText !== undefined) {
                updateActionText(config.actionText);
            }
            if (config.initialValues) {
                const newInitialValues = config.initialValues as InitialSettings;
                Object.keys(newInitialValues).forEach((key) => {
                    updateInitialValues(key as keyof InitialSettings, newInitialValues[key as keyof InitialSettings]);
                });
            }
            setIsUserEdited(false);
        } catch (e) {
            setError(`Failed to apply config: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const handleInput = () => {
        if (codeRef.current) {
            setIsUserEdited(true);
            setError(null);
            const text = codeRef.current.textContent || "";
            codeRef.current.textContent = text;
            codeRef.current.removeAttribute("data-highlighted");
            hljs.highlightElement(codeRef.current);
        }
    };

    const handleReset = () => {
        resetData();
        if (codeRef.current) {
            codeRef.current.textContent = generatedCode;
            codeRef.current.removeAttribute("data-highlighted");
            hljs.highlightElement(codeRef.current);
        }
        setIsUserEdited(false);
        setError(null);
    };

    return (<>
        {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
                {error}
            </div>
        )}
        <div className="relative w-full overflow-hidden rounded-tl-xl rounded-md border bg-secondary-700 border-secondary-500 focus-within:border-primary transition-colors">

            <div className="absolute right-4 top-4 z-10 flex gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Files
                            className="rounded-full bg-secondary-500 text-base text-primary-text transition hover:bg-primary p-1.5 h-8 w-auto hover:cursor-pointer"
                            onClick={handleCopy}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{copied ? "Copied!" : "Copy"}</p>
                    </TooltipContent>
                </Tooltip>
                {isUserEdited && (
                    <>
                        <button
                            className="rounded-full bg-secondary-500 text-xs text-primary-text transition hover:bg-primary px-3 py-1.5 hover:cursor-pointer"
                            onClick={handleReset}
                        >
                            Reset
                        </button>
                        <button
                            className="rounded-full bg-primary text-xs text-primary-text transition hover:bg-primary-600 px-3 py-1.5 hover:cursor-pointer"
                            onClick={applyConfig}
                        >
                            Apply
                        </button>
                    </>
                )}
            </div>

            <div className="px-6 pb-14 pt-6">
                <pre ref={preRef}>
                    <code
                        ref={codeRef}
                        className="language-typescript styled-scroll focus:outline-none text-sm"
                        contentEditable
                        onInput={handleInput}
                        suppressContentEditableWarning
                    />
                </pre>
            </div>
        </div>
    </>
    );
}
