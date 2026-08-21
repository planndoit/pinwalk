"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 10;
const TAP_MOVE_PX = 8;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 28;
const DOUBLE_TAP_SCALE = 4;
const FOCUS_PADDING = 0.18;
const FOCUS_MIN_SCALE = 3.5;

type Transform = { scale: number; x: number; y: number };

export type ZoomableViewportHandle = {
  focusRect: (
    rect: { minX: number; minY: number; maxX: number; maxY: number },
    contentSize: { width: number; height: number }
  ) => void;
  reset: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampTransform(
  next: Transform,
  width: number,
  height: number
): Transform {
  const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
  if (scale <= 1) {
    return { scale: 1, x: 0, y: 0 };
  }
  return {
    scale,
    x: clamp(next.x, width * (1 - scale), 0),
    y: clamp(next.y, height * (1 - scale), 0),
  };
}

const ZoomableViewport = forwardRef<
  ZoomableViewportHandle,
  {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
  }
>(function ZoomableViewport({ children, className, style }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const animateRef = useRef(false);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [animate, setAnimate] = useState(false);

  const commit = useCallback((next: Transform, withAnimation = false) => {
    const viewport = viewportRef.current;
    const clamped = clampTransform(
      next,
      viewport?.clientWidth ?? 0,
      viewport?.clientHeight ?? 0
    );
    animateRef.current = withAnimation;
    setAnimate(withAnimation);
    transformRef.current = clamped;
    setTransform(clamped);
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number, withAnimation = false) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const current = transformRef.current;
      const contentX = (px - current.x) / current.scale;
      const contentY = (py - current.y) / current.scale;
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      commit(
        {
          scale,
          x: px - contentX * scale,
          y: py - contentY * scale,
        },
        withAnimation
      );
    },
    [commit]
  );

  useImperativeHandle(
    ref,
    () => ({
      focusRect(rect, contentSize) {
        const viewport = viewportRef.current;
        if (!viewport || contentSize.width <= 0 || contentSize.height <= 0) {
          return;
        }
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        if (vw <= 0 || vh <= 0) return;

        const spanX = Math.max(rect.maxX - rect.minX, contentSize.width * 0.01);
        const spanY = Math.max(rect.maxY - rect.minY, contentSize.height * 0.01);
        const fitted = Math.min(
          ((1 - FOCUS_PADDING * 2) * contentSize.width) / spanX,
          ((1 - FOCUS_PADDING * 2) * contentSize.height) / spanY
        );
        const scale = clamp(
          Math.max(fitted, FOCUS_MIN_SCALE),
          MIN_SCALE,
          MAX_SCALE
        );
        const centerX =
          (((rect.minX + rect.maxX) / 2) / contentSize.width) * vw;
        const centerY =
          (((rect.minY + rect.maxY) / 2) / contentSize.height) * vh;
        commit(
          {
            scale,
            x: vw / 2 - centerX * scale,
            y: vh / 2 - centerY * scale,
          },
          true
        );
      },
      reset() {
        commit({ scale: 1, x: 0, y: 0 }, true);
      },
    }),
    [commit]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.002);
      zoomAt(
        event.clientX,
        event.clientY,
        transformRef.current.scale * factor
      );
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const pinchDistance = () => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return 0;
    const first = points[0];
    const second = points[1];
    if (!first || !second) return 0;
    return Math.hypot(first.x - second.x, first.y - second.y);
  };

  const pinchCenter = () => {
    const points = [...pointersRef.current.values()];
    const first = points[0];
    const second = points[1];
    if (!first || !second) return { x: 0, y: 0 };
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    movedRef.current = false;
    if (pointersRef.current.size >= 2) {
      pinchDistanceRef.current = pinchDistance();
    } else {
      pinchDistanceRef.current = null;
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchDistanceRef.current) {
      const distance = pinchDistance();
      if (distance > 0) {
        const factor = distance / pinchDistanceRef.current;
        pinchDistanceRef.current = distance;
        const center = pinchCenter();
        zoomAt(center.x, center.y, transformRef.current.scale * factor);
        movedRef.current = true;
      }
      return;
    }

    if (transformRef.current.scale > 1) {
      if (Math.hypot(dx, dy) > TAP_MOVE_PX) movedRef.current = true;
      const current = transformRef.current;
      commit({
        scale: current.scale,
        x: current.x + dx,
        y: current.y + dy,
      });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchDistanceRef.current = null;
    }

    if (movedRef.current || pointersRef.current.size > 0) return;

    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (
      lastTap &&
      now - lastTap.t <= DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <=
        DOUBLE_TAP_PX
    ) {
      lastTapRef.current = null;
      suppressClickRef.current = true;
      if (transformRef.current.scale > 1.05) {
        commit({ scale: 1, x: 0, y: 0 }, true);
      } else {
        zoomAt(event.clientX, event.clientY, DOUBLE_TAP_SCALE, true);
      }
      return;
    }

    lastTapRef.current = {
      t: now,
      x: event.clientX,
      y: event.clientY,
    };
  };

  return (
    <div
      ref={viewportRef}
      className={`overflow-hidden touch-none overscroll-none ${className ?? ""}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (suppressClickRef.current || movedRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
    >
      <div
        className="h-full w-full"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          transition: animate ? "transform 0.35s ease-out" : undefined,
        }}
        onTransitionEnd={() => {
          if (animateRef.current) {
            animateRef.current = false;
            setAnimate(false);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default ZoomableViewport;
