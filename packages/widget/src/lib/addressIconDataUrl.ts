import Jazzicon from "@/components/Common/AddressIcon/jazzicon.mjs";

/**
 * Renders the deterministic address jazzicon to an SVG data-URL. Jazzicon
 * builds a `<div style="background:base"><svg>…shapes…</svg></div>`, so the
 * base colour (on the wrapper div) is folded back in as a full-size rect.
 */
export function addressIconDataUrl(address: string, size: number): string {
    if (typeof document === "undefined") return "";
    const seed = parseInt(address.slice(2, 10), 16);
    const container = Jazzicon(size, seed);
    const inner = container.querySelector("svg");
    if (!inner) return "";

    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        `<rect width="${size}" height="${size}" fill="${container.style.background}"/>` +
        inner.innerHTML +
        `</svg>`;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
