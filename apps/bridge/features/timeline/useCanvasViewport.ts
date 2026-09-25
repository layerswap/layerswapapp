import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type MouseEvent,
} from 'react';
import { fitCanvas, zoomAt, type CanvasViewport } from './canvasViewport';

export function useCanvasViewport() {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLOListElement>(null);
    const [view, setView] = useState<CanvasViewport>({
        x: 32,
        y: 32,
        scale: 0.5,
    });
    const [panning, setPanning] = useState(false);
    const [spacePressed, setSpacePressed] = useState(false);
    const autoFit = useRef(true);
    const drag = useRef<{
        id: number;
        x: number;
        y: number;
        scrollContainer?: HTMLElement;
    } | undefined>(undefined);
    const dragged = useRef(false);

    const fit = useCallback(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (
            !viewport ||
            !content ||
            !viewport.clientWidth ||
            !content.offsetHeight
        )
            return;
        autoFit.current = true;
        setView(
            fitCanvas(
                { width: viewport.clientWidth, height: viewport.clientHeight },
                { width: content.offsetWidth, height: content.offsetHeight },
            ),
        );
    }, []);

    const zoom = useCallback((scale: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        autoFit.current = false;
        setView((current) =>
            zoomAt(current, scale, {
                x: viewport.clientWidth / 2,
                y: viewport.clientHeight / 2,
            }),
        );
    }, []);

    const focusFrame = useCallback((frame: HTMLLIElement) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        autoFit.current = false;
        const fitted = fitCanvas(
            { width: viewport.clientWidth, height: viewport.clientHeight },
            { width: frame.offsetWidth, height: frame.offsetHeight },
        );
        setView({
            ...fitted,
            x: fitted.x - frame.offsetLeft * fitted.scale,
            y: fitted.y - frame.offsetTop * fitted.scale,
        });
    }, []);

    useEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        fit();
        const observer = new ResizeObserver(() => {
            if (autoFit.current) fit();
        });
        observer.observe(viewport);
        observer.observe(content);
        // A native non-passive listener keeps canvas gestures from scrolling or zooming the page.
        const onWheel = (event: WheelEvent) => {
            const scrollContainer =
                event.target instanceof Element
                    ? event.target.closest<HTMLElement>(
                          '[data-page2-preview] .styled-scroll',
                      )
                    : null;

            // Let overflowing modal previews scroll without moving the canvas.
            if (
                !event.ctrlKey &&
                !event.metaKey &&
                scrollContainer &&
                scrollContainer.scrollHeight > scrollContainer.clientHeight
            ) {
                return;
            }

            event.preventDefault();
            autoFit.current = false;
            const unit =
                event.deltaMode === 1
                    ? 16
                    : event.deltaMode === 2
                      ? viewport.clientHeight
                      : 1;
            const dx = event.deltaX * unit;
            const dy = event.deltaY * unit;
            if (event.ctrlKey || event.metaKey) {
                const bounds = viewport.getBoundingClientRect();
                setView((current) =>
                    zoomAt(current, current.scale * Math.exp(-dy * 0.01), {
                        x: event.clientX - bounds.left,
                        y: event.clientY - bounds.top,
                    }),
                );
            } else {
                setView((current) => ({
                    ...current,
                    x: current.x - (event.shiftKey ? dy : dx),
                    y: current.y - (event.shiftKey ? 0 : dy),
                }));
            }
        };
        viewport.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            observer.disconnect();
            viewport.removeEventListener('wheel', onWheel);
        };
    }, [fit]);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (drag.current || (event.button !== 0 && event.button !== 1)) return;
        dragged.current = false;
        const target = event.target as Element;
        const hand = spacePressed || event.button === 1;
        if (!hand && target.closest('button, a, input, select, textarea'))
            return;
        if (
            !hand &&
            event.pointerType !== 'touch' &&
            target.closest('[data-milestone-id]')
        )
            return;
        const body = !hand && event.pointerType === 'touch'
            ? target.closest<HTMLElement>('[data-page2-preview] .styled-scroll')
            : null;
        const scrollContainer = body && body.scrollHeight > body.clientHeight
            ? body
            : undefined;
        event.preventDefault();
        if (!scrollContainer) {
            event.currentTarget.focus({ preventScroll: true });
            autoFit.current = false;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            scrollContainer,
        };
        setPanning(!scrollContainer);
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const previous = drag.current;
        if (!previous || previous.id !== event.pointerId) return;
        const dx = event.clientX - previous.x;
        const dy = event.clientY - previous.y;
        if (dx || dy) dragged.current = true;
        drag.current = {
            ...previous,
            x: event.clientX,
            y: event.clientY,
        };
        if (previous.scrollContainer) {
            previous.scrollContainer.scrollTop -= dy / view.scale;
            return;
        }
        setView((current) => ({
            ...current,
            x: current.x + dx,
            y: current.y + dy,
        }));
    };
    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (drag.current?.id !== event.pointerId) return;
        drag.current = undefined;
        setPanning(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (
            event.target !== event.currentTarget ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
        )
            return;
        const step = event.shiftKey ? 120 : 40;
        const offsets: Record<string, [number, number]> = {
            ArrowLeft: [step, 0],
            ArrowRight: [-step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
        };
        if (event.code === 'Space') setSpacePressed(true);
        else if (event.key === '+' || event.key === '=') zoom(view.scale * 1.2);
        else if (event.key === '-') zoom(view.scale / 1.2);
        else if (event.key === '0') zoom(1);
        else if (event.key.toLowerCase() === 'f') fit();
        else if (offsets[event.key]) {
            autoFit.current = false;
            const [x, y] = offsets[event.key];
            setView((current) => ({
                ...current,
                x: current.x + x,
                y: current.y + y,
            }));
        } else return;
        event.preventDefault();
    };

    return {
        viewportRef,
        contentRef,
        view,
        fit,
        zoom,
        focusFrame,
        panning,
        spacePressed,
        handlers: {
            onPointerDownCapture: onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
            onLostPointerCapture: onPointerUp,
            onKeyDown,
            onKeyUp: (event: KeyboardEvent<HTMLDivElement>) => {
                if (event.code === 'Space') setSpacePressed(false);
            },
            onBlur: () => setSpacePressed(false),
            onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
                if (dragged.current && event.detail > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                dragged.current = false;
            },
        },
    };
}
