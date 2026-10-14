import type { ThemeColor } from '@/Models/Theme';

type Rgb = [number, number, number];

function parseRgb(value: string): Rgb | undefined {
    const channels = value.split(',').map(Number);
    return channels.length === 3 && channels.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255)
        ? channels as Rgb : undefined;
}

function blend(foreground: Rgb, background: Rgb, opacity: number): Rgb {
    return foreground.map((channel, index) => channel * opacity + background[index] * (1 - opacity)) as Rgb;
}

function luminance(color: Rgb): number {
    const [red, green, blue] = color.map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrast(first: Rgb, second: Rgb): number {
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Preserve the current neutral colours wherever they already have sufficient
 * contrast. Resolve with the theme, outside the amount controls. */
export function resolveAmountPresetColors(secondary: ThemeColor, primary: ThemeColor) {
    const colors = {
        selectedBackground: secondary.text,
        selectedText: secondary[700],
        text: secondary.text,
        badgeText: secondary.text,
    };
    const muted = parseRgb(secondary.text), strong = parseRgb(primary.text);
    const surface = parseRgb(secondary[500]), raised = parseRgb(secondary[300]);
    const selectedText = parseRgb(secondary[700]);
    if (!muted || !strong || !surface || !raised || !selectedText) return colors;

    // Match the translucent backgrounds in MinMax and SummaryView.
    const track = blend(raised, surface, 0.35);
    const badge = blend(raised, surface, 0.6);
    if (contrast(muted, track) < 4.5 && contrast(strong, track) > contrast(muted, track))
        colors.text = primary.text;
    if (contrast(muted, badge) < 4.5 && contrast(strong, badge) > contrast(muted, badge))
        colors.badgeText = primary.text;

    // Only strengthen a weak selection, using the theme's own text colour.
    // Check the rounded RGB actually emitted to CSS, including against the track.
    for (let step = 0; step <= 20; step++) {
        const background = step === 0 ? muted : blend(strong, muted, step / 20).map(Math.round) as Rgb;
        if (contrast(background, selectedText) >= 4.5 && contrast(background, track) >= 3) {
            colors.selectedBackground = step === 0 ? secondary.text : background.join(', ');
            break;
        }
    }
    return colors;
}
