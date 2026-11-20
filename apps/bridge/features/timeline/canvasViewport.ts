export type CanvasViewport = { x: number; y: number; scale: number };
export type CanvasSize = { width: number; height: number };

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 2;

export function zoomAt(
    view: CanvasViewport,
    scale: number,
    point: { x: number; y: number },
): CanvasViewport {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const ratio = nextScale / view.scale;
    return {
        x: point.x - (point.x - view.x) * ratio,
        y: point.y - (point.y - view.y) * ratio,
        scale: nextScale,
    };
}

export function fitCanvas(
    viewport: CanvasSize,
    content: CanvasSize,
): CanvasViewport {
    const padding = 32;
    const scale = Math.max(
        MIN_SCALE,
        Math.min(
            1,
            (viewport.width - padding * 2) / content.width,
            (viewport.height - padding * 2) / content.height,
        ),
    );
    return {
        x: (viewport.width - content.width * scale) / 2,
        y: (viewport.height - content.height * scale) / 2,
        scale,
    };
}
